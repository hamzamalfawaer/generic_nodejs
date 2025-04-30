import { createServer } from './create-server';
import { k8sServer } from './k8s-server';

k8sServer(createServer().listen(8000, () => console.log('Main Server Started at port 8000')));

process.on('unhandledRejection', err => {
    console.error('Unhandled Rejection', err);
});
process.on('uncaughtException', err => {
    console.error('Uncaught Exception', err);
});
