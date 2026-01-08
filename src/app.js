// src/app.js
import express from "express";
import "dotenv/config";

import cors from "cors";
import apolloServer from "./graphql/index.js";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { expressMiddleware } from "@apollo/server/express4";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const app = express();

app.use(express.static("public"));

app.use(
    cors({
        origin: [process.env.URL_FE || "http://localhost:5000"],
        credentials: true,
    }),
);
app.use(express.json());

app.use((req, res, next) => {
    if (!req.body && process.env.NODE_ENV !== "production") {
        req.body = {};
    }
    next();
});

await apolloServer.start();

app.use(
    "/graphql",
    expressMiddleware(apolloServer, {
        context: async ({ req }) => {
            const token = req.headers.authorization || "";
            return { token };
        },
    }),
);

export default app;
