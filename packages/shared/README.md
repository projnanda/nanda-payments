# x402 NANDA Points Shared Package

Common utilities, types, and middleware for building x402-compliant servers using NANDA Points. This package replaces `x402-express` and provides the core functionality for payment-gated endpoints.

## Features

- **x402 Protocol Types**: Standard interfaces for payment requirements and payloads
- **NANDA Points Scheme**: "nanda-points" payment scheme implementation
- **Express Middleware**: Drop-in replacement for `x402-express`
- **MongoDB Integration**: Transaction utilities for NANDA Points settlement
- **Facilitator Client**: HTTP client for facilitator API communication

## Installation

```bash
npm install x402-nanda-shared
```

## Core Components

### Payment Middleware

Replace `x402-express` middleware with `npPaymentMiddleware`:

```typescript
import { npPaymentMiddleware } from "x402-nanda-shared";

app.use(
  npPaymentMiddleware(
    {
      "GET /weather": {
        priceNP: 1,
        recipient: "system",
        description: "Weather data access",
        maxTimeoutSeconds: 60,
      },
      "/premium/*": {
        priceNP: 10,
        recipient: "system",
        description: "Premium content",
        maxTimeoutSeconds: 60,
      }
    },
    "http://localhost:4022" // facilitator URL
  )
);
```

### Payment Scheme

The NANDA Points scheme handles payment encoding/decoding:

```typescript
import { nandaPoints } from "x402-nanda-shared";

// Decode X-PAYMENT header
const payment = nandaPoints.decodePayment(xPaymentHeader);

// Create payment requirements
const requirements = nandaPoints.createPaymentRequirements(
  {
    priceNP: 5,
    recipient: "agent-name",
    description: "Access to feature",
    maxTimeoutSeconds: 60
  },
  "http://localhost:3000/endpoint",
  "http://localhost:4022"
);
```

### Facilitator Client

Communicate with the NANDA Points facilitator:

```typescript
import { createNPFacilitatorClient } from "x402-nanda-shared";

const facilitator = createNPFacilitatorClient("http://localhost:4022");

// Verify payment
const verification = await facilitator.verify(payment, requirements);

// Settle payment after successful request
const settlement = await facilitator.settle(payment, requirements);

// Get supported payment schemes
const supported = await facilitator.supported();
```

### MongoDB Utilities

Work with existing NANDA Points database schema:

```typescript
import { connectToMongoDB, mongoUtils } from "x402-nanda-shared";

// Connect to database
const db = await connectToMongoDB({
  mongoUri: "mongodb://localhost:27017",
  dbName: "nanda_points"
});

// Check agent balance
const balance = await mongoUtils.getAgentBalance(db, "agent-name");

// Validate payment capability
const validation = await mongoUtils.validateAgentAndBalance(
  db,
  "agent-name",
  requiredAmount
);
```

## Types

### Core Interfaces

```typescript
interface PaymentRequirements {
  scheme: "nanda-points";
  network: "nanda-network";
  maxAmountRequired: string;
  resource: string;
  description: string;
  payTo: string; // Agent name
  maxTimeoutSeconds: number;
  asset: "NP";
  extra?: {
    facilitatorUrl?: string;
  };
}

interface PaymentPayload {
  scheme: "nanda-points";
  network: "nanda-network";
  amount: string;
  to: string;
  from: string;
  txId: string;
  timestamp: number;
  x402Version: number;
}
```

### Configuration Types

```typescript
interface NPPaymentConfig {
  priceNP: number;           // Price in NANDA Points
  recipient: string;         // Agent name to receive payment
  description: string;       // Human-readable description
  maxTimeoutSeconds: number; // Payment timeout
}

interface NPRoutesConfig {
  [route: string]: NPPaymentConfig;
}
```

## Error Handling

The package includes specific error types for payment failures:

```typescript
import { NPPaymentError, NPVerificationError, NPSettlementError } from "x402-nanda-shared";

try {
  await facilitator.verify(payment, requirements);
} catch (error) {
  if (error instanceof NPVerificationError) {
    // Handle verification failure
  } else if (error instanceof NPSettlementError) {
    // Handle settlement failure
  }
}
```

## Migration from x402-express

### Before (x402-express)
```typescript
import { paymentMiddleware } from "x402-express";

app.use(paymentMiddleware(payTo, {
  "GET /endpoint": {
    price: "$0.001",
    network: "base-sepolia"
  }
}, facilitatorUrl));
```

### After (x402-nanda-shared)
```typescript
import { npPaymentMiddleware } from "x402-nanda-shared";

app.use(npPaymentMiddleware({
  "GET /endpoint": {
    priceNP: 1,
    recipient: "agent-name",
    description: "Endpoint access",
    maxTimeoutSeconds: 60
  }
}, facilitatorUrl));
```

## Facilitator Integration

This package expects a NANDA Points facilitator service running with these endpoints:

- `POST /verify` - Verify payment against requirements
- `POST /settle` - Execute payment settlement
- `GET /supported` - Get supported payment schemes

The facilitator handles the actual MongoDB transactions and NANDA Points balance management.

## Related Packages

- [`../facilitator/`](../facilitator/) - NANDA Points facilitator service
- [`../express-server/`](../express-server/) - Example Express server
- [`../advanced-server/`](../advanced-server/) - Advanced manual payment handling