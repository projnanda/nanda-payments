# NANDA Points Service (MVP)

TypeScript + Express + MongoDB (Mongoose) service that implements:
- Agents, Wallets, Transactions, Events, Idempotency
- Double-entry postings with integer minor units (scale=3 by default)
- WebSocket broadcast on `tx.posted`
- Simple Facts integration fields (DID, Facts URL, webhook URL)
- Seed script to create treasury + sample agents/wallets + transactions

## Quick Start

1) Install deps
```bash
npm i
```

2) Start MongoDB (transactions require a replica set in production; dev works without full ACID across both wallets)
```bash
# local dev (no replica set): OK for testing
mongod --dbpath /your/db/path
```

3) Copy environment
```bash
cp .env.example .env
```

4) Seed data
```bash
npm run seed
```

5) Start the server (WS on the same port)
```bash
npm run dev
```

## API (v0)
- `POST /agents/resolve` — upsert agent with Facts snippet (DID, primaryFactsUrl, payments block)
- `POST /wallets` — create wallet for DID; optional welcome grant (env `WELCOME_GRANT`)
- `GET /wallets/:walletId` — get wallet info
- `POST /transactions` — create balanced tx (transfer/earn/spend/mint/burn)
- `GET /transactions/:txId`
- `GET /transactions?walletId=...` — paginated
- WebSocket `/events` — broadcasts `tx.posted` events

## Notes
- This MVP uses best-effort atomicity (two-phase updates). For strict ACID across wallets, run a Mongo **replica set** and enable Mongoose sessions with `withTransaction`.
- All amounts are integers in minor units (milli-points if scale=3).
- No overdrafts are allowed unless wallet policy changes.


## Structure
```
src/
  api/
    agents.ts
    wallets.ts
    transactions.ts
    health.ts
    index.ts
  lib/
    eventBus.ts
  models/
    Agent.ts
    Wallet.ts
    Transaction.ts
    Event.ts
    Idempotency.ts
    constants.ts
    index.ts
  services/
    transactionEngine.ts
  server.ts
  seed.ts
```
