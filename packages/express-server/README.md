# x402 NANDA Points Express Server

This Express.js server demonstrates x402 protocol compliance using NANDA Points instead of blockchain payments. It's forked from Coinbase's x402 Express server example and adapted for MongoDB/NP settlement.

## Features

- **x402 Protocol Compliance**: Returns proper HTTP 402 responses with payment requirements
- **NANDA Points Integration**: Uses "nanda-points" scheme instead of blockchain/USDC
- **Express Middleware**: Drop-in `npPaymentMiddleware` for automatic payment handling
- **MongoDB Backend**: Replaces blockchain verification with MongoDB transactions

## Prerequisites

- Node.js v20+
- MongoDB running on localhost:27017 (for payment verification)
- NANDA Points facilitator running on localhost:4022

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
# Copy and edit .env file
FACILITATOR_URL=http://localhost:4022
ADDRESS=system  # Agent name to receive payments
PORT=4021
```

3. Start the server:
```bash
npm run dev
```

## Testing the Server

### Test HTTP 402 Response (No Payment)
```bash
curl -i http://localhost:4021/weather
# Returns: HTTP/1.1 402 Payment Required
```

### Test Free Endpoint
```bash
curl http://localhost:4021/health
# Returns: {"status":"healthy",...}
```

### Expected 402 Response Format
```json
{
  "x402Version": 1,
  "error": "X-PAYMENT header is required",
  "accepts": [{
    "scheme": "nanda-points",
    "network": "nanda-network",
    "maxAmountRequired": "1",
    "resource": "http://localhost:4021/weather",
    "description": "Access to weather data",
    "mimeType": "application/json",
    "payTo": "system",
    "maxTimeoutSeconds": 60,
    "asset": "NP",
    "extra": {
      "facilitatorUrl": "http://localhost:4022"
    }
  }]
}
```

## Endpoints

- `GET /health` - Free health check endpoint
- `GET /weather` - Weather data (costs 1 NP)
- `GET /premium/content` - Premium content (costs 10 NP)
- `GET /premium/analysis` - Premium analysis (costs 10 NP)

## Adding Paid Endpoints

Use the `npPaymentMiddleware` from `x402-nanda-shared`:

```typescript
import { npPaymentMiddleware } from "x402-nanda-shared";

app.use(
  npPaymentMiddleware(
    {
      "GET /my-endpoint": {
        priceNP: 5, // 5 NANDA Points
        recipient: "system",
        description: "My paid endpoint",
        maxTimeoutSeconds: 60,
      },
      "/premium/*": {
        priceNP: 20, // 20 NP for all premium routes
        recipient: "system",
        description: "Premium features",
        maxTimeoutSeconds: 60,
      }
    },
    facilitatorUrl
  )
);

app.get("/my-endpoint", (req, res) => {
  res.json({ data: "This endpoint requires 5 NP payment" });
});
```

## Payment Flow

1. Client requests paid endpoint without payment
2. Server returns HTTP 402 with payment requirements
3. Client processes payment via NANDA Points system
4. Client retries with `X-PAYMENT` header containing payment proof
5. Server verifies payment with facilitator
6. Server executes request and returns data with `X-PAYMENT-RESPONSE` header

## Differences from Coinbase x402

- **Payment Scheme**: "nanda-points" instead of EVM blockchain schemes
- **Settlement**: MongoDB transactions instead of smart contracts
- **Authentication**: Agent names instead of wallet signatures
- **Asset**: "NP" (NANDA Points) instead of USDC
- **Network**: "nanda-network" instead of blockchain networks

## Related Packages

- [`../shared/`](../shared/) - Shared utilities and middleware
- [`../facilitator/`](../facilitator/) - NANDA Points facilitator service
- [`../advanced-server/`](../advanced-server/) - Manual payment handling example