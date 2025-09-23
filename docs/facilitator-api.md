# Facilitator API Specification

## Overview

The NANDA Points Facilitator API provides x402-compliant payment verification and settlement services for the "nanda-points" payment scheme.

**Base URL**: `http://localhost:3001`

## Endpoints

### GET /supported

Returns supported payment schemes and capabilities.

**Response**: `200 OK`
```json
{
  "kinds": [{
    "scheme": "nanda-points",
    "network": "nanda-network",
    "asset": "NP",
    "extra": {
      "facilitatorUrl": "http://localhost:3001/facilitator",
      "description": "NANDA Points payment scheme using MongoDB backend",
      "scale": 0,
      "currency": "NP"
    }
  }]
}
```

### POST /verify

Verifies payment validity without settlement.

**Request Body**:
```json
{
  "payment": {
    "x402Version": 1,
    "scheme": "nanda-points",
    "network": "nanda-network",
    "payTo": "system",
    "amount": "10",
    "from": "claude-desktop",
    "txId": "unique-tx-id",
    "timestamp": 1758628686000
  },
  "paymentRequirements": {
    "scheme": "nanda-points",
    "network": "nanda-network",
    "maxAmountRequired": "10",
    "resource": "http://localhost:3000/premium/content",
    "description": "Access to premium content",
    "payTo": "system",
    "asset": "NP"
  }
}
```

**Success Response**: `200 OK`
```json
{
  "isValid": true,
  "payer": "claude-desktop",
  "amount": "10",
  "txId": "unique-tx-id"
}
```

**Error Response**: `402 Payment Required`
```json
{
  "isValid": false,
  "invalidReason": "Insufficient balance",
  "payer": "claude-desktop",
  "details": {
    "agent": "claude-desktop",
    "balance": 5,
    "required": 10
  }
}
```

### POST /settle

Verifies and settles payment, updating balances.

**Request Body**: Same as `/verify`

**Success Response**: `200 OK`
```json
{
  "success": true,
  "txId": "unique-tx-id",
  "amount": "10",
  "from": "claude-desktop",
  "to": "system",
  "timestamp": 1758628686499,
  "receipt": {
    "txId": "unique-tx-id",
    "issuedAt": "2025-09-23T11:58:06.499Z",
    "fromAgent": "claude-desktop",
    "toAgent": "system",
    "amountMinor": 10,
    "fromBalanceAfter": 1531,
    "toBalanceAfter": 1021
  }
}
```

**Error Response**: `402 Payment Required`
```json
{
  "success": false,
  "errorReason": "Agent not found",
  "txId": "unique-tx-id",
  "details": {
    "agent": "non-existent-agent"
  }
}
```

### GET /health

Health check endpoint.

**Response**: `200 OK`
```json
{
  "status": "healthy",
  "service": "nanda-points-facilitator",
  "version": "1.0.0",
  "schemes": ["nanda-points"]
}
```

## Error Codes and Messages

| Error | HTTP Status | Message |
|-------|-------------|---------|
| Agent not found | 402 | "Agent not found" |
| Insufficient balance | 402 | "Insufficient balance" |
| Invalid payment scheme | 402 | "Unsupported payment scheme" |
| Duplicate transaction | 402 | "Transaction exists but not completed" |
| Invalid amount | 402 | "Insufficient payment amount" |
| Recipient mismatch | 402 | "Payment recipient mismatch" |

## Database Operations

The facilitator performs atomic MongoDB operations:

1. **Verification**:
   - Check sender agent exists
   - Check recipient agent exists
   - Validate sender balance
   - Check for duplicate transactions

2. **Settlement**:
   - Deduct amount from sender wallet
   - Add amount to recipient wallet
   - Create transaction record
   - Generate receipt

## Authentication

- No authentication required (trust-based system)
- Agent validation through database lookup
- Transaction uniqueness prevents double-spending

## Rate Limiting

- No rate limiting implemented
- Production deployments should add appropriate limits

## Monitoring

- Console logging for all transactions
- MongoDB operations logged with balances
- Error conditions logged with details