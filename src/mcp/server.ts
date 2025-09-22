import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { NP } from "../models/index.js";
import { initMongo } from "../services/index.js";
import { getAgentWithWallet, getAgent, setAgentServiceCharge } from "../routes/agentRoutes.js";
import { attachWallet } from "../routes/walletRoutes.js";
import { getBalanceMinor } from "../routes/walletRoutes.js";
import { transfer } from "../routes/transactionRoutes.js";
import { getReceiptByTx } from "../routes/receiptRoutes.js";
import { withPayment, NPToolConfig } from "../middleware/x402-mcp.js";


// Environment configuration
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || 'localhost';

// Initialize MongoDB connection
await initMongo();

console.log("🚨 DEBUG: Server starting with PAYMENT SYSTEM - v2.3 (getTimestamp PAID, getBalance/getReceipt FREE)");

// Create Express app
const app = express();
app.use(express.json());

// Configure paid tools for x402-NP payment system
const paidToolsConfig: { [toolName: string]: NPToolConfig } = {
  "getTimestamp": {
    priceNP: 1,
    recipient: "system", // System agent receives payments
    description: "Get current server timestamp"
  }
};

// Map to store transports by session ID for stateful connections
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Create MCP server instance
const server = new McpServer({ name: "nanda-points", version: "0.2.0" });

server.registerTool(
  "getBalance",
  {
    title: "Get Balance (NP)",
    description: "Returns NP balance for an agent. Returns error if agent does not exist. This tool is free to use.",
    inputSchema: {
      agent_name: z.string().min(1)
    }
  },
  async (args) => {
    const agent_name = args.agent_name as string;

    const agentWithWallet = await getAgentWithWallet(agent_name);
    if (!agentWithWallet) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "AGENT_NOT_FOUND", agent_name }, null, 2) }] };
    }

    const balMinor = await getBalanceMinor(agent_name);
    const payload = { agent_name, currency: NP.code, scale: NP.scale, balanceMinor: balMinor, balancePoints: NP.toMajorUnits(balMinor) };
    return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
  }
);

server.registerTool(
  "initiateTransaction",
  {
    title: "Initiate Transaction (NP)",

    description: "Transfer NP from one agent to another and record ledger + receipt. Returns error if either agent does not exist. This tool is free to use.",
    inputSchema: { 
      from: z.string().min(1), 
      to: z.string().min(1), 
      amount: z.number().int().positive(),
      task: z.string().min(1).describe("Task that the transaction was completed for")
    }
  },
  async ({ from, to, amount, task }) => {
    const fromAgent = await getAgentWithWallet(from);
    const toAgent = await getAgentWithWallet(to);

    if (!fromAgent) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "SENDER_AGENT_NOT_FOUND", agent_name: from }, null, 2) }] };
    }
    if (!toAgent) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "RECEIVER_AGENT_NOT_FOUND", agent_name: to }, null, 2) }] };
    }

    try {

      const { tx, receipt, payload } = await transfer(from, to, NP.toMinorUnits(amount), task);
      const result = { 
        txId: tx.txId, 
        status: tx.status, 
        amountPoints: amount, 
        currency: tx.currency, 
        scale: tx.scale, 
        from: tx.fromAgent, 
        to: tx.toAgent, 
        createdAt: tx.createdAt, 
        receipt,
        payload // Receipt sent immediately to payer
      };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err: any) {
      return { content: [{ type: "text", text: JSON.stringify({ error: String(err?.message || err) }, null, 2) }] };
    }
  }
);

server.registerTool(
  "getReceipt",
  {
    title: "Get Receipt",
    description: "Return receipt for a transaction id. This tool is free to use.",
    inputSchema: {
      txId: z.string().min(1)
    }
  },
  async (args) => {
    const txId = args.txId as string;
    const r = await getReceiptByTx(txId);
    return { content: [{ type: "text", text: JSON.stringify(r ?? { error: "NOT_FOUND" }, null, 2) }] };
  }
);

server.registerTool(
  "getTimestamp",
  {
    title: "Get Server Timestamp",
    description: "Returns current server timestamp. Requires payment: 1 NP to system.",
    inputSchema: {
      _paymentAgent: z.string().optional(),
      _paymentTxId: z.string().optional(),
      _paymentAmount: z.string().optional()
    }
  },
  withPayment("getTimestamp", paidToolsConfig.getTimestamp, async () => {
    const timestamp = new Date().toISOString();
    const unixTimestamp = Math.floor(Date.now() / 1000);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          timestamp,
          unixTimestamp,
          serverTime: timestamp,
          timezone: "UTC"
        }, null, 2)
      }]
    };
  })
);

server.registerTool(
  "setServiceCharge",
  { title: "Set Service Charge (NP)", description: "Set per-call service charge (points) on agent facts. Returns error if agent does not exist.", inputSchema: { agent_name: z.string().min(1), serviceChargePoints: z.number().int().nonnegative() } },
  async (args) => {
    const agent_name = args.agent_name as string;
    const serviceChargePoints = args.serviceChargePoints as number;
    const agent = await getAgent(agent_name);
    if (!agent) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "AGENT_NOT_FOUND", agent_name }, null, 2) }] };
    }
    await setAgentServiceCharge(agent_name, serviceChargePoints);
    const updated = await getAgent(agent_name);
    return { content: [{ type: "text", text: JSON.stringify({ agent_name, serviceCharge: updated?.serviceCharge }, null, 2) }] };
  }
);

server.registerTool(
  "getPaymentInfo",
  {
    title: "Get Payment Information",
    description: "Get x402-NP payment requirements for all paid tools. This tool is free to use.",
    inputSchema: {}
  },
  async () => {
    const paymentInfo = {
      protocol: "x402-np",
      currency: NP.code,
      scale: NP.scale,
      tools: paidToolsConfig,
      instructions: {
        steps: [
          "To use a paid tool, first call it normally to get a 402 Payment Required response",
          "Use the initiateTransaction tool to pay the required amount to the specified recipient",
          "Include the transaction ID in the X-PAYMENT-TX-ID header",
          "Include your agent name in the X-PAYMENT-AGENT header",
          "Include the payment amount in the X-PAYMENT-AMOUNT header",
          "Retry the original tool call with these headers"
        ]
      }
    };
    return { content: [{ type: "text", text: JSON.stringify(paymentInfo, null, 2) }] };
  }
);

 server.registerTool(
  "attachWallet",
  { 
    title: "Attach Wallet to Agent", 
    description: "Attach a wallet to an agent. If the agent doesn't have a wallet, creates a new one and attaches it. If agent already has a wallet, returns the existing wallet. Returns error if agent does not exist.", 
    inputSchema: { 
      agent_name: z.string().min(1), 
      seedPoints: z.number().int().nonnegative().optional().describe("Initial points to seed the wallet with (default: 1000)")
    } 
  },
  async ({ agent_name, seedPoints }) => {
    const result = await attachWallet(agent_name, seedPoints);
    if (!result) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "AGENT_NOT_FOUND", agent_name }, null, 2) }] };
    }
    return { content: [{ type: "text", text: JSON.stringify({ 
      agent_name, 
      walletId: result.wallet.walletId,
      balanceMinor: result.wallet.balanceMinor,
      balancePoints: NP.toMajorUnits(result.wallet.balanceMinor),
      message: "Wallet successfully attached to agent"
    }, null, 2) }] };

  }
);

// MCP POST endpoint handler
const mcpPostHandler = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (sessionId) {
    console.log(`Received MCP request for session: ${sessionId}`);
  } else {
    console.log('New MCP request:', req.body);
  }

  try {
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId: string) => {
          // Store the transport by session ID when session is initialized
          console.log(`Session initialized with ID: ${sessionId}`);
          transports[sessionId] = transport;
        }
      });

      // Set up onclose handler to clean up transport when closed
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          console.log(`Transport closed for session ${sid}, removing from transports map`);
          delete transports[sid];
        }
      };

      // Connect the transport to the MCP server BEFORE handling the request
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return; // Already handled
    } else {
      // Invalid request - no session ID or not initialization request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      });
      return;
    }

    // Handle the request with existing transport
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
};

// Handle GET requests for SSE streams
const mcpGetHandler = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  console.log(`Establishing SSE stream for session ${sessionId}`);
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

// Set up MCP routes
app.post('/mcp', mcpPostHandler);
app.get('/mcp', mcpGetHandler);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', server: 'nanda-points-mcp', version: '0.2.0' });
});

// Start the HTTP server
app.listen(PORT, HOST, () => {
  console.log(`🚀 NANDA Points MCP Server running at http://${HOST}:${PORT}`);
  console.log(`📡 MCP endpoint: http://${HOST}:${PORT}/mcp`);
  console.log(`💊 Health check: http://${HOST}:${PORT}/health`);
});
