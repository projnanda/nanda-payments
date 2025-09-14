import { Router } from "express";
import mongoose from "mongoose";
export const health = Router();
health.get("/health", async (_req, res) => {
    res.json({ status: "ok", mongo: mongoose.connection.readyState });
});
