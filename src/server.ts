import "dotenv/config";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import mongoose from "mongoose";
import { WebSocketServer } from "ws";
import apiRouter from "./api/index.js";
import { setBroadcaster } from "./lib/eventBus.js";

const PORT = parseInt(process.env.PORT || "3000", 10);
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/unified-system";

async function main() {
  // Connect to MongoDB
  await mongoose.connect(MONGO_URL);
  console.log("✅ [MongoDB] Connected to database");

  // Create Express app
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(morgan("combined"));

  // Mount API routes
  app.use("/api", apiRouter);

  // Root endpoint
  app.get("/", (req, res) => {
    res.json({
      name: "Unified AI Agent Marketplace",
      version: "1.0.0",
      description: "Combined NANDA Points and AI Agent Marketplace system",
      status: "running",
      timestamp: new Date().toISOString(),
      endpoints: {
        api: "/api",
        health: "/api/health",
        docs: "/api"
      }
    });
  });

  // Start HTTP server
  const server = app.listen(PORT, () => {
    console.log(`🚀 [HTTP] Server running on port ${PORT}`);
    console.log(`📚 [API] Documentation available at http://localhost:${PORT}/api`);
    console.log(`🏥 [Health] Health check at http://localhost:${PORT}/api/health`);
  });

  // WebSocket for real-time events
  const wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (ws) => {
    console.log("🔌 [WebSocket] New client connected");
    ws.send(JSON.stringify({ 
      type: "hello", 
      message: "Connected to Unified AI Agent Marketplace",
      timestamp: new Date().toISOString()
    }));

    ws.on("close", () => {
      console.log("🔌 [WebSocket] Client disconnected");
    });

    ws.on("error", (error) => {
      console.error("🔌 [WebSocket] Error:", error);
    });
  });

  // Set up event broadcaster
  setBroadcaster((payload) => {
    const message = JSON.stringify(payload);
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n🛑 [Shutdown] Graceful shutdown initiated...");
    
    // Close WebSocket server
    wss.close();
    
    // Close HTTP server
    server.close(async () => {
      console.log("✅ [Shutdown] HTTP server closed");
      
      // Close MongoDB connection
      await mongoose.disconnect();
      console.log("✅ [Shutdown] MongoDB disconnected");
      
      console.log("✅ [Shutdown] All services stopped");
      process.exit(0);
    });
  });

  console.log("\n🎉 [Startup] Unified AI Agent Marketplace is ready!");
  console.log("=" .repeat(50));
  console.log("�� Features:");
  console.log("  • Dual payment system (NP + ETH)");
  console.log("  • AI agent marketplace");
  console.log("  • Reputation tracking");
  console.log("  • Real-time WebSocket events");
  console.log("  • Radius blockchain integration");
  console.log("=" .repeat(50));
}

main().catch((err) => {
  console.error("❌ [Startup] Failed to start server:", err);
  process.exit(1);
});
