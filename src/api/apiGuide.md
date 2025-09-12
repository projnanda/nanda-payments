# API Documentation

## Table of Contents

-   [Agents API](#agents-api)
-   [Transactions API](#transactions-api)
-   [Wallets API](#wallets-api)
-   [Events API](#events-api)
-   [Invoices API](#invoices-api)
-   [Reputation Transactions API](#reputation-transactions-api)

## Agents API

### Resolve Agent

-   **POST** `/agents/resolve`
-   **Description**: Creates or updates an agent with the provided DID.

**Request Body:**

```json
{
  "did": "string",
  "primaryFactsUrl": "string" (optional),
  "agentName": "string" (optional),
  "label": "string" (optional),
  "payments": {
    "np": {
      "walletId": "string",
      "scale": "number" (optional),
      "receiveEndpoint": "string" (optional),
      "invoiceEndpoint": "string" (optional),
      "eventsWebhook": "string" (optional),
      "accepts": "string[]" (optional),
      "minAmount": "number" (optional),
      "ttl": "number" (optional),
      "walletProofVerified": "boolean" (optional)
    }
  } (optional),
  "facts": "any" (optional),
  "status": "active" | "suspended" | "expired" (optional)
}
```

**Response:** Agent object

### Create Agent

-   **POST** `/agents`
-   **Description**: Creates a new agent.

**Request Body:**

```json
{
  "did": "string",
  "agentName": "string" (optional),
  "label": "string" (optional),
  "primaryFactsUrl": "string" (optional),
  "payments": {
    "np": {
      "walletId": "string" (optional),
      "scale": "number" (optional),
      "receiveEndpoint": "string" (optional),
      "invoiceEndpoint": "string" (optional),
      "eventsWebhook": "string" (optional),
      "accepts": "string[]" (optional),
      "minAmount": "number" (optional),
      "ttl": "number" (optional),
      "walletProofVerified": "boolean" (optional)
    }
  } (optional),
  "facts": "any" (optional),
  "status": "active" | "suspended" | "expired" (optional)
}
```

**Response:**

-   Success (201): Agent object
-   Error (409): If DID already exists
-   Error (400): For validation errors

### List Agents

-   **GET** `/agents`
-   **Description**: Retrieves a list of agents.

**Query Parameters:**

-   `did`: Filter by DID (optional)
-   `q`: Search query for agentName, label, or DID (optional)
-   `limit`: Number of results (default: 50)
-   `after`: Pagination cursor (optional)

**Response:** Array of agent objects

### Get Agent by DID

-   **GET** `/agents/:did`
-   **Description**: Retrieves an agent by their DID.

**Response:**

-   Success (200): Agent object
-   Error (404): If agent not found

### Update Agent

-   **PATCH** `/agents/:did`
-   **Description**: Updates an existing agent.

**Request Body:**

```json
{
  "agentName": "string" (optional),
  "label": "string" (optional),
  "primaryFactsUrl": "string" (optional),
  "payments": {
    "np": {
      "walletId": "string" (optional),
      "scale": "number" (optional),
      "receiveEndpoint": "string" (optional),
      "invoiceEndpoint": "string" (optional),
      "eventsWebhook": "string" (optional),
      "accepts": "string[]" (optional),
      "minAmount": "number" (optional),
      "ttl": "number" (optional),
      "walletProofVerified": "boolean" (optional)
    }
  } (optional),
  "facts": "any" (optional),
  "status": "active" | "suspended" | "expired" (optional)
}
```

**Response:**

-   Success (200): Updated agent object
-   Error (404): If agent not found
-   Error (400): For validation errors

### Delete Agent

-   **DELETE** `/agents/:did`
-   **Description**: Deletes an agent and optionally their associated wallets.

**Query Parameters:**

-   `force`: Boolean to force delete agent and associated wallets (optional)

**Response:**

-   Success (200): `{ ok: true, deletedAgent: number, deletedWallets: number }`
-   Error (409): If agent has wallets and force is false
-   Error (404): If agent not found

## Transactions API

### Create Transaction

-   **POST** `/transactions`
-   **Description**: Creates a new transaction.

**Request Body:**

```json
{
  "type": "mint" | "burn" | "transfer" | "earn" | "spend" | "hold" | "capture" | "refund" | "reversal",
  "sourceWalletId": "string" (optional),
  "destWalletId": "string" (optional),
  "amount": {
    "currency": "string",
    "scale": "number",
    "value": "number"
  },
  "reasonCode": "string",
  "idempotencyKey": "string",
  "actor": {
    "type": "agent" | "system",
    "did": "string" (optional),
    "walletId": "string" (optional)
  } (optional),
  "facts": {
    "ttlSec": "number" (optional),
    "from": {
      "did": "string" (optional),
      "primaryFactsUrl": "string" (optional),
      "vcStatusUrl": "string" (optional),
      "factsDigest": "string" (optional),
      "eventsWebhook": "string" (optional),
      "endpointClass": "static" | "adaptive" | "rotating" (optional)
    } (optional),
    "to": {
      "did": "string" (optional),
      "primaryFactsUrl": "string" (optional),
      "vcStatusUrl": "string" (optional),
      "factsDigest": "string" (optional),
      "eventsWebhook": "string" (optional),
      "endpointClass": "static" | "adaptive" | "rotating" (optional)
    } (optional)
  } (optional),
  "metadata": "any" (optional)
}
```

**Response:**

-   Success (201): Transaction object
-   Success (200): Existing transaction if idempotencyKey exists
-   Error (400): For validation errors

### Get Transaction

-   **GET** `/transactions/:txId`
-   **Description**: Retrieves a transaction by ID.

**Response:**

-   Success (200): Transaction object
-   Error (404): If transaction not found

### List Transactions

-   **GET** `/transactions`
-   **Description**: Retrieves a list of transactions.

**Query Parameters:**

-   `walletId`: Filter by wallet ID (optional)
-   `limit`: Number of results (default: 50)
-   `after`: Pagination cursor (optional)

**Response:** Array of transaction objects

## Wallets API

### Create Wallet

-   **POST** `/wallets`
-   **Description**: Creates a new wallet and optionally applies a welcome grant.

**Request Body:**

```json
{
  "did": "string",
  "type": "user" | "treasury" | "fee_pool" | "escrow" (default: "user"),
  "labels": "string[]" (optional)
}
```

**Response:**

-   Success (201): Wallet object
-   Error (404): If agent not found

### Attach Wallet

-   **POST** `/wallets/:walletId/attach`
-   **Description**: Attaches an existing wallet to an agent.

**Request Body:**

```json
{
  "did": "string",
  "force": "boolean" (optional),
  "payments": {
    "scale": "number" (optional),
    "receiveEndpoint": "string" (optional),
    "invoiceEndpoint": "string" (optional),
    "eventsWebhook": "string" (optional),
    "accepts": "string[]" (optional),
    "minAmount": "number" (optional),
    "ttl": "number" (optional)
  } (optional)
}
```

**Response:**

-   Success (200): `{ ok: true, agent: AgentObject }`
-   Error (404): If agent or wallet not found
-   Error (403): If wallet ownership mismatch

### Detach Wallet

-   **POST** `/wallets/:walletId/detach`
-   **Description**: Detaches a wallet from an agent.

**Request Body:**

```json
{
  "did": "string",
  "force": "boolean" (optional)
}
```

**Response:**

-   Success (200): `{ ok: true, agent: AgentObject }`
-   Error (404): If agent or wallet not found
-   Error (403): If wallet ownership mismatch
-   Error (409): If agent linked to different wallet

### Get Wallet

-   **GET** `/wallets/:walletId`
-   **Description**: Retrieves a wallet by ID.

**Response:**

-   Success (200): Wallet object
-   Error (404): If wallet not found

### List Wallets

-   **GET** `/wallets`
-   **Description**: Retrieves a list of wallets.

**Query Parameters:**

-   `did`: Filter by agent DID (optional)

**Response:** Array of wallet objects

## Events API

### Get Events by Agent DID

-   **GET** `/events/by-agent/:did`
-   **Description**: Retrieves events related to a specific agent.

**Query Parameters:**

-   `limit`: Number of results (default: 50)
-   `after`: Pagination cursor (optional)
-   `type`: Filter by event type (optional)

**Response:**

-   Success (200): `{ events: Event[], pagination: { limit: number, hasMore: boolean, nextCursor: string | null } }`
-   Error (500): For server errors

### Get Event by ID

-   **GET** `/events/:eventId`
-   **Description**: Retrieves a specific event by ID.

**Response:**

-   Success (200): Event object
-   Error (404): If event not found
-   Error (500): For server errors

### List Events

-   **GET** `/events`
-   **Description**: Retrieves a list of events with filtering options.

**Query Parameters:**

-   `type`: Filter by event type (optional)
-   `did`: Filter by agent DID (optional)
-   `walletId`: Filter by wallet ID (optional)
-   `startDate`: Filter events after this date (optional)
-   `endDate`: Filter events before this date (optional)
-   `limit`: Number of results (default: 50)
-   `after`: Pagination cursor (optional)

**Response:**

-   Success (200): `{ events: Event[], pagination: { limit: number, hasMore: boolean, nextCursor: string | null } }`
-   Error (500): For server errors

## Invoices API

### Create Invoice

-   **POST** `/invoices`
-   **Description**: Creates a new invoice.

**Request Body:**

```json
{
  "amount": {
    "value": "number",
    "currency": "string" (optional),
    "scale": "number" (optional)
  },
  "issuer": {
    "did": "string",
    "walletId": "string"
  },
  "recipient": {
    "did": "string",
    "walletId": "string" (optional)
  },
  "paymentTerms": {
    "dueDate": "string" (optional),
    "acceptPartial": "boolean" (optional),
    "minAmount": "number" (optional),
    "allowOverpayment": "boolean" (optional),
    "maxAmount": "number" (optional)
  } (optional),
  "metadata": {
    "memo": "string" (optional),
    "description": "string" (optional),
    "items": [
      {
        "description": "string",
        "quantity": "number",
        "unitPrice": "number",
        "amount": "number"
      }
    ] (optional),
    "tags": "string[]" (optional),
    "externalRef": "string" (optional)
  } (optional)
}
```

**Response:**

-   Success (201): Invoice object
-   Error (404): If issuer or recipient not found
-   Error (400): For validation errors

### Issue Invoice

-   **POST** `/invoices/:invoiceId/issue`
-   **Description**: Changes invoice status from draft to issued.

**Response:**

-   Success (200): Updated invoice object
-   Error (404): If invoice not found
-   Error (422): If invoice is not in draft status

### Cancel Invoice

-   **POST** `/invoices/:invoiceId/cancel`
-   **Description**: Cancels an invoice.

**Response:**

-   Success (200): Updated invoice object
-   Error (404): If invoice not found
-   Error (422): If invoice is paid or already cancelled

### Get Invoice

-   **GET** `/invoices/:invoiceId`
-   **Description**: Retrieves an invoice by ID.

**Response:**

-   Success (200): Invoice object
-   Error (404): If invoice not found

### List Invoices

-   **GET** `/invoices`
-   **Description**: Retrieves a list of invoices.

**Query Parameters:**

-   `status`: Filter by status (optional)
-   `issuerDid`: Filter by issuer DID (optional)
-   `recipientDid`: Filter by recipient DID (optional)
-   `limit`: Number of results (default: 50)
-   `after`: Pagination cursor (optional)

**Response:**

-   Success (200): Array of invoice objects

### Pay Invoice

-   **POST** `/invoices/:invoiceId/pay`
-   **Description**: Makes a payment towards an invoice.

**Request Body:**

```json
{
    "amount": "number",
    "walletId": "string",
    "idempotencyKey": "string"
}
```

**Response:**

-   Success (200): Updated invoice object
-   Error (404): If invoice or wallet not found
-   Error (422): For payment validation errors
-   Error (402): For insufficient funds

### Notify Invoice

-   **POST** `/invoices/:did/notify`
-   **Description**: Notifies a recipient agent about an invoice. Used by providers to push invoice notifications to recipients.

**Request Body:**

```json
{
    "invoiceId": "string",
    "issuerDid": "string",
    "recipientDid": "string",
    "amount": {
        "value": "number",
        "currency": "string" (optional),
        "scale": "number" (optional)
    }
}
```

**Response:**

-   Success (200): `{ ok: true, message: string, invoiceId: string }`
-   Error (400): If recipient DID doesn't match route parameter
-   Error (404): If invoice not found
-   Error (422): If invoice is not in issued state
-   Error (403): If issuer DID doesn't match invoice issuer

## Reputation Transactions API

### Create Transaction with Reputation

-   **POST** `/transactions/with-reputation`
-   **Description**: Creates a new transaction with reputation verification.

**Request Body:**

```json
{
  "type": "mint" | "burn" | "transfer" | "earn" | "spend" | "hold" | "capture" | "refund" | "reversal",
  "sourceWalletId": "string" (optional),
  "destWalletId": "string" (optional),
  "amount": {
    "currency": "string",
    "scale": "number",
    "value": "number"
  },
  "reasonCode": "string",
  "idempotencyKey": "string",
  "actor": {
    "type": "agent" | "system",
    "did": "string" (optional),
    "walletId": "string" (optional)
  } (optional),
  "facts": {...} (optional),
  "metadata": "any" (optional),
  "reputationHash": "string" (optional),
  "skipReputationCheck": "boolean" (optional)
}
```

**Response:**

-   Success (201): Transaction object
-   Success (200): Existing transaction if idempotency key exists
-   Error (403): For reputation verification failures
-   Error (400): For validation errors

### Get Reputation Requirements

-   **GET** `/reputation/requirements`
-   **Description**: Gets minimum reputation requirements for different transaction types.

**Query Parameters:**

-   `transactionType`: Type of transaction
-   `amount`: Transaction amount (optional)

**Response:**

-   Success (200): `{ transactionType: string, amount: number, minimumReputationScore: number, description: string }`
-   Error (400): If transaction type is not provided

### Get Transaction Reputation Info

-   **GET** `/transactions/:txId/reputation`
-   **Description**: Gets reputation information for a specific transaction.

**Response:**

-   Success (200): `{ transactionId: string, hasReputationHash: boolean, reputationHash: string, agentDid: string, transactionType: string, amount: number, status: string }`
-   Error (404): If transaction not found
-   Error (500): For server errors

### Start Wallet Link

-   **POST** `/wallets/link`
-   **Description**: Initiates wallet linking process by issuing a nonce.

**Request Body:**

```json
{
  "did": "string",
  "primaryFactsUrl": "string" (optional)
}
```

**Response:**

-   Success (200): `{ nonce: string }`
-   Error (404): If agent not found

### Verify Wallet Link

-   **POST** `/wallets/link/verify`
-   **Description**: Verifies wallet ownership and completes linking process.

**Request Body:**

```json
{
  "did": "string",
  "walletProof": "string" (optional),
  "walletId": "string" (optional),
  "primaryFactsUrl": "string" (optional)
}
```

**Response:**

-   Success (200): `{ ok: true, agent: AgentObject }`
-   Error (404): If agent or wallet not found
-   Error (422): If link not initiated
