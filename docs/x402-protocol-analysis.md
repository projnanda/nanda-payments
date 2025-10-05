# x402 Protocol Analysis

## Client Expectations for Server Behavior

Based on analysis of the x402 protocol and client implementations, servers must provide:

### 1. HTTP 402 Payment Required Response

When payment is required, servers must return:
- **Status Code**: `402 Payment Required`
- **Content-Type**: `application/json`
- **Response Body**: Payment requirements JSON

### 2. Payment Requirements Format

```json
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

### 3. X-PAYMENT Header Processing

Servers must:
- Accept `X-PAYMENT` header with base64-encoded payment payload
- Decode and validate payment structure
- Verify payment against requirements
- Process payment through facilitator

### 4. X-PAYMENT-RESPONSE Header

On successful payment, servers should return:
- **Status Code**: `200 OK`
- **X-PAYMENT-RESPONSE Header**: Base64-encoded settlement receipt
- **Response Body**: Requested resource data

### 5. Error Handling

Servers must handle:
- Missing X-PAYMENT header → 402 with payment requirements
- Invalid payment format → 402 with decoding error
- Insufficient funds → 402 with balance error
- Invalid agent → 402 with agent not found error

## Client Flow Expectations

1. **Initial Request**: Client requests resource without payment
2. **Payment Discovery**: Server returns 402 with payment requirements
3. **Payment Creation**: Client creates payment payload with unique txId
4. **Payment Submission**: Client retries with X-PAYMENT header
5. **Settlement**: Server verifies, settles, and returns resource with receipt

## Key Protocol Principles

- **HTTP Native**: Payments complement existing HTTP flows
- **Chain Agnostic**: Not tied to specific blockchain
- **Minimal Integration**: Easy to add to existing APIs
- **Flexible Schemes**: Supports multiple payment methods
- **Atomic Transactions**: Payment and resource delivery are linked