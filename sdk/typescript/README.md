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

### Auto-pay for paid tools (x402-NP)

If a tool is wrapped server-side with `withPayment`, you can auto-pay and retry:

```ts
const result = await mcp.callPaidToolWithAutoPay("alice", "getTimestamp");
```

### Agent Paywall (Express)

Protect agent routes with an NP paywall. Clients must pay, then retry with headers.

```ts
import express from "express";
import { x402NpExpress } from "@nanda/points-sdk";

const app = express();

app.use(
    "/premium",
    x402NpExpress(
        { priceNP: 1, recipient: "system", description: "Premium endpoint" },
        { nandaBaseUrl: "http://localhost:3000" }
    )
);

app.get("/premium/data", (_req, res) => {
    res.json({ secret: 42 });
});
```

Client retry flow:

-   Call paywalled route → 402 JSON `{ error: "PAYMENT_REQUIRED", price: { amount, recipient } }`.
-   Pay via MCP `initiateTransaction` or REST `/api/transactions/initiate`.
-   Retry with headers: `X-PAYMENT-AGENT`, `X-PAYMENT-TX-ID`, `X-PAYMENT-AMOUNT`.
