// src/app.js
import express from "express";
import "dotenv/config";

import cors from "cors";
import apolloServer from "./graphql/index.js";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { expressMiddleware } from '@as-integrations/express5'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const app = express();
await apolloServer.start();

app.use(express.static("public"));

app.use(
    cors({
        origin: [process.env.URL_FE || "http://localhost:5000"],
        credentials: true,
    }),
);

app.use(express.urlencoded({ extended: true }));

app.use(
    "/graphql",
    express.json(),
    expressMiddleware(apolloServer)
);

export default app;
