# NANDA Points Service (MVP)

TypeScript + Express + MongoDB (Mongoose) service that implements:

-   Agents, Wallets, Transactions, Events, Idempotency
-   Double-entry postings with integer minor units (scale=3 by default)
-   WebSocket broadcast on `tx.posted`
-   Simple Facts integration fields (DID, Facts URL, webhook URL)
-   Seed script to create treasury + sample agents/wallets + transactions

## Quick Start

1. Install deps

```bash
npm i
```

2. Start MongoDB (transactions require a replica set in production; dev works without full ACID across both wallets)

```bash
# local dev (no replica set): OK for testing
mongod --dbpath /your/db/path
```

3. Copy environment

```bash
cp .env.example .env
```

4. Seed data

```bash
npm run seed
```

5. Start the server (WS on the same port)

```bash
npm run dev
```

## API (v0)

-   `POST /agents/resolve` — upsert agent with Facts snippet (DID, primaryFactsUrl, payments block)
-   `POST /wallets` — create wallet for DID; optional welcome grant (env `WELCOME_GRANT`)
-   `GET /wallets/:walletId` — get wallet info
-   `POST /transactions` — create balanced tx (transfer/earn/spend/mint/burn)
-   `POST /transactions/with-reputation` — create transaction with reputation verification
-   `GET /transactions/:txId`
-   `GET /transactions?walletId=...` — paginated
-   `GET /transactions/:txId/reputation` — get transaction reputation info
-   `GET /events/by-agent/:did` — get events for an agent
-   `GET /events` — list all events with filtering
-   `POST /invoices` — create new invoice
-   `POST /invoices/:invoiceId/issue` — issue draft invoice
-   `POST /invoices/:invoiceId/pay` — pay an invoice
-   WebSocket `/events` — broadcasts transaction and invoice events

See [API Guide](src/api/apiGuide.md) for complete documentation.

## Notes

-   This MVP uses best-effort atomicity (two-phase updates). For strict ACID across wallets, run a Mongo **replica set** and enable Mongoose sessions with `withTransaction`.
-   All amounts are integers in minor units (milli-points if scale=3).
-   No overdrafts are allowed unless wallet policy changes.

## Structure

```
src/
  api/
    agents.ts
    events.ts
    health.ts
    index.ts
    invoices.ts
    reputationTransactions.ts
    transactions.ts
    wallets.ts
    apiGuide.md
  lib/
    eventBus.ts
  models/
    Agent.ts
    Wallet.ts
    Transaction.ts
    Event.ts
    Invoice.ts
    Idempotency.ts
    WalletLinkNonce.ts
    constants.ts
    index.ts
  services/
    transactionEngine.ts
    reputationManager.ts
  server.ts
  seed.ts
  demo.ts
schemas/
  agents.json
  events.json
  transactions.json
  wallets.json
```
