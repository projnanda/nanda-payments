# Nanda Points API Documentation

This API provides endpoints for the UI teams to access wallet, transaction, and receipt information from the MongoDB backend.

## Base URL

-   Development: `http://localhost:8080/api`
-   Production: `http://your-domain:8080/api`

## Running the API Server

```bash
# Install dependencies
npm install

# Start the API server
npm run api:server
```

## Endpoints

### Wallets

#### Get Wallet by Agent Name

-   **GET** `/wallets/agent/:agentName`
-   **Description**: Retrieves wallet information by agent name
-   **Parameters**:
    -   `agentName` (string): The name of the agent
-   **Response**: Wallet object or 404 if not found

#### Get All Wallets

-   **GET** `/wallets`
-   **Description**: Retrieves all wallets in the system
-   **Response**: Array of wallet objects

#### Get Wallet by Wallet ID

-   **GET** `/wallets/id/:walletId`
-   **Description**: Retrieves wallet information by wallet ID
-   **Parameters**:
    -   `walletId` (string): The unique wallet identifier
-   **Response**: Wallet object or 404 if not found

### Transactions

#### Get All Transactions

-   **GET** `/transactions`
-   **Description**: Retrieves all transactions in the system
-   **Response**: Array of transaction objects

#### Get Transactions by Agent Name

-   **GET** `/transactions/agent/:agentName`
-   **Description**: Retrieves all transactions (sent and received) for a specific agent
-   **Parameters**:
    -   `agentName` (string): The name of the agent
-   **Response**: Array of transaction objects

#### Get Transaction by Transaction ID

-   **GET** `/transactions/id/:txId`
-   **Description**: Retrieves a specific transaction by its transaction ID
-   **Parameters**:
    -   `txId` (string): The unique transaction identifier
-   **Response**: Transaction object or 404 if not found

### Receipts

#### Get All Receipts

-   **GET** `/receipts`
-   **Description**: Retrieves all receipts in the system
-   **Response**: Array of receipt objects

#### Get Receipts by Agent Name

-   **GET** `/receipts/agent/:agentName`
-   **Description**: Retrieves all receipts (sent and received) for a specific agent
-   **Parameters**:
    -   `agentName` (string): The name of the agent
-   **Response**: Array of receipt objects

#### Get Receipt by Receipt ID

-   **GET** `/receipts/id/:id`
-   **Description**: Retrieves a specific receipt by its MongoDB \_id
-   **Parameters**:
    -   `id` (string): The MongoDB ObjectId of the receipt
-   **Response**: Receipt object or 404 if not found

#### Get Receipt by Transaction ID

-   **GET** `/receipts/transaction/:txId`
-   **Description**: Retrieves a receipt by its associated transaction ID
-   **Parameters**:
    -   `txId` (string): The transaction ID associated with the receipt
-   **Response**: Receipt object or 404 if not found

### Health Check

#### API Health Check

-   **GET** `/health`
-   **Description**: Returns the health status of the API
-   **Response**: `{ "status": "OK", "message": "Nanda Points API is running" }`

## Data Models

### Wallet

```typescript
interface Wallet {
    _id?: ObjectId | string;
    walletId: string;
    agent_name: string;
    balanceMinor: MinorUnits;
    createdAt: string;
    updatedAt: string;
}
```

### Transaction

```typescript
interface Txn {
    _id?: ObjectId | string;
    txId: string;
    fromAgent: string;
    toAgent: string;
    amountMinor: MinorUnits;
    currency: "NP";
    scale: 0;
    createdAt: string;
    status: "completed" | "rejected";
    error?: string | null;
    task: string; // Task that the transaction was completed for
}
```

### Receipt

```typescript
interface Receipt {
    _id?: ObjectId | string;
    txId: string;
    issuedAt: string;
    fromAgent: string;
    toAgent: string;
    amountMinor: MinorUnits;
    fromBalanceAfter: MinorUnits;
    toBalanceAfter: MinorUnits;
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:

-   `200`: Success
-   `404`: Resource not found
-   `500`: Internal server error

Error responses follow this format:

```json
{
    "error": "Error message description"
}
```

## CORS

The API server includes CORS middleware to allow cross-origin requests from UI applications.
