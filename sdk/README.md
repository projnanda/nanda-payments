## NANDA Points SDK

Thin TypeScript client for integrating with the NANDA Points Combined Server (REST + MCP).

### Install (from monorepo)

```bash
cd sdk && npm i && npm run build
```

### Usage

```ts
import { NandaPointsRest, NandaMcpClient } from "@nanda/points-sdk";

const rest = new NandaPointsRest({ baseUrl: "http://localhost:3000" });
const mcp = new NandaMcpClient("http://localhost:3000");

const health = await rest.getHealth();
const bal = await rest.getBalance("alice");
const tx = await rest.initiateTransaction("alice", "bob", 10, "code review");
const receipt = await rest.getReceiptByTx(tx.txId);

// MCP tool call example
const paymentInfo = await mcp.callTool("getPaymentInfo");
```
