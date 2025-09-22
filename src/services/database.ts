import { Collection } from "mongodb";
import { client, db, initMongo as initMongoShared, closeMongo as closeMongoShared } from "../utils/mongo.js";
import { AgentFacts, Wallet, Txn, Receipt } from "../models/index.js";

let Agents: Collection<AgentFacts>;
let Wallets: Collection<Wallet>;
let Transactions: Collection<Txn>;
let Receipts: Collection<Receipt>;

export async function initMongo() {
  await initMongoShared();
  Agents = db.collection<AgentFacts>("agents");
  Wallets = db.collection<Wallet>("wallets");
  Transactions = db.collection<Txn>("transactions");
  Receipts = db.collection<Receipt>("receipts");

  await Promise.all([
    Agents.createIndex({ agent_name: 1 }, { unique: true }),
    Agents.createIndex({ walletId: 1 }, { unique: true, sparse: true }),
    Wallets.createIndex({ walletId: 1 }, { unique: true }),
    Wallets.createIndex({ agent_name: 1 }, { unique: true }),
    Transactions.createIndex({ txId: 1 }, { unique: true }),
    Receipts.createIndex({ txId: 1 }, { unique: true }),
  ]);
}

export async function closeMongo() {
  await closeMongoShared();
}

export { Agents, Wallets, Transactions, Receipts };
