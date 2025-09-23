# x402 NANDA Points - Server Infrastructure

**Fork of Coinbase's x402 server examples adapted for NANDA Points settlement instead of blockchain/USDC.**

## Overview

This monorepo forks Coinbase's working x402 server implementations and adapts them to use NANDA Points + MongoDB instead of blockchain settlement. We maintain full x402 protocol compliance while replacing the payment backend.

## What This Enables

- **x402-compliant servers** that return proper HTTP 402 "Payment Required" responses
- **NANDA Points settlement** instead of blockchain transactions
- **Compatibility** with existing x402 clients (x402-axios, x402-mcp, etc.)
- **MCP integration** with Streamable HTTP transport

## Architecture

```
┌─────────────────┐    HTTP 402    ┌─────────────────┐
│  x402 Clients   │ ──────────────► │   Our Servers   │
│ (Coinbase MCP,  │    Payments    │ (This Project)  │
│  x402-axios)    │ ◄────────────── │                 │
└─────────────────┘                └─────────────────┘
                                             │
                                             ▼
                                   ┌─────────────────┐
                                   │ NANDA Points    │
                                   │ Facilitator     │
                                   │ (MongoDB)       │
                                   └─────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB running on port 27017
- NANDA Points database seeded

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up Environment
```bash
cp .env.example .env
# Edit .env with your MongoDB settings
```

### 3. Seed Database
```bash
npm run seed
```

### 4. Start Express Server
```bash
npm run dev:express
```

Your x402-compliant server will be running at:
- **Server**: `http://localhost:4021`
- **Example endpoints**: `/weather` (requires payment), `/health` (free)

### 5. Test with x402 Clients
```bash
# Test with Coinbase's x402-mcp client
# Or use any other x402-compatible client
```

## Packages

### [Express Server](./packages/express-server/)
**Production-ready server with middleware**
- Based on Coinbase's `/examples/typescript/servers/express`
- Uses `paymentMiddleware` for automatic payment handling
- Simple configuration, minimal code changes needed

### [Advanced Server](./packages/advanced-server/)
**Flexible server with manual payment handling**
- Based on Coinbase's `/examples/typescript/servers/advanced`
- Manual payment verification and settlement
- Async settlement patterns, dynamic pricing

### [Facilitator](./packages/facilitator/)
**NANDA Points Facilitator Service**
- Implements x402 facilitator API (`/verify`, `/settle`, `/supported`)
- Handles "nanda-points" payment scheme
- Replaces blockchain calls with MongoDB transactions

### [Shared](./packages/shared/)
**Common utilities and types**
- x402 protocol types and interfaces
- NANDA Points transaction utilities
- Payment validation helpers

## What We Changed from Coinbase x402

### Payment Scheme
- **Before**: EVM blockchain schemes (exact, eip712-usdc-base)
- **After**: "nanda-points" scheme with MongoDB backend

### Settlement
- **Before**: Blockchain RPC calls, smart contract interactions
- **After**: MongoDB transactions, agent balance updates

### Verification
- **Before**: Wallet signature verification, on-chain balance checks
- **After**: Agent authentication, transaction receipt validation

### Facilitator
- **Before**: Ethereum/Solana facilitator endpoints
- **After**: Custom NP facilitator with `/verify`, `/settle`, `/supported`

## Payment Flow Sequence

The following diagram shows the complete x402 payment flow from the Requesting Agent's perspective:

```mermaid
sequenceDiagram
    participant RA as Requesting Agent
    participant RS as Resource Server<br/>(Express/MCP)
    participant FS as Facilitator Service<br/>(Port 4022)
    participant DB as MongoDB<br/>(NANDA Points)

    Note over RA, DB: 1. Initial Request (No Payment)
    RA->>RS: GET /weather
    Note right of RA: No X-PAYMENT header

    RS->>RS: Check payment requirements
    Note right of RS: Route requires 1 NP

    RS-->>RA: HTTP 402 Payment Required
    Note right of RS: {<br/>  "x402Version": 1,<br/>  "error": "X-PAYMENT header is required",<br/>  "accepts": [{<br/>    "scheme": "nanda-points",<br/>    "network": "nanda-network",<br/>    "maxAmountRequired": "1",<br/>    "asset": "NP",<br/>    "payTo": "system",<br/>    "facilitatorUrl": "http://localhost:4022"<br/>  }]<br/>}

    Note over RA, DB: 2. Agent Processes Payment Requirements
    RA->>RA: Parse payment requirements
    RA->>RA: Generate unique txId
    RA->>RA: Create payment payload
    Note right of RA: {<br/>  "scheme": "nanda-points",<br/>  "amount": "1",<br/>  "from": "requesting-agent",<br/>  "to": "system",<br/>  "txId": "uuid-123",<br/>  "timestamp": 1234567890<br/>}

    Note over RA, DB: 3. Pre-verification (Optional)
    RA->>FS: POST /verify
    Note right of RA: Verify payment before committing

    FS->>DB: Check agent exists
    DB-->>FS: Agent: {name: "requesting-agent", ...}

    FS->>DB: Check wallet balance
    DB-->>FS: Wallet: {balanceMinor: 150, ...}

    FS->>FS: Validate payment<br/>• Amount: 1 ≤ 150 ✓<br/>• Agent exists ✓<br/>• Recipient valid ✓

    FS-->>RA: {"isValid": true, "payer": "requesting-agent"}

    Note over RA, DB: 4. Make Paid Request
    RA->>RA: Encode payment as base64
    RA->>RS: GET /weather<br/>X-PAYMENT: <base64-encoded-payment>

    RS->>RS: Decode X-PAYMENT header
    RS->>FS: POST /verify (payment + requirements)

    FS->>DB: Validate agent & balance
    DB-->>FS: Validation successful

    FS-->>RS: {"isValid": true, "payer": "requesting-agent"}

    RS->>RS: Execute business logic
    Note right of RS: Generate weather data

    RS->>FS: POST /settle (complete payment)

    Note over FS, DB: 5. Settlement Process
    FS->>DB: Begin transaction

    FS->>DB: Update sender balance<br/>requesting-agent: 150 → 149
    FS->>DB: Update recipient balance<br/>system: 1000 → 1001

    FS->>DB: Create transaction record
    Note right of DB: {<br/>  "txId": "uuid-123",<br/>  "from": "requesting-agent",<br/>  "to": "system",<br/>  "amount": 1,<br/>  "status": "completed"<br/>}

    FS->>DB: Create receipt
    Note right of DB: {<br/>  "txId": "uuid-123",<br/>  "timestamp": 1234567890,<br/>  "resource": "/weather"<br/>}

    FS->>DB: Commit transaction

    FS-->>RS: {"success": true, "txId": "uuid-123", ...}

    RS->>RS: Create X-PAYMENT-RESPONSE header
    Note right of RS: base64({<br/>  "txId": "uuid-123",<br/>  "amount": "1",<br/>  "from": "requesting-agent",<br/>  "to": "system",<br/>  "timestamp": 1234567890<br/>})

    RS-->>RA: HTTP 200 OK<br/>X-PAYMENT-RESPONSE: <receipt>
    Note right of RS: {<br/>  "report": {<br/>    "weather": "sunny",<br/>    "temperature": 72<br/>  },<br/>  "cost": "1 NP",<br/>  "message": "Weather data successfully accessed!"<br/>}

    Note over RA, DB: 6. Payment Complete
    RA->>RA: Process response
    RA->>RA: Decode X-PAYMENT-RESPONSE
    RA->>RA: Store receipt for records
```

### Key Flow Points:

1. **Initial Request**: Agent requests resource without payment, receives HTTP 402 with payment requirements
2. **Payment Preparation**: Agent creates payment payload with unique transaction ID
3. **Pre-verification**: Optional step to validate payment before committing
4. **Paid Request**: Agent includes X-PAYMENT header with encoded payment
5. **Settlement**: Facilitator atomically updates balances and creates transaction records
6. **Receipt**: Server returns data with X-PAYMENT-RESPONSE header containing settlement proof

### Error Scenarios:

- **Insufficient Balance**: Facilitator returns `{"isValid": false, "invalidReason": "Insufficient balance"}`
- **Invalid Agent**: Facilitator returns `{"isValid": false, "invalidReason": "Agent not found"}`
- **Duplicate Transaction**: Facilitator rejects if txId already exists
- **Settlement Failure**: Server returns HTTP 402 if settlement fails during processing

## Testing

### Unit Tests
```bash
npm test
```

### x402 Protocol Compliance
```bash
npm run test:x402
```

### Integration with Clients
```bash
npm run test:clients
```

## Development

### Project Structure
```
packages/
├── express-server/      # Simple middleware-based server
├── advanced-server/     # Manual payment handling server
├── facilitator/         # NP facilitator service
├── shared/              # Common utilities
└── examples/           # Usage examples
```

### Adding a Paid Endpoint (Express Server)
```typescript
// In packages/express-server/index.ts
app.use(
  paymentMiddleware(payTo, {
    "GET /my-endpoint": {
      price: "$0.001",
      network: "nanda-points",
    }
  }, { facilitatorUrl })
);

app.get("/my-endpoint", (req, res) => {
  res.json({ data: "This endpoint requires payment" });
});
```

### Manual Payment Handling (Advanced Server)
```typescript
// In packages/advanced-server/index.ts
app.get("/my-endpoint", async (req, res) => {
  const paymentRequirements = [createNandaPaymentRequirements(
    "10", // 10 NP
    req.originalUrl,
    "My paid endpoint"
  )];

  const isValid = await verifyPayment(req, res, paymentRequirements);
  if (!isValid) return;

  res.json({ data: "Payment verified!" });
});
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with full test coverage
4. Ensure zero lint errors: `npm run lint`
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Based on Coinbase x402

This project is based on [Coinbase's x402 protocol](https://github.com/coinbase/x402) server examples. We've adapted the proven implementations to work with NANDA Points while maintaining full x402 protocol compliance.