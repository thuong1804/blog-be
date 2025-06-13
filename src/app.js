// src/app.js
import express from 'express';
import 'dotenv/config'

import cors from 'cors';
import apolloServer from './graphql/index.js';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { expressMiddleware } from '@apollo/server/express4';

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const app = express();

app.use(express.static('public'));

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  if (!req.body && process.env.NODE_ENV !== "production") {
    req.body = {};
  }
  next();
});

await apolloServer.start();

app.use('/graphql', expressMiddleware(apolloServer, {
  context: async ({ req, res }) => ({ req, res })
}));

export default app;
