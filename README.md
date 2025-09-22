# NANDA Points MCP Server (MongoDB)

Modular MCP server for NANDA Points using MongoDB with agent-based transactions and **Streamable HTTP Transport**. Features **x402-NP payment protocol** for tool access control.

## Tools

### Free Tools
-   `getBalance(agent_name)` - Get NP balance for an agent
-   `initiateTransaction(from, to, amount)` - Transfer NP between agents
-   `getReceipt(txId)` - Get receipt for a transaction ID
-   `getPaymentInfo()` - Get x402-NP payment requirements for paid tools
-   `setServiceCharge(agent_name, serviceChargePoints)` - Set service charge for an agent
-   `attachWallet(agent_name, seedPoints?)` - Attach a wallet to an agent (creates wallet if doesn't exist)

### Paid Tools (x402-NP)
-   `getTimestamp()` - Get current server timestamp (1 NP to system)

**Note:** Paid tools require payment in Nanda Points using the x402-NP protocol. See [x402-NP Documentation](docs/x402-np.md) for details.

## Architecture

The server uses a modular structure:

-   **Models** (`src/models/`) - TypeScript interfaces and centralized points schema
-   **Services** (`src/services/`) - Business logic and database operations
-   **Routes** (`src/routes/`) - API route handlers
-   **MCP Server** (`src/mcp/`) - MCP tool definitions and handlers

## Agent Structure

Agents follow the NANDA agent specification with additional fields:

-   `agent_name` - Unique identifier
-   `walletId` - Links to associated wallet
-   `serviceCharge` - NP points for service charges
-   Full agent metadata (provider, endpoints, capabilities, etc.)

## Setup

### 1. Install Dependencies

```bash
npm i
```

### 2. Seed Database

```bash
MONGODB_URI="mongodb://localhost:27017" NP_DB_NAME="nanda_points" npm run seed
```

This creates 11 sample agents with wallets and 1000 NP each.

### 3. Start Server

```bash
MONGODB_URI="mongodb://localhost:27017" NP_DB_NAME="nanda_points" npm run dev
# or for production
MONGODB_URI="mongodb://localhost:27017" NP_DB_NAME="nanda_points" npm start
```

The server will start on `http://localhost:3000` with the following endpoints:

-   **MCP Endpoint**: `http://localhost:3000/mcp` (POST/GET)
-   **Health Check**: `http://localhost:3000/health` (GET)

**Environment Variables:**

-   `MONGODB_URI`: MongoDB connection string (default: "mongodb://localhost:27017")
-   `NP_DB_NAME`: Database name for NANDA Points (default: "nanda_points")
-   `PORT`: HTTP server port (default: 3000)
-   `HOST`: HTTP server host (default: localhost)

### 4. Test the Server

Run the included test client to verify functionality:

```bash
npm run test
```

Custom test options:

```bash
# Test with different agents and amount
npm run test -- --from claude-desktop --to search-agent --amount 100

# Test against different server
npm run test -- --server http://localhost:3001/mcp

# Skip specific tests
npm run test -- --no-transaction --no-receipt
```

## Proxy HTTP with ngrok

To make your local MCP server accessible from the internet (required for Claude Web), use ngrok:

### 1. Start ngrok tunnel

After your MCP server is running on `http://localhost:3000`, open a new terminal and run:

```bash
ngrok http 3000
```

This will output something like:

```
Forwarding  https://abc123def456.ngrok-free.app -> http://localhost:3000
```

### 2. Verify ngrok is working

Test the public endpoints:

```bash
# Check tunnel status
curl http://localhost:4040/api/tunnels

# Test public health endpoint
curl https://your-ngrok-url.ngrok-free.app/health
```

### 3. Get your public MCP endpoint

Your MCP server will be available at:

-   **Public MCP Endpoint**: `https://your-ngrok-url.ngrok-free.app/mcp`
-   **Public Health Check**: `https://your-ngrok-url.ngrok-free.app/health`

**Note**: ngrok URLs change each time you restart ngrok unless you have a paid account with reserved domains.

## Testing with Claude Web

### 1. Configure MCP Connector in Claude Web

1. Open Claude Web (claude.ai)
2. Go to your workspace settings
3. Navigate to "Connectors" or "MCP Servers"
4. Add a new connector with:
    - **Name**: `NANDA Points`
    - **Type**: `Streamable HTTP`
    - **URL**: `https://your-ngrok-url.ngrok-free.app/mcp`
    - **Description**: `NANDA Points management system for agent transactions`

### 2. Example Prompts for Testing Tools

Once connected, you can test each tool with these example prompts:

#### **getBalance Tool**

```
Check the NP balance for the claude-desktop agent
```

```
What's the current balance for search-agent?
```

```
Show me the balance for all agents: claude-desktop, search-agent, and summarize-agent
```

#### **initiateTransaction Tool**

```
Transfer 100 NP from claude-desktop to search-agent
```

```
Send 50 NANDA Points from search-agent to summarize-agent and show me the receipt
```

```
Make a payment of 25 NP from claude-desktop to ocr-agent
```

#### **getReceipt Tool**

```
Get the receipt for transaction ID: [paste-transaction-id-here]
```

```
Show me the details of the last transaction receipt
```

#### **getTimestamp Tool**
```
What is the current server timestamp?
```
```
Get the current time from the server
```

#### **setServiceCharge Tool**

```
Set the service charge for search-agent to 10 NP
```

```
Update the service charge for summarize-agent to 25 NANDA Points
```

```
Set ocr-agent's service charge to 5 NP
```

#### **attachWallet Tool**

```
Attach a wallet to the new-agent (will create wallet if it doesn't exist)
```

```
Attach a wallet to claude-desktop with 2000 NP initial balance
```

```
Create and attach a wallet to my-custom-agent
```

#### **Complex Multi-Tool Operations**

```
1. Check the balance for claude-desktop
2. Transfer 75 NP from claude-desktop to vector-agent
3. Set vector-agent's service charge to 15 NP
4. Show me the final balances for both agents
```

```
I want to see a complete transaction flow:
1. Check initial balances for claude-desktop and web-agent
2. Transfer 200 NP from claude-desktop to web-agent
3. Get the transaction receipt
4. Check final balances
5. Set web-agent's service charge to 20 NP
```

### 3. Expected Responses

Each tool returns JSON responses with the following structure:

**getBalance**: Returns agent balance information

```json
{
    "agent_name": "claude-desktop",
    "currency": "NP",
    "scale": 0,
    "balanceMinor": 1000,
    "balancePoints": 1000
}
```

**initiateTransaction**: Returns transaction details with receipt

```json
{
  "txId": "uuid-transaction-id",
  "status": "completed",
  "amountPoints": 100,
  "from": "claude-desktop",
  "to": "search-agent",
  "receipt": { ... }
}
```

**getReceipt**: Returns receipt details

```json
{
    "txId": "uuid-transaction-id",
    "fromAgent": "claude-desktop",
    "toAgent": "search-agent",
    "amountMinor": 100,
    "fromBalanceAfter": 900,
    "toBalanceAfter": 1100
}
```

**setServiceCharge**: Returns updated service charge

```json
{
    "agent_name": "search-agent",
    "serviceCharge": 10
}
```

**attachWallet**: Returns wallet attachment confirmation

```json
{
    "agent_name": "new-agent",
    "walletId": "uuid-wallet-id",
    "balanceMinor": 1000,
    "balancePoints": 1000,
    "message": "Wallet successfully attached to agent"
}
```

### 4. Troubleshooting Claude Web Connection

If Claude Web can't connect to your MCP server:

1. **Check ngrok tunnel**: Ensure ngrok is running and the URL is correct
2. **Test health endpoint**: Verify `https://your-ngrok-url.ngrok-free.app/health` returns server info
3. **Check server logs**: Look for connection attempts in your server console
4. **Verify MCP endpoint**: Ensure the URL ends with `/mcp`
5. **Check firewall**: Make sure your local server is accessible

## Testing with Cursor IDE

### 1. Configure MCP Server in Cursor

Cursor supports MCP servers through project-specific configuration. Create a `.cursor/mcp.json` file in your project root:

```json
{
  "mcpServers": {
    "nanda-points": {
      "url": "https://your-ngrok-url.ngrok-free.app/mcp"
    }
  }
}
```

**Alternative Configuration Methods:**
- **Global Settings**: Open Cursor → Cmd/Ctrl + Shift + P → "Cursor Settings" → "MCP" section
- **Project-specific**: Place `.cursor/mcp.json` in your project root (recommended for this repo)

### 2. Restart Cursor and Verify Connection

1. **Restart Cursor** after adding the configuration
2. **Check MCP Status**: Look for MCP server status in Cursor's status bar or settings
3. **Verify Tools**: The NANDA Points tools should appear in Cursor's available tools

### 3. Example Prompts for Testing Tools in Cursor

Once connected, test each tool with these prompts in Cursor's chat:

#### **getBalance Tool**
```
@nanda-points Check the NP balance for the claude-desktop agent
```
```
@nanda-points What's the current balance for search-agent?
```
```
@nanda-points Show me balances for claude-desktop, search-agent, and summarize-agent
```

#### **initiateTransaction Tool**
```
@nanda-points Transfer 100 NP from claude-desktop to search-agent
```
```
@nanda-points Send 50 NANDA Points from search-agent to summarize-agent and show the receipt
```
```
@nanda-points Make a payment of 25 NP from claude-desktop to ocr-agent
```

#### **getReceipt Tool**
```
@nanda-points Get the receipt for transaction ID: [paste-transaction-id-here]
```
```
@nanda-points Show me the details of the last transaction receipt
```

#### **getTimestamp Tool**
```
@nanda-points What is the current server timestamp?
```
```
@nanda-points Get the current time from the server
```

#### **setServiceCharge Tool**
```
@nanda-points Set the service charge for search-agent to 10 NP
```
```
@nanda-points Update the service charge for summarize-agent to 25 NANDA Points
```

#### **Complex Multi-Tool Operations**
```
@nanda-points Complete transaction workflow:
1. Check balance for claude-desktop
2. Transfer 75 NP from claude-desktop to vector-agent
3. Set vector-agent's service charge to 15 NP
4. Show final balances for both agents
```

### 4. Troubleshooting Cursor Connection

If Cursor can't connect to your MCP server:

1. **Check .cursor/mcp.json syntax**: Ensure valid JSON format
2. **Verify ngrok URL**: Test `https://your-ngrok-url.ngrok-free.app/health` returns server info
3. **Restart Cursor**: MCP configuration changes require restart
4. **Check Cursor logs**: Look for MCP connection errors in Cursor's developer console
5. **Test direct connection**: Use the test client to verify server is responding
6. **Verify project root**: Ensure `.cursor/mcp.json` is in the correct directory

### 5. Cursor vs Claude Web Differences

- **Tool Invocation**: Use `@nanda-points` prefix in Cursor vs direct prompts in Claude Web
- **Session Management**: Cursor maintains persistent MCP connections vs Claude Web's per-session connections
- **Configuration**: Cursor uses project files vs Claude Web's workspace settings
- **Tool Limitations**: Cursor supports up to 40 tools simultaneously

## Usage

### Example Agent Names

-   `claude-desktop` - Payer agent
-   `search-agent` - Search capability agent
-   `summarize-agent` - Summarization agent
-   `extract-agent` - Extraction agent
-   `classify-agent` - Classification agent
-   `translate-agent` - Translation agent
-   `vector-agent` - Vector store agent
-   `ocr-agent` - OCR agent
-   `web-agent` - Web browse agent
-   `sql-agent` - SQL runner agent
-   `image-caption-agent` - Image caption agent

### Error Handling

-   `AGENT_NOT_FOUND` - Agent doesn't exist
-   `SENDER_AGENT_NOT_FOUND` - Sender agent doesn't exist
-   `RECEIVER_AGENT_NOT_FOUND` - Receiver agent doesn't exist
-   `INSUFFICIENT_FUNDS` - Not enough NP for transaction

## Client Integration

### MCP Streamable HTTP Transport

This server uses the **Streamable HTTP transport** (MCP specification 2025-03-26) instead of stdio. Clients can connect to:

**Base URL**: `http://localhost:3000/mcp`

**Session Management**: The server automatically assigns session IDs and supports:

-   HTTP POST for client-to-server messages
-   HTTP GET for Server-Sent Events (SSE) streaming
-   Session resumability and redelivery

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
    "mcpServers": {
        "nanda-points": {
            "type": "streamable-http",
            "url": "http://localhost:3000/mcp"
        }
    }
}
```

**Note**: Ensure the server is running before starting Claude Desktop.

### Legacy stdio Support

For backward compatibility with older MCP clients, you can still run via stdio by modifying the server code to use `StdioServerTransport` instead of `StreamableHTTPServerTransport`.

## Development

### Project Structure

```
src/
├── models/ # TypeScript interfaces
│ ├── points.ts # Centralized Points class and MinorUnits type
│ ├── agent.ts # Agent facts and metadata
│ ├── wallet.ts # Wallet interface
│ ├── transaction.ts # Transaction interface
│ ├── receipt.ts # Receipt interface
│ └── index.ts # Re-exports
├── services/ # Business logic
│ ├── database.ts # MongoDB connection
│ ├── agentService.ts # Agent operations
│ ├── walletService.ts # Wallet operations
│ ├── transactionService.ts # Transaction logic
│ ├── receiptService.ts # Receipt operations
│ └── index.ts # Re-exports
├── routes/ # API handlers
│ ├── agentRoutes.ts # Agent route handlers
│ ├── walletRoutes.ts # Wallet route handlers
│ ├── transactionRoutes.ts # Transaction handlers
│ ├── receiptRoutes.ts # Receipt handlers
│ └── index.ts # Re-exports
├── mcp/ # MCP server
│ └── server.ts # MCP tool definitions
└── utils/ # Utilities
└── mongo.ts # MongoDB connection utilities


```

````

### Build & Test

```bash

npm run build              # Compile TypeScript
npm start                  # Start MCP server
npm run seed              # Seed database with sample data
npm run test              # Test basic MCP functionality
npm run test:x402-full    # Test x402-NP payment protocol
```

## x402-NP Payment Protocol

This server implements the x402 payment protocol adapted for Nanda Points (x402-NP), enabling programmatic payments for tool access without cryptocurrency.

### Quick Start

1. **Call a paid tool** without payment → receive payment instructions
2. **Use `initiateTransaction`** to pay the required amount to the recipient
3. **Retry the tool** with payment arguments:
   - `_paymentAgent`: Your agent name
   - `_paymentTxId`: Transaction ID from step 2
   - `_paymentAmount`: Amount paid

### Testing the x402-NP Implementation

Run comprehensive tests to verify the payment system:

```bash
# Test basic MCP functionality
npm run test

# Test x402-NP payment protocol with full logging
npm run test:x402-full

# Run updated test with current tool configuration
npx tsx run-updated-test.ts
```

### Sample Test Prompts

#### Using MCP Client (Recommended)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });
const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3000/mcp"));
await client.connect(transport);

// 1. List available tools
const tools = await client.listTools();

// 2. Test free tool (if available)
const paymentInfo = await client.callTool({
  name: "getPaymentInfo",
  arguments: {}
});

// 3. Test free tool (getBalance is now free)
const balanceResult = await client.callTool({
  name: "getBalance",
  arguments: { agent_name: "claude-desktop" }
});

// 4. Test paid tool without payment (should require payment)
const timestampResult = await client.callTool({
  name: "getTimestamp",
  arguments: {}
});

// 5. Make payment for paid tool
const payment = await client.callTool({
  name: "initiateTransaction",
  arguments: { from: "claude-desktop", to: "system", amount: 1 }
});

// 6. Retry paid tool with payment proof
const paidTimestamp = await client.callTool({
  name: "getTimestamp",
  arguments: {
    _paymentAgent: "claude-desktop",
    _paymentTxId: "transaction-id-from-step-5",
    _paymentAmount: "1"
  }
});
```

#### Using Raw HTTP (Advanced)

```bash
# Health Check
curl -X GET http://localhost:3000/health

# Note: Direct HTTP calls to /mcp require proper session management
# Use the MCP client for reliable testing
```

### Current Status

**✅ Implementation Status:** The x402-NP payment system is **fully operational**.

**Test Results Summary:**
- ✅ MCP server running with Streamable HTTP transport
- ✅ Free tools (getBalance, initiateTransaction, getReceipt) working correctly
- ✅ Paid tools (getTimestamp) enforcing payment requirements
- ✅ `getPaymentInfo` tool registered and working
- ✅ Payment wrapper correctly applied to paid tools
- ✅ Full payment flow working end-to-end

### Complete Test Log

See `test.log` for detailed interaction logs including:
- MCP requests/responses
- Payment flow verification
- Tool arguments and results
- Transaction receipts and balances

For complete documentation see: [docs/x402-np.md](docs/x402-np.md)