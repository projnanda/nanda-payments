# API Documentation

## Table of Contents

-   [Agents API](#agents-api)
-   [Transactions API](#transactions-api)
-   [Wallets API](#wallets-api)

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
