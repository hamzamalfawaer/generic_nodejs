import express , { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import {env} from '../env';
import { Server } from 'node:net';

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(express.text());

app.get('/', (req: Request, res: Response) => {
    res.sendStatus(200);
});

async function main() {
    console.log('Starting Server...');
    console.log('APIURL: ', env('APIURL'));
    console.log('PORT: ', env('PORT'));

    await new Promise<Server>(resolve => {
        const srv = app.listen(env('PORT'), () => resolve(srv));
    });

    console.log(`Server Started at http://localhost:${env('PORT')}`);
}

main();
