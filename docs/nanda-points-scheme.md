# NANDA Points Payment Scheme Specification

## Overview

The "nanda-points" payment scheme replaces blockchain-based payment schemes (like EVM) with a MongoDB-backed agent transaction system.

## Scheme Identification

- **Scheme**: `"nanda-points"`
- **Network**: `"nanda-network"`
- **Asset**: `"NP"`

## Payment Payload Structure

```json
{
  "x402Version": 1,
  "scheme": "nanda-points",
  "network": "nanda-network",
  "payTo": "recipient-agent-name",
  "amount": "10",
  "from": "sender-agent-name",
  "txId": "unique-transaction-id",
  "timestamp": 1758628686000
}
```

### Required Fields

- `scheme`: Must be `"nanda-points"`
- `network`: Must be `"nanda-network"`
- `payTo`: Recipient agent name (string)
- `amount`: Payment amount in NP (string representation of integer)
- `from`: Sender agent name (string)
- `txId`: Unique transaction identifier (string)
- `timestamp`: Unix timestamp in milliseconds (number)

## Payment Requirements Structure

```json
{
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
}
```

## Differences from Blockchain Schemes

### Authentication
- **Blockchain**: Wallet signatures (EIP-712)
- **NANDA Points**: Agent name authentication

### Settlement
- **Blockchain**: Smart contract calls, gas fees
- **NANDA Points**: MongoDB balance updates

### Verification
- **Blockchain**: On-chain balance checks, signature verification
- **NANDA Points**: Database queries, transaction validation

### Transaction IDs
- **Blockchain**: On-chain transaction hashes
- **NANDA Points**: UUID or custom transaction identifiers

## Facilitator Integration

The facilitator provides three endpoints:

### `/verify`
- Validates payment without settlement
- Checks agent existence and balance
- Returns validation status

### `/settle`
- Performs actual balance transfer
- Creates transaction and receipt records
- Returns settlement confirmation

### `/supported`
- Returns supported payment schemes
- Includes facilitator URL and capabilities

## Error Scenarios

1. **Agent Not Found**: Sender or recipient doesn't exist
2. **Insufficient Balance**: Sender lacks required NP amount
3. **Duplicate Transaction**: txId already exists
4. **Invalid Amount**: Non-numeric or negative amount
5. **Schema Validation**: Missing required fields

## Security Considerations

- Transaction IDs must be unique to prevent double-spending
- Agent validation prevents payments to/from non-existent accounts
- Balance checks prevent overdrafts
- Atomic database operations ensure consistency