import express, {Request, Response} from 'express';
import bodyParser from 'body-parser';
import {env} from '../env';

export const createServer = () => {
    const app = express();

    app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
    app.use(bodyParser.json({limit: '2mb'}));
    app.use(function (req, res, next) {
        try {
            const originURL = new URL(req.headers.origin ?? `https://${req.hostname}`);
            res.header('Access-Control-Allow-Origin', originURL.protocol + '//' + originURL.host);
            res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
            res.header('Access-Control-Max-Age', '600');
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header(
                'Access-Control-Allow-Headers',
                'DNT,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization'
            );
        } catch (e) {
        }
        next();
    });

    app.get(`/${env('LOADERIO_KEY')}.txt`, (req: Request, res: Response) => {
        if (env('LOADERIO_KEY') && req.url === `/${env('LOADERIO_KEY')}.txt`) {
            res.status(200).setHeader('Content-Type', 'text/plain').send(env('LOADERIO_KEY'));
            return;
        }
        res.send('failed');
    });

    app.get('/', (req, res): Promise<void> => {
        res.send(`ready`);
        return;
    });

    return app;
};
