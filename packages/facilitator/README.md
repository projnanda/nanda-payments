# NANDA Points Facilitator Service

x402-compliant facilitator service that handles NANDA Points payment verification and settlement using MongoDB instead of blockchain transactions. This service implements the standard x402 facilitator API endpoints.

## Features

- **x402 Facilitator API**: Standard `/verify`, `/settle`, `/supported` endpoints
- **NANDA Points Integration**: Handles "nanda-points" payment scheme
- **MongoDB Backend**: Replaces blockchain verification with MongoDB transactions
- **Agent-based Authentication**: Uses agent names instead of wallet signatures
- **Transaction Management**: Creates and tracks payment receipts

## Prerequisites

- Node.js v20+
- MongoDB running on localhost:27017
- Existing NANDA Points database schema (agents, wallets, transactions, receipts)

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
MONGO_URI=mongodb://localhost:27017
DB_NAME=nanda_points
PORT=3001
```

3. Start the facilitator:
```bash
npm run dev
```

## API Endpoints

### POST /verify

Verify a payment against payment requirements.

**Request:**
```json
{
  "payment": {
    "scheme": "nanda-points",
    "network": "nanda-network",
    "amount": "1",
    "to": "system",
    "from": "client-agent",
    "txId": "unique-transaction-id",
    "timestamp": 1234567890,
    "x402Version": 1
  },
  "paymentRequirements": {
    "scheme": "nanda-points",
    "network": "nanda-network",
    "maxAmountRequired": "1",
    "resource": "http://localhost:3000/weather",
    "description": "Weather data access",
    "payTo": "system",
    "maxTimeoutSeconds": 60,
    "asset": "NP"
  }
}
```

**Response (Success):**
```json
{
  "isValid": true,
  "payer": "client-agent"
}
```

**Response (Failure):**
```json
{
  "isValid": false,
  "invalidReason": "Insufficient balance",
  "payer": "client-agent"
}
```

### POST /settle

Execute payment settlement and create transaction records.

**Request:** Same as `/verify`

**Response (Success):**
```json
{
  "success": true,
  "txId": "unique-transaction-id",
  "amount": "1",
  "from": "client-agent",
  "to": "system",
  "timestamp": 1234567890
}
```

**Response (Failure):**
```json
{
  "success": false,
  "errorReason": "Payment verification failed"
}
```

### GET /supported

Get supported payment schemes.

**Response:**
```json
{
  "kinds": [{
    "scheme": "nanda-points",
    "network": "nanda-network",
    "asset": "NP"
  }]
}
```

## Payment Flow

1. **Client Request**: Client makes request to protected resource without payment
2. **402 Response**: Resource server returns HTTP 402 with payment requirements
3. **Payment Verification**: Client calls `/verify` to validate payment capability
4. **Payment Settlement**: After successful resource access, server calls `/settle` to execute payment
5. **Transaction Recording**: Facilitator creates transaction and receipt records in MongoDB

## MongoDB Integration

The facilitator integrates with existing NANDA Points collections:

### Collections Used
- `agents` - Agent registration and metadata
- `wallets` - Agent balances and wallet information
- `transactions` - Payment transaction records
- `receipts` - Payment receipt records

### Transaction Flow
1. Verify agent exists and has sufficient balance
2. Create transaction record with pending status
3. Update sender/recipient wallet balances
4. Create payment receipt
5. Update transaction status to completed

## Configuration

Environment variables:

```bash
# MongoDB connection
MONGO_URI=mongodb://localhost:27017
DB_NAME=nanda_points

# Server configuration
PORT=3001
HOST=localhost

# Optional: Enable debug logging
DEBUG=true
```

## Testing the Facilitator

### Test /supported endpoint
```bash
curl http://localhost:3001/supported
```

### Test /verify endpoint
```bash
curl -X POST http://localhost:3001/verify \
  -H "Content-Type: application/json" \
  -d '{
    "payment": {
      "scheme": "nanda-points",
      "amount": "1",
      "from": "test-agent",
      "to": "system",
      "txId": "test-tx-123"
    },
    "paymentRequirements": {
      "scheme": "nanda-points",
      "maxAmountRequired": "1",
      "payTo": "system"
    }
  }'
```

## Error Handling

The facilitator returns appropriate HTTP status codes:

- `200` - Success
- `400` - Bad request (invalid payment format)
- `402` - Payment verification failed
- `500` - Internal server error

Error responses include detailed `errorReason` or `invalidReason` fields.

## Security Considerations

- **Agent Authentication**: Payments are linked to agent names in the database
- **Transaction IDs**: Must be unique to prevent double-spending
- **Balance Validation**: Always checks sufficient balance before settlement
- **Atomic Operations**: Uses MongoDB transactions for balance updates

## Deployment

The facilitator can be deployed as:

1. **Standalone Service**: Independent facilitator for multiple resource servers
2. **Embedded**: Bundled with resource servers for simplified deployment
3. **Containerized**: Docker deployment with MongoDB connection

## Differences from Blockchain Facilitators

- **No Smart Contracts**: Direct MongoDB operations instead of blockchain calls
- **Agent Names**: Uses string identifiers instead of wallet addresses
- **Instant Settlement**: No block confirmation delays
- **Centralized**: Single MongoDB instance instead of distributed blockchain

## Related Packages

- [`../shared/`](../shared/) - Common types and utilities
- [`../express-server/`](../express-server/) - Example Express server using this facilitator
- [`../advanced-server/`](../advanced-server/) - Advanced server with manual payment handling