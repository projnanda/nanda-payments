/* eslint-disable no-console */
import WebSocket from "ws";

// --- Config -----------------------------------------------------------------
const BASE = process.env.BASE_URL || "http://localhost:3000";

// DIDs and (optional) facts URLs for the two demo agents
const A_DID = process.env.A_DID || "did:nanda:demoA";
const B_DID = process.env.B_DID || "did:nanda:demoB";
const A_FACTS = process.env.A_FACTS || "https://list39.org/@demoA.json";
const B_FACTS = process.env.B_FACTS || "https://list39.org/@demoB.json";

// amount in minor units (scale=3 → milli-points). 2500 = 2.500 NP
const AMOUNT = Number(process.env.AMOUNT_MINOR || 2500);

// how long to wait for the tx.posted websocket event (ms)
const WS_TIMEOUT_MS = Number(process.env.WS_TIMEOUT_MS || 5000);

// --- Helpers ----------------------------------------------------------------
async function jpost<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${path} → HTTP ${res.status} ${res.statusText} :: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function jget<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${path} → HTTP ${res.status} ${res.statusText} :: ${text}`);
  }
  return res.json() as Promise<T>;
}

function fmtNP(minor: number, scale = 3) {
  const s = Math.pow(10, scale);
  return (minor / s).toFixed(scale) + " NP";
}

function checkmark(ok = true) {
  return ok ? "✓" : "✗";
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function waitForServer(retries = 20, delay = 250) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) {
        const j = await res.json().catch(() => ({} as any));
        console.log(`Server OK at ${BASE} (mongo=${(j as any).mongo ?? "?"})`);
        return;
      }
    } catch {}
    if (i === 0) console.log(`Waiting for API at ${BASE} ...`);
    await sleep(delay);
  }
  throw new Error(`Could not reach API at ${BASE}. Is it running? Try: PORT=6331 npm run dev`);
}

// --- Types (partial) --------------------------------------------------------
type Wallet = { _id: string; agentDid: string; balance: number; scale: number };
type Tx = { _id: string; type: string; reasonCode: string; amount: { value: number; scale: number } };
type Invoice = { 
  _id: string; 
  invoiceNumber: string;
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  amount: { value: number; scale: number };
  issuer: { did: string; walletId: string };
  payer?: { did: string; walletId: string };
};
type ReputationRequest = {
  agentDid: string;
  encryptedScore: string;
  signature: string;
};
type ReputationResponse = {
  agentDid: string;
  score: number;
  validationResult: boolean;
};
type TransactionEvent = {
  type: 'tx.posted' | 'tx.completed';
  txId: string;
  invoiceId?: string;
  reputationValidation?: {
    requesterDid: string;
    providerDid: string;
    score: number;
    validated: boolean;
  };
};

// --- Demo Flow --------------------------------------------------------------
async function ensureAgent(did: string, agentName: string, primaryFactsUrl?: string) {
  // 1) Try to fetch existing agent
  try {
    const existing = await jget(`/agents/${encodeURIComponent(did)}`);
    console.log(`  ${checkmark()} agent exists: ${did}`);
    return existing;
  } catch (e) {
    // not found or GET failed — fall through to create
  }

  // 2) Create/upsert via the resolver endpoint (more permissive)
  try {
    const created = await jpost(`/agents/resolve`, { did, agentName, primaryFactsUrl });
    console.log(`  ${checkmark()} agent created via /agents/resolve: ${did}`);
    return created;
  } catch (e: any) {
    console.error(`  ${checkmark(false)} failed to create agent ${did}:`, e?.message || e);
    throw e;
  }
}

async function createWallet(did: string): Promise<Wallet> {
  const w = await jpost<Wallet>(`/wallets`, { did });
  console.log(`  ${checkmark()} wallet created for ${did}: ${w._id}`);
  return w;
}

async function attachWallet(did: string, walletId: string, extras?: Record<string, any>) {
  const payload = {
    did,
    payments: {
      accepts: ["earn", "transfer", "spend"],
      ttl: 3600,
      ...(extras || {}),
    },
  };
  const out = await jpost(`/wallets/${walletId}/attach`, payload);
  console.log(`  ${checkmark()} wallet attached to agent ${did}`);
  return out;
}

async function getWallet(walletId: string): Promise<Wallet> {
  return jget<Wallet>(`/wallets/${walletId}`);
}

async function mintIfNeeded(walletId: string, did: string, need: number) {
  const w = await getWallet(walletId);
  if (w.balance >= need) return;

  const topup = Math.max(need - w.balance, 100000); // at least 100.000 NP in minor units
  const idem = `demo:mint:${did}:${Date.now()}`;

  await jpost<Tx>(`/transactions`, {
    type: "mint",
    sourceWalletId: null,
    destWalletId: walletId,
    amount: { currency: "NP", scale: 3, value: topup },
    reasonCode: "DEMO_TOPUP",
    idempotencyKey: idem,
    actor: { type: "system", did, walletId },
    facts: { to: { did } },
    metadata: { memo: "auto top-up for demo" },
  });

  console.log(`  ${checkmark()} top-up minted to ${did}: +${fmtNP(topup)}`);
}

async function createInvoice(issuerDid: string, issuerWalletId: string, payerDid: string, amountMinor: number): Promise<Invoice> {
  const invoice = await jpost<Invoice>('/invoices', {
    issuer: { did: issuerDid, walletId: issuerWalletId },
    recipient: { did: payerDid }, // Changed from payer to recipient to match API schema
    amount: { currency: "NP", scale: 3, value: amountMinor },
    paymentTerms: {
      acceptPartial: false,
      allowOverpayment: false
    },
    metadata: { demo: true }
  });
  console.log(`  ${checkmark()} invoice created: ${invoice.invoiceNumber}`);
  return invoice;
}

async function issueInvoice(invoiceId: string): Promise<Invoice> {
  const invoice = await jpost<Invoice>(`/invoices/${invoiceId}/issue`, {});
  console.log(`  ${checkmark()} invoice issued: ${invoice.invoiceNumber}`);
  return invoice;
}

async function getReputationScore(agentDid: string): Promise<ReputationResponse> {
  // In real implementation, this would talk to the Reputation Verifier service
  const mockResponse: ReputationResponse = {
    agentDid,
    score: 95, // Mock score between 0-100
    validationResult: true
  };
  console.log(`  ${checkmark()} reputation validated for ${agentDid}: score=${mockResponse.score}`);
  return mockResponse;
}

async function initiatePayment(invoice: Invoice, payerWalletId: string, repScore: ReputationResponse): Promise<Tx> {
  const idem = `demo:invoice-payment:${invoice._id}:${Date.now()}`;
  return jpost<Tx>(`/invoices/${invoice._id}/pay`, {
    amount: invoice.amount.value,
    walletId: payerWalletId,
    idempotencyKey: idem,
    reputationScore: repScore.score,
    reputationValidation: repScore.validationResult
  });
}

async function transfer(fromWalletId: string, toWalletId: string, fromDid: string, toDid: string, amountMinor: number) {
  // This is kept for backward compatibility, prefer using invoice-based payments
  const idem = `demo:transfer:${fromDid}->${toDid}:${Date.now()}`;
  return jpost<Tx>(`/transactions`, {
    type: "transfer",
    sourceWalletId: fromWalletId,
    destWalletId: toWalletId,
    amount: { currency: "NP", scale: 3, value: amountMinor },
    reasonCode: "TASK_PAYOUT",
    idempotencyKey: idem,
    actor: { type: "agent", did: fromDid, walletId: fromWalletId },
    facts: { from: { did: fromDid }, to: { did: toDid } },
  });
}

function listenForTxPosted(expectedTxId: string): Promise<TransactionEvent> {
  return new Promise((resolve) => {
    const ws = new WebSocket(BASE.replace(/^http/, "ws") + "/events");
    const timeout = setTimeout(() => {
      console.log("  (ws timeout) no event received in time, continuing…");
      try { ws.close(); } catch {}
      resolve({
        type: 'tx.posted',
        txId: expectedTxId
      });
    }, WS_TIMEOUT_MS);

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg?.type === "tx.posted") {
          // If filtering by txId, only resolve when it matches; otherwise show the first
          if (!expectedTxId || msg.txId === expectedTxId) {
            clearTimeout(timeout);
            console.log(`\n🛰  tx.posted received: ${msg.txId}`);
            console.log(msg);
            try { ws.close(); } catch {}
            resolve(msg);
          }
        }
      } catch {}
    });

    ws.on("open", () => console.log("  (ws connected)"));
    ws.on("error", (err) => {
      console.log("  (ws error)", err.message);
    });
  });
}

async function main() {
  console.log("\n=== NANDA Points Service Demo with Reputation System ===\n");
  await waitForServer();

  // Phase 1: Service Discovery & Usage
  console.log("Phase 1: Service Discovery & Usage");
  console.log("1) Register agents");
  await ensureAgent(A_DID, "Demo Agent A (Requester)", A_FACTS);
  await ensureAgent(B_DID, "Demo Agent B (Provider/MCP Server)", B_FACTS);

  console.log("\n2) Create wallets");
  const A_WALLET = (await createWallet(A_DID))._id;
  const B_WALLET = (await createWallet(B_DID))._id;

  console.log("\n3) Attach wallets to agents");
  await attachWallet(A_DID, A_WALLET, { 
    payments: {
      accepts: ["earn", "transfer", "spend"],
      ttl: 3600,
      eventsWebhook: `http://localhost:3000/events/by-agent/${encodeURIComponent(A_DID)}`
    }
  });
  await attachWallet(B_DID, B_WALLET, { 
    payments: {
      accepts: ["earn", "transfer", "spend"],
      ttl: 3600,
      eventsWebhook: `http://localhost:3000/events/by-agent/${encodeURIComponent(B_DID)}`
    }
  });

  // Phase 2: Invoice & Reputation Verification
  console.log("\nPhase 2: Invoice & Reputation Verification");
  // Create and expose invoice
  const invoice = await createInvoice(B_DID, B_WALLET, A_DID, AMOUNT);
  const issuedInvoice = await issueInvoice(invoice._id);

  // Check initial balances
  console.log("\n4) Balances BEFORE payment");
  const aBefore = await getWallet(A_WALLET);
  const bBefore = await getWallet(B_WALLET);
  console.table([
    { wallet: "A (requester)", id: A_WALLET, did: A_DID, balance: fmtNP(aBefore.balance, aBefore.scale) },
    { wallet: "B (provider)", id: B_WALLET, did: B_DID, balance: fmtNP(bBefore.balance, bBefore.scale) },
  ]);

  // Ensure we have enough to pay
  await mintIfNeeded(A_WALLET, A_DID, AMOUNT);

  // Get and verify reputation
  console.log("\n5) Reputation Verification");
  const repScore = await getReputationScore(B_DID);
  
  // Phase 3: Transaction Completion
  console.log("\nPhase 3: Transaction Completion");
  console.log("6) Process Payment");
  // Open WebSocket for events
  const txP = initiatePayment(issuedInvoice, A_WALLET, repScore);
  const tx = await txP;
  const wsEventP = listenForTxPosted(tx._id);

  // Wait for event and check final balances
  await wsEventP;

  console.log("\n7) Balances AFTER payment");
  const aAfter = await getWallet(A_WALLET);
  const bAfter = await getWallet(B_WALLET);
  console.table([
    { wallet: "A (requester)", id: A_WALLET, did: A_DID, balance: fmtNP(aAfter.balance, aAfter.scale) },
    { wallet: "B (provider)", id: B_WALLET, did: B_DID, balance: fmtNP(bAfter.balance, bAfter.scale) },
  ]);

  // ASCII visualization with reputation score
  const deltaA = aBefore.balance - aAfter.balance;
  const deltaB = bAfter.balance - bBefore.balance;
  console.log("\n8) Visualization");
  console.log("────────────────────────────────────────────────────────────");
  console.log(` ${A_DID} (Requester)`);
  console.log(`    ${fmtNP(aBefore.balance)}  --[ ${fmtNP(AMOUNT)} ]-->  ${fmtNP(aAfter.balance)}`);
  console.log("                              |");
  console.log(`                 Reputation: ${repScore.score}/100`);
  console.log(`                              V`);
  console.log(` ${B_DID} (Provider)`);
  console.log(`    ${fmtNP(bBefore.balance)}  <--[ ${fmtNP(deltaB)} ]--  ${fmtNP(bAfter.balance)}`);
  console.log("────────────────────────────────────────────────────────────");
  console.log(`Invoice: ${issuedInvoice.invoiceNumber} | Status: ${issuedInvoice.status}`);
  console.log("────────────────────────────────────────────────────────────\n");

  console.log(`${checkmark()} Payment complete (txId=${tx._id})`);
}

main().catch((e) => {
  console.error("Demo failed:", e);
  process.exit(1);
});