/* eslint-disable no-console */
import { Server } from 'http';
import { Socket } from 'net';
import { BehaviorSubject, delay, firstValueFrom, of, Subject, timer } from 'rxjs';

import { catchError, filter, finalize, take, tap, timeout } from 'rxjs/operators';
import prometheusClient from 'prom-client';

export interface SocketStatus {
  index: number;
  totalReqCount: number;
  totalResCount: number;
  activeReqCount: number;
  lastReq?: Date;
  lastRes?: Date;
}

export type K8sServer = Server & {
  serverStatus: boolean;
  activeSockets: Map<Socket, SocketStatus>;
  onClose$: Subject<void>;
};
export const k8sServer = (server: Server): K8sServer => {
  const socketOpenedTotal = new prometheusClient.Counter({
    name: 'bookingapi_socket_opened_count_total',
    help: 'Increases on new TCP socket connection.',
  });
  const socketClosedTotal = new prometheusClient.Counter({
    name: 'bookingapi_socket_closed_count_total',
    help: 'Increases on TCP socket disconnect',
  });
  const idleSocketsCount = new prometheusClient.Gauge({
    name: 'bookingapi_idle_socket_count',
    help: 'Total idle TCP sockets.',
  });
  const idleDurationUntilSocketClosed = new prometheusClient.Histogram({
    name: 'bookingapi_idle_duration_until_socket_closed',
    help: 'Time it took from last response to socket being closed. (seconds)',
    buckets: [0, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024],
  });
  const newServer = server as unknown as K8sServer;
  newServer.onClose$ = new Subject<void>();

  const lastServerStatusSent = new BehaviorSubject(false);
  newServer.on('request', (req, res) => {
    if (req.url === '/healtz') {
      // console.log('App     | Health Check:', newServer.serverStatus);
      res.writeHead(newServer.serverStatus ? 200 : 500);
      res.write('');
      res.end();
      lastServerStatusSent.next(newServer.serverStatus);
    }
  });
  const originalListen: typeof newServer.listen = newServer.listen.bind(newServer);
  newServer.listen = (...args) => {
    // console.log('Server  | Starting server, listening port:', args[0]);
    newServer.serverStatus = true;
    originalListen(...args);
    return newServer;
  };
  const activeSockets = new Map<Socket, SocketStatus>();
  (newServer as unknown as Server & { activeSockets: Map<Socket, SocketStatus> }).activeSockets = activeSockets;
  const originalClose: typeof newServer.close = newServer.close.bind(newServer);
  newServer.close = closeCallback => {
    if (!newServer.serverStatus) {
      if (closeCallback) {
        closeCallback();
      }
      return newServer;
    }
    // console.log('Server  | Server closing... Waiting for health checks.');
    lastServerStatusSent
      .pipe(
        tap(() => {
          console.log('Server | Server close command received. Waiting for next readiness probe.');
        }),
        filter(status => status === false),
        delay(500),
        take(3),
        timeout(30_000),
        catchError(() => of(null)),
        tap(() => {
          console.log('Server  | Server closing...');
        }),
        finalize(async () => {
          originalClose(async (err?: Error) => {
            if (closeCallback) {
              closeCallback(err);
            }
            await firstValueFrom(timer(0));
            if (err) {
              newServer.onClose$.error(err);
            } else {
              newServer.onClose$.next();
              newServer.onClose$.complete();
            }
          });
          console.log('Server  | Server closed to new requests.');
          console.log('Server  | Active sockets count:', activeSockets.size);
          while (activeSockets.size) {
            activeSockets.forEach((socketStatus, socket) => {
              if (socketStatus.activeReqCount === 0) {
                // console.log('Server  | Killing idle socket:', socketStatus.index);
                (socket as Socket).destroy(); // No need to delete from map, close event handler will do that
              }
            });
            await firstValueFrom(timer(100));
            console.log('Server  | Active sockets count:', activeSockets.size);
            await firstValueFrom(timer(1000));
          }
          console.log('Server  | No active sockets left.');
        })
      )
      .subscribe();
    newServer.serverStatus = false;
    return newServer;
  };
  newServer.keepAliveTimeout = 300_000;
  newServer.headersTimeout = newServer.keepAliveTimeout + 1_000;
  let socketIndex = 0;
  newServer.on('connection', socket => {
    socketOpenedTotal.inc();
    idleSocketsCount.inc();
    // console.log('Socket  | New Connection:', socketIndex);
    socket.setTimeout(newServer.keepAliveTimeout);
    activeSockets.set(socket, { index: socketIndex, totalReqCount: 0, totalResCount: 0, activeReqCount: 0 });
    socketIndex++;
    socket.once('close', () => {
      const socketStatus = activeSockets.get(socket);
      const idleSeconds = socketStatus?.lastRes
        ? Math.round((new Date().getTime() - socketStatus.lastRes?.getTime()) / 1000)
        : 0;

      socketClosedTotal.inc();
      idleSocketsCount.dec();
      idleDurationUntilSocketClosed.observe(idleSeconds);

      activeSockets.delete(socket);
    });
  });
  newServer.on('request', (req, res) => {
    idleSocketsCount.dec();
    const socket = activeSockets.get(req.socket);
    if (socket) {
      activeSockets.set(req.socket, {
        ...socket,
        totalReqCount: socket?.totalReqCount + 1,
        activeReqCount: socket?.activeReqCount + 1,
        lastReq: new Date(),
      });
      res.once('close', () => {
        idleSocketsCount.inc();
        // console.log('Request | Request closed on Socket:', socketStatus.index);
        const socketStatus = activeSockets.get(req.socket);
        if (!socketStatus) {
          return;
        }
        activeSockets.set(req.socket, {
          ...socketStatus,
          totalResCount: socketStatus.totalReqCount + 1,
          activeReqCount: socketStatus.activeReqCount - 1,
          lastRes: new Date(),
        });
      });
    }
  });
  process.on('SIGINT', () => newServer.close.bind(this)());
  process.on('SIGTERM', () => newServer.close.bind(this)());
  return newServer;
};
