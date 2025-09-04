import "dotenv/config";
import mongoose from "mongoose";
import { AgentModel, WalletModel } from "./models/index.js";
import { createTransaction } from "./services/transactionEngine.js";

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/nanda_points";

async function run() {
  await mongoose.connect(MONGO_URL);
  console.log("[seed] connected");
  
  await mongoose.connection.dropDatabase();
  console.log("[seed] database dropped");

  // Clean (dev only)
  await Promise.all([
    mongoose.connection.collection("transactions").deleteMany({}),
    mongoose.connection.collection("wallets").deleteMany({}),
    mongoose.connection.collection("agents").deleteMany({}),
    mongoose.connection.collection("events").deleteMany({}),
    mongoose.connection.collection("idempotency_keys").deleteMany({})
  ]);
  console.log("[seed] cleared");

  // Create agents
  const rahul = await AgentModel.create({
    did: "did:nanda:rahul",
    agentName: "Rahul Agent",
    label: "Rahul",
    primaryFactsUrl: "https://list39.org/@rahul.json",
    payments: { np: { walletId: "pending", eventsWebhook: "https://rahul-agent.local/nanda/events", walletProofVerified: true } },
    status: "active"
  });

  const sree = await AgentModel.create({
    did: "did:nanda:sree",
    agentName: "Sree Agent",
    label: "Sree",
    primaryFactsUrl: "https://list39.org/@sree.json",
    payments: { np: { walletId: "pending", eventsWebhook: "https://sree-agent.local/nanda/events", walletProofVerified: true } },
    status: "active"
  });

  // Create wallets
  const treasury = await WalletModel.create({ agentDid: "did:nanda:treasury", type: "treasury", balance: 10_000_000, scale: 3 });
  const wRahul = await WalletModel.create({ agentDid: rahul.did, type: "user", scale: 3, labels: ["default","receive"] });
  const wSree  = await WalletModel.create({ agentDid: sree.did, type: "user", scale: 3, labels: ["default","receive"] });

  // Update payments.np.walletId to the actual wallet ids
  await AgentModel.updateOne({ did: rahul.did }, { $set: { "payments.np.walletId": wRahul._id.toString() } });
  await AgentModel.updateOne({ did: sree.did },  { $set: { "payments.np.walletId": wSree._id.toString() } });

  console.log("[seed] treasury:", treasury._id.toString());
  console.log("[seed] rahul wallet:", wRahul._id.toString());
  console.log("[seed] sree  wallet:", wSree._id.toString());

  console.log("[seed] mint: Rahul +100.000 NP");
  await createTransaction({
    type: "mint",
    sourceWalletId: null,
    destWalletId: wRahul._id.toString(),
    amountValue: 100000,               // 100.000 NP in milli-points
    reasonCode: "SEED_GRANT",
    idempotencyKey: "seed:mint:rahul:100k",
    actor: { type: "system", did: rahul.did, walletId: wRahul._id.toString() },
    facts: { to: { did: rahul.did } },
    metadata: { memo: "Seed grant for Rahul" }
  });

  // Demo: Rahul pays Sree 2.500 NP
  const tx = await createTransaction({
    type: "transfer",
    sourceWalletId: wRahul._id.toString(),
    destWalletId: wSree._id.toString(),
    amountValue: 2500,
    reasonCode: "TASK_PAYOUT",
    idempotencyKey: "seed:rahul->sree:1",
    actor: { type: "agent", did: rahul.did, walletId: wRahul._id.toString() },
    facts: { from: { did: rahul.did }, to: { did: sree.did } },
    metadata: { memo: "Seed demo payment" }
  });
  console.log("[seed] demo tx:", tx._id.toString());

  console.log("[seed] done.");
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
