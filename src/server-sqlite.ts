import "dotenv/config";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import Database from "better-sqlite3";
import { WebSocketServer } from "ws";

const PORT = parseInt(process.env.PORT || "3000", 10);

// Initialize SQLite database
const db = new Database("unified-system.db");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    did TEXT UNIQUE NOT NULL,
    ethereumAddress TEXT,
    agentName TEXT NOT NULL,
    company TEXT,
    reputationScore REAL DEFAULT 0,
    specialty TEXT,
    status TEXT DEFAULT 'active',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    walletId TEXT UNIQUE NOT NULL,
    ethereumAddress TEXT,
    npBalance REAL DEFAULT 0,
    ethBalance REAL DEFAULT 0,
    ownerDid TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transactionId TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    amount REAL,
    ethAmount REAL,
    fromWallet TEXT,
    toWallet TEXT,
    agentDid TEXT,
    clientWallet TEXT,
    taskDescription TEXT,
    rating INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Insert initial data
const insertAgent = db.prepare(`
  INSERT OR IGNORE INTO agents (did, agentName, company, reputationScore, specialty)
  VALUES (?, ?, ?, ?, ?)
`);

const agents = [
  ["did:nanda:nanda-store", "NANDA Store", "NANDA", 95, "Research"],
  ["did:nanda:google-agentspace", "Google Agentspace", "Google", 92, "Research"],
  ["did:nanda:ibm-agent-connect", "IBM Agent Connect", "IBM", 91, "Analysis"],
  ["did:nanda:berkeley-marketplace", "Berkeley Marketplace", "Berkeley", 89, "Analysis"],
  ["did:nanda:swarmzero", "SwarmZero", "SwarmZero", 88, "Research"],
  ["did:nanda:salesforce-agentexchange", "Salesforce AgentExchange", "Salesforce", 87, "Writing"],
  ["did:nanda:aws-ai-agents", "AWS AI Agents", "AWS", 85, "Research"],
  ["did:nanda:metaschool", "Metaschool", "Metaschool", 84, "Writing"]
];

agents.forEach(agent => insertAgent.run(agent));

// Insert client wallet
const insertWallet = db.prepare(`
  INSERT OR IGNORE INTO wallets (walletId, ethereumAddress, ethBalance, ownerDid)
  VALUES (?, ?, ?, ?)
`);

insertWallet.run("client-wallet-1", "0x30F1FF848c916B33d89f4C377796919FC90B8ce2", 1.0, "did:client:main");

async function main() {
  console.log("✅ [SQLite] Database initialized");

  // Create Express app
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(morgan("combined"));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      database: "sqlite",
      timestamp: new Date().toISOString(),
      agents: db.prepare("SELECT COUNT(*) as count FROM agents").get().count,
      wallets: db.prepare("SELECT COUNT(*) as count FROM wallets").get().count
    });
  });

  // Get all agents
  app.get("/api/agents", (req, res) => {
    const agents = db.prepare("SELECT * FROM agents ORDER BY reputationScore DESC").all();
    res.json(agents);
  });

  // Get wallet by address
  app.get("/api/wallets/:address", (req, res) => {
    const wallet = db.prepare("SELECT * FROM wallets WHERE ethereumAddress = ?").get(req.params.address);
    if (wallet) {
      res.json(wallet);
    } else {
      res.status(404).json({ error: "Wallet not found" });
    }
  });

  // Create transaction (hire agent)
  app.post("/api/transactions/create", (req, res) => {
    const { type, clientWallet, agentDid, ethAmount, taskDescription } = req.body;
    
    if (type === "hire_agent") {
      const agent = db.prepare("SELECT * FROM agents WHERE did = ?").get(agentDid);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }

      const clientWalletData = db.prepare("SELECT * FROM wallets WHERE ethereumAddress = ?").get(clientWallet);
      if (!clientWalletData) {
        return res.status(404).json({ error: "Client wallet not found" });
      }

      // Create transaction
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const insertTransaction = db.prepare(`
        INSERT INTO transactions (transactionId, type, status, ethAmount, clientWallet, agentDid, taskDescription)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      insertTransaction.run(transactionId, type, "completed", ethAmount, clientWallet, agentDid, taskDescription);

      // Update client ETH balance
      const updateClientBalance = db.prepare(`
        UPDATE wallets SET ethBalance = ethBalance - ? WHERE ethereumAddress = ?
      `);
      updateClientBalance.run(ethAmount, clientWallet);

      // Add NP points to agent (simulate)
      const npEarned = Math.floor(ethAmount * 1000000) + Math.floor(agent.reputationScore * 10);
      
      res.json({
        success: true,
        transactionId,
        message: "Agent hired successfully",
        details: {
          agent: agent.agentName,
          ethPaid: ethAmount,
          npEarned: npEarned,
          clientBalance: clientWalletData.ethBalance - ethAmount
        }
      });
    } else {
      res.status(400).json({ error: "Invalid transaction type" });
    }
  });

  // Rate agent performance
  app.post("/api/reputation/rate", (req, res) => {
    const { agentDid, rating, clientWallet } = req.body;
    
    const agent = db.prepare("SELECT * FROM agents WHERE did = ?").get(agentDid);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    // Update reputation (simple algorithm: 60% new rating + 40% current)
    const newReputation = (rating * 0.6) + (agent.reputationScore * 0.4);
    const updateReputation = db.prepare(`
      UPDATE agents SET reputationScore = ? WHERE did = ?
    `);
    updateReputation.run(newReputation, agentDid);

    res.json({
      success: true,
      message: "Reputation updated",
      details: {
        agent: agent.agentName,
        oldReputation: agent.reputationScore,
        newReputation: Math.round(newReputation * 100) / 100,
        rating: rating
      }
    });
  });

  // Root endpoint
  app.get("/", (req, res) => {
    res.json({
      name: "Unified AI Agent Marketplace",
      version: "1.0.0",
      description: "Combined NANDA Points and AI Agent Marketplace system",
      status: "running",
      database: "sqlite",
      timestamp: new Date().toISOString(),
      endpoints: {
        health: "/api/health",
        agents: "/api/agents",
        wallets: "/api/wallets/:address",
        transactions: "/api/transactions/create",
        reputation: "/api/reputation/rate"
      }
    });
  });

  // Start HTTP server
  const server = app.listen(PORT, () => {
    console.log(`🚀 [HTTP] Server running on port ${PORT}`);
    console.log(`📚 [API] Documentation available at http://localhost:${PORT}/`);
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

  console.log("\n🎉 [Startup] Unified AI Agent Marketplace is ready!");
  console.log("=" .repeat(50));
  console.log("🌟 Features:");
  console.log("  • Dual payment system (NP + ETH)");
  console.log("  • AI agent marketplace");
  console.log("  • Reputation tracking");
  console.log("  • Real-time WebSocket events");
  console.log("  • SQLite database (no installation needed)");
  console.log("=" .repeat(50));
}

main().catch((err) => {
  console.error("❌ [Startup] Failed to start server:", err);
  process.exit(1);
});
