import "dotenv/config";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import mongoose from "mongoose";
import { WebSocketServer } from "ws";
import { mountApi } from "./api/index.js";
import { setBroadcaster } from "./lib/eventBus.js";

const PORT = parseInt(process.env.PORT || "3000", 10);
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";

async function main() {
  await mongoose.connect(MONGO_URL);
  console.log("[mongo] connected");

  // Initialize reputation service with default keys for development
  try {
    const { initializeReputationService, generateTestVerifierKeys } = await import('./services/reputationManager.js');
    const keys = generateTestVerifierKeys();
    initializeReputationService(keys.privateKey, keys.publicKey);
    console.log("[reputation] service initialized with generated keys");
  } catch (error) {
    console.warn("[reputation] failed to initialize service:", error.message);
  }

  // Initialize reputation service with default keys for development
  try {
    const { initializeReputationService, generateTestVerifierKeys } = await import('./services/reputationManager.js');
    const keys = generateTestVerifierKeys();
    initializeReputationService(keys.privateKey, keys.publicKey);
    console.log("[reputation] service initialized with generated keys");
  } catch (error) {
    console.warn("[reputation] failed to initialize service:", error.message);
  }

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  // mount modular API routers
  mountApi(app);

  const server = app.listen(PORT, () => {
    console.log(`[http] listening on :${PORT}`);
  });

  // WebSocket for events
  const wss = new WebSocketServer({ server, path: "/events" });
  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ type: "hello", ts: Date.now() }));
  });

  // set broadcaster used by services
  setBroadcaster((payload) => {
    const msg = JSON.stringify(payload);
    wss.clients.forEach((client: any) => {
      if (client.readyState === 1) client.send(msg);
    });
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
