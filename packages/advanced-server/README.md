# x402 Advanced NANDA Points Server

This is an advanced example of an Express.js server that demonstrates manual x402 payment handling using NANDA Points instead of blockchain transactions. This approach is useful for more complex scenarios, such as:

- Asynchronous payment settlement
- Custom payment validation logic
- Complex routing requirements
- Integration with existing authentication systems

> **💡 For new development, consider using the [@nanda/payments-sdk](../../sdks/payments-sdk/) which provides a more developer-friendly API for adding payments to Express routes and MCP tools.**

## Prerequisites

- Node.js v20+
- MongoDB running on localhost:27017
- NANDA Points facilitator service running on localhost:3001
- Valid NANDA Points agent for receiving payments

## Setup

1. Set environment variables:

```bash
# Agent name to receive payments
AGENT_NAME=system
# Facilitator service URL
FACILITATOR_URL=http://localhost:3001
# Server port
PORT=3000
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm run dev
```

## Implementation Overview

This advanced implementation provides a structured approach to handling payments with:

1. Helper functions for creating payment requirements and verifying payments
2. Support for delayed payment settlement
3. Dynamic pricing capabilities
4. Multiple payment requirement options
5. Proper error handling and response formatting
6. Integration with the x402 facilitator service

## Testing the Server

You can test the server using curl or any x402-compatible client:

### Test HTTP 402 Response
```bash
curl -i http://localhost:3000/weather
# Should return HTTP 402 with NANDA Points payment requirements
```

### Test with Payment
```bash
# First get payment requirements, then create payment via NANDA Points system
# and include in X-PAYMENT header
curl -H "X-PAYMENT: <base64-encoded-payment>" http://localhost:3000/weather
```

## Example Endpoints

The server includes example endpoints that demonstrate different payment scenarios:

### Delayed Settlement
- `/delayed-settlement` - Demonstrates asynchronous payment processing
- Returns the weather data immediately without waiting for payment settlement
- Processes payment asynchronously in the background
- Useful for scenarios where immediate response is critical and payment settlement can be handled later

### Dynamic Pricing
- `/dynamic-price` - Shows how to implement variable pricing based on request parameters
- Accepts a `multiplier` query parameter to adjust the base price
- Demonstrates how to calculate and validate payments with dynamic amounts
- Useful for implementing tiered pricing or demand-based pricing models

### Multiple Payment Requirements
- `/multiple-payment-requirements` - Illustrates how to accept multiple payment options
- Allows clients to pay using different assets (e.g., USDC or USDT)
- Supports multiple networks (e.g., Base and Base Sepolia)
- Useful for providing flexibility in payment methods and networks

## Response Format

### Payment Required (402)
```json
{
  "x402Version": 1,
  "error": "X-PAYMENT header is required",
  "accepts": [
    {
      "scheme": "nanda-points",
      "network": "nanda-network",
      "maxAmountRequired": "1",
      "resource": "http://localhost:3000/weather",
      "description": "Access to weather data",
      "mimeType": "application/json",
      "payTo": "system",
      "maxTimeoutSeconds": 60,
      "asset": "NP",
      "outputSchema": null,
      "extra": {
        "facilitatorUrl": "http://localhost:3001"
      }
    }
  ]
}
```

### Successful Response
```json
// Body
{
  "report": {
    "weather": "sunny",
    "temperature": 70
  }
}
// Headers
{
  "X-PAYMENT-RESPONSE": "..." // Encoded response object
}
```

## Extending the Example

To add more paid endpoints with delayed payment settlement, you can follow this pattern:

```typescript
app.get("/your-endpoint", async (req, res) => {
  const resource = `${req.protocol}://${req.headers.host}${req.originalUrl}` as Resource;
  const paymentRequirements = [createExactPaymentRequirements(
    "$0.001", // Your price
    "base-sepolia", // Your network
    resource,
    "Description of your resource"
  )];

  const isValid = await verifyPayment(req, res, paymentRequirements);
  if (!isValid) return;

  // Return your protected resource immediately
  res.json({
    // Your response data
  });

  // Process payment asynchronously
  try {
    const settleResponse = await settle(
      exact.evm.decodePayment(req.header("X-PAYMENT")!),
      paymentRequirements[0]
    );
    const responseHeader = settleResponseHeader(settleResponse);
    // In a real application, you would store this response header
    // and associate it with the payment for later verification
    console.log("Payment settled:", responseHeader);
  } catch (error) {
    console.error("Payment settlement failed:", error);
    // In a real application, you would handle the failed payment
    // by marking it for retry or notifying the user
  }
});
```

For dynamic pricing or multiple payment requirements, refer to the `/dynamic-price` and `/multiple-payment-requirements` endpoints in the example code for implementation details.
