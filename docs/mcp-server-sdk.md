# MCP Server SDK Documentation

## Overview

The MCP Server SDK provides middleware and utilities for adding x402 payment capabilities to MCP (Model Context Protocol) servers using NANDA Points.

## Core Components

### npPaymentMiddleware

Express middleware that adds x402 payment requirements to specified routes.

```typescript
import { npPaymentMiddleware } from "x402-nanda-shared";

app.use(
  npPaymentMiddleware(
    {
      "GET /premium/content": {
        priceNP: 10,
        recipient: "system",
        description: "Access to premium content",
        maxTimeoutSeconds: 60,
      },
      "/premium/*": {
        priceNP: 5,
        recipient: "system",
        description: "Access to premium features",
        maxTimeoutSeconds: 30,
      }
    },
    "http://localhost:3001" // facilitator URL
  )
);
```

### Payment Configuration

```typescript
interface NPPaymentConfig {
  priceNP: number;                    // Price in NANDA Points
  recipient: string;                  // Recipient agent name
  description?: string;               // Payment description
  maxTimeoutSeconds?: number;         // Payment timeout
}

interface NPRoutesConfig {
  [route: string]: NPPaymentConfig;
}
```

### Route Patterns

The middleware supports flexible route patterns:

- **Exact match**: `"GET /premium/content"`
- **Wildcard**: `"/premium/*"` matches `/premium/content`, `/premium/analysis`, etc.
- **Method-specific**: `"POST /api/action"` only matches POST requests
- **Method-agnostic**: `"/api/action"` matches any HTTP method

## Middleware Behavior

### Without Payment

When a protected route is accessed without payment:

```http
GET /premium/content HTTP/1.1
Host: localhost:3000

HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "x402Version": 1,
  "error": "X-PAYMENT header is required",
  "accepts": [{
    "scheme": "nanda-points",
    "network": "nanda-network",
    "maxAmountRequired": "10",
    "resource": "http://localhost:3000/premium/content",
    "description": "Access to premium content",
    "mimeType": "application/json",
    "payTo": "system",
    "maxTimeoutSeconds": 60,
    "asset": "NP",
    "extra": {
      "facilitatorUrl": "http://localhost:3001"
    }
  }]
}
```

### With Valid Payment

When a valid payment is provided:

```http
GET /premium/content HTTP/1.1
Host: localhost:3000
X-PAYMENT: eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoibmFuZGEtcG9pbnRzIi...

HTTP/1.1 200 OK
Content-Type: application/json
X-PAYMENT-RESPONSE: eyJ0eElkIjoidGVzdC0xNzU4NjI4Njg2LTQwMjI3Ii...

{
  "content": "This is premium content available for 10 NANDA Points",
  "features": ["Advanced analytics", "Real-time updates"]
}
```

## Integration Examples

### Basic MCP Server

```typescript
import express from "express";
import { npPaymentMiddleware } from "x402-nanda-shared";

const app = express();
const facilitatorUrl = "http://localhost:3001";
const payTo = "my-service";

// Add payment middleware
app.use(
  npPaymentMiddleware(
    {
      "GET /ai/analyze": {
        priceNP: 2,
        recipient: payTo,
        description: "AI content analysis",
      },
      "POST /ai/generate": {
        priceNP: 5,
        recipient: payTo,
        description: "AI content generation",
      }
    },
    facilitatorUrl
  )
);

// Free endpoints (no payment required)
app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

// Paid endpoints (automatically protected)
app.get("/ai/analyze", (req, res) => {
  res.json({
    analysis: "Content analysis results...",
    cost: "2 NP"
  });
});

app.post("/ai/generate", (req, res) => {
  res.json({
    generated: "Generated content...",
    cost: "5 NP"
  });
});

app.listen(3000);
```

### Advanced Configuration

```typescript
// Different pricing tiers
const routes = {
  "GET /basic/*": {
    priceNP: 1,
    recipient: payTo,
    description: "Basic tier access",
    maxTimeoutSeconds: 30,
  },
  "GET /premium/*": {
    priceNP: 10,
    recipient: payTo,
    description: "Premium tier access",
    maxTimeoutSeconds: 60,
  },
  "GET /enterprise/*": {
    priceNP: 50,
    recipient: payTo,
    description: "Enterprise tier access",
    maxTimeoutSeconds: 120,
  }
};
```

## Error Handling

The middleware handles various error scenarios:

### Payment Verification Errors
- Invalid payment format
- Insufficient balance
- Agent not found
- Duplicate transaction

### Network Errors
- Facilitator unavailable
- Timeout connecting to facilitator
- Invalid facilitator response

### Configuration Errors
- Invalid route patterns
- Missing facilitator URL
- Invalid payment configuration

## Best Practices

1. **Route Organization**: Group related endpoints under common prefixes
2. **Pricing Strategy**: Consider usage patterns and value provided
3. **Error Handling**: Implement graceful degradation for payment failures
4. **Monitoring**: Log payment attempts and failures
5. **Testing**: Test both free and paid endpoints thoroughly

## Streamable HTTP Transport

The SDK is designed for Streamable HTTP transport compatibility:

- Proper HTTP status codes (402 for payment required)
- Standard HTTP headers (X-PAYMENT, X-PAYMENT-RESPONSE)
- JSON request/response bodies
- RESTful API patterns

This ensures compatibility with MCP clients that use HTTP transport rather than stdio.