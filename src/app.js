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

const allowedOrigins = (process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map(item => item.trim())
    : [process.env.URL_FE || "http://localhost:5000"]
).flatMap(item => {
    if (!item.startsWith("http://") && !item.startsWith("https://")) {
        return [`http://${item}`, `https://${item}`];
    }
    return [item];
});

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        },
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
