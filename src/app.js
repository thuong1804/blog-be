// src/app.js
import express from 'express';
import cors from 'cors';
import apolloServer from './graphql/index.js';
import { expressMiddleware } from '@apollo/server/express4';

const app = express();

app.use(cors());
app.use(express.json());

await apolloServer.start();
app.use('/graphql', expressMiddleware(apolloServer));

export default app;
