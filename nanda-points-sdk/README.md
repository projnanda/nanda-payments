# NANDA Points SDK

A complete TypeScript SDK for the NANDA Points system with reputation verification, wallet management, and transaction processing.

## Features

- ✅ **Complete Transaction API** - earnPoints(), spendPoints(), transferPoints()
- ✅ **Reputation Verification** - Cryptographic reputation system with RSA-OAEP encryption
- ✅ **Wallet Management** - Create, manage, and track wallet balances
- ✅ **Invoice System** - Create, issue, and pay invoices
- ✅ **Agent Management** - DID-based identity system
- ✅ **TypeScript Support** - Full type definitions included
- ✅ **Error Handling** - Comprehensive error management
- ✅ **Real-time Events** - WebSocket integration support

## Installation

```bash
npm install nanda-points-sdk
```

## Quick Start

```typescript
import { NandaPointsSDK } from 'nanda-points-sdk';

// Initialize the SDK
const sdk = new NandaPointsSDK('http://localhost:3001');

// Earn points
const transaction = await sdk.earnPoints(1000, 'wallet-id', 'TASK_COMPLETION');
console.log('Points earned:', sdk.formatPoints(transaction.amountValue));

// Transfer points
await sdk.transferPoints(500, 'wallet-a', 'wallet-b', 'TASK_PAYOUT');

// Check balance
const balance = await sdk.getWalletBalance('wallet-id');
console.log('Balance:', sdk.formatPoints(balance));
```

## Core Methods

### Transaction Methods

#### `earnPoints(amount, walletId, reasonCode?, idempotencyKey?)`
Earn points for an agent's wallet.

```typescript
const tx = await sdk.earnPoints(10000, 'wallet-id', 'WELCOME_GRANT');
```

#### `spendPoints(amount, walletId, reasonCode?, idempotencyKey?)`
Spend points from an agent's wallet.

```typescript
const tx = await sdk.spendPoints(1000, 'wallet-id', 'SERVICE_PAYMENT');
```

#### `transferPoints(amount, fromWalletId, toWalletId, reasonCode?, idempotencyKey?)`
Transfer points between wallets.

```typescript
const tx = await sdk.transferPoints(500, 'wallet-a', 'wallet-b', 'TASK_PAYOUT');
```

### Reputation-Enhanced Transactions

#### `transferPointsWithReputation(amount, fromWalletId, toWalletId, reputationHash, actorDid, reasonCode?, idempotencyKey?)`
Transfer points with reputation verification.

```typescript
const tx = await sdk.transferPointsWithReputation(
  1000,
  'wallet-a',
  'wallet-b',
  'encrypted-reputation-hash',
  'did:nanda:agent',
  'TASK_PAYOUT'
);
```

### Wallet Management

#### `createWallet(agentDid, type?)`
Create a new wallet for an agent.

```typescript
const wallet = await sdk.createWallet('did:nanda:agent', 'user');
```

#### `getWallet(walletId)`
Get wallet information.

```typescript
const wallet = await sdk.getWallet('wallet-id');
```

#### `getWalletBalance(walletId)`
Get wallet balance.

```typescript
const balance = await sdk.getWalletBalance('wallet-id');
```

### Agent Management

#### `createAgent(agentData)`
Create a new agent.

```typescript
const agent = await sdk.createAgent({
  did: 'did:nanda:agent',
  name: 'Agent Name',
  primaryFactsUrl: 'https://agent.com/facts'
});
```

#### `getAgent(did)`
Get agent information.

```typescript
const agent = await sdk.getAgent('did:nanda:agent');
```

### Invoice Management

#### `createInvoice(invoiceData)`
Create a new invoice.

```typescript
const invoice = await sdk.createInvoice({
  amount: { value: 5000 },
  issuer: { did: 'did:nanda:issuer', walletId: 'wallet-id' },
  recipient: { did: 'did:nanda:recipient', walletId: 'wallet-id' }
});
```

#### `issueInvoice(invoiceId)`
Issue an invoice (change status from draft to issued).

```typescript
const invoice = await sdk.issueInvoice('invoice-id');
```

#### `payInvoice(invoiceId, amount, walletId, idempotencyKey?)`
Pay an invoice.

```typescript
const invoice = await sdk.payInvoice('invoice-id', 5000, 'wallet-id');
```

### Reputation System

#### `getReputationRequirements(transactionType, amount)`
Get reputation requirements for a transaction type.

```typescript
const requirements = await sdk.getReputationRequirements('transfer', 1000);
console.log('Required score:', requirements.minimumReputationScore);
```

#### `generateReputationKeys()`
Generate reputation verification keys.

```typescript
const keys = await sdk.generateReputationKeys();
console.log('Private key:', keys.privateKey);
console.log('Public key:', keys.publicKey);
```

### Utility Methods

#### `formatPoints(amount, scale?)`
Format points amount for display.

```typescript
const formatted = sdk.formatPoints(1000); // "1.000 NP"
```

#### `parsePoints(pointsString, scale?)`
Parse points amount from display format.

```typescript
const amount = sdk.parsePoints("1.500 NP"); // 1500
```

#### `healthCheck()`
Check if the API is healthy.

```typescript
const health = await sdk.healthCheck();
console.log('Status:', health.status);
```

## Configuration

```typescript
const sdk = new NandaPointsSDK('http://localhost:3001', 'your-api-key');
```

## Error Handling

The SDK throws `NandaPointsError` for API errors:

```typescript
try {
  await sdk.earnPoints(1000, 'invalid-wallet');
} catch (error) {
  if (error instanceof NandaPointsError) {
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
  }
}
```

## Examples

See the `examples/` directory for complete usage examples:

- `basic-usage.ts` - Basic transaction operations
- `reputation-example.ts` - Reputation system integration

## API Reference

The NANDA Points API supports 9 transaction types:

1. **mint** - Create new points
2. **burn** - Destroy points
3. **transfer** - Move points between wallets
4. **earn** - Agent earns points
5. **spend** - Agent spends points
6. **hold** - Hold points in escrow
7. **capture** - Capture held points
8. **refund** - Refund points
9. **reversal** - Reverse a transaction

## Reputation Requirements

Different transaction types have different reputation requirements:

| Transaction Type | Base Min Score | High Amount (>10k) |
|-----------------|----------------|-------------------|
| transfer        | 50             | 70                |
| earn            | 40             | 40                |
| spend           | 60             | 60                |
| mint            | 80             | 80                |
| burn            | 30             | 30                |
| hold            | 50             | 50                |
| capture         | 65             | 65                |
| refund          | 45             | 45                |
| reversal        | 90             | 90                |

## License

MIT

## Repository

[https://github.com/projnanda/nanda-payments](https://github.com/projnanda/nanda-payments)
