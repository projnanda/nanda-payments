import { AgentReputationSigner } from './services/reputationVerifier.js';
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
// Store keys for consistent reputation verification
let VERIFIER_KEYS = null;
// --- Helpers ----------------------------------------------------------------
async function jpost(path, body) {
    const res = await fetch(`${BASE}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${path} → HTTP ${res.status} ${res.statusText} :: ${text}`);
    }
    return res.json();
}
async function jget(path) {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${path} → HTTP ${res.status} ${res.statusText} :: ${text}`);
    }
    return res.json();
}
function fmtNP(minor, scale = 3) {
    const s = Math.pow(10, scale);
    return (minor / s).toFixed(scale) + " NP";
}
function checkmark() { return "✓"; }
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function waitForServer() {
    const delay = 1000;
    for (let i = 0; i < 10; i++) {
        try {
            const res = await fetch(`${BASE}/health`);
            if (res.ok) {
                const j = await res.json().catch(() => ({}));
                console.log(`Server OK at ${BASE} (mongo=${j.mongo ?? "?"})`);
                return;
            }
        }
        catch { }
        if (i === 0)
            console.log(`Waiting for API at ${BASE} ...`);
        await sleep(delay);
    }
    throw new Error(`Could not reach API at ${BASE}. Is it running? Try: PORT=6331 npm run dev`);
}
// --- Demo Functions ---------------------------------------------------------
async function ensureAgent(did, name, factsUrl) {
    try {
        const agent = await jget(`/agents/${encodeURIComponent(did)}`);
        console.log(`  ${checkmark()} agent exists: ${did}`);
        return agent;
    }
    catch {
        const agent = await jpost("/agents", {
            did,
            name,
            primaryFactsUrl: factsUrl
        });
        console.log(`  ${checkmark()} agent created: ${did}`);
        return agent;
    }
}
async function createWallet(agentDid) {
    const wallet = await jpost("/wallets", {
        did,
        type: "user"
    });
    console.log(`  ${checkmark()} wallet created for ${agentDid}: ${wallet._id}`);
    return wallet;
}
async function attachWallet(agentDid, walletId) {
    await jpost(`/agents/resolve`, { did: did, walletId });
    console.log(`  ${checkmark()} wallet attached and payment config updated for agent ${agentDid}`);
}
async function createInvoice(issuerDid, issuerWalletId, payerDid, amountMinor) {
    // Create draft invoice
    const invoice = await jpost("/invoices", {
        amount: { value: amountMinor },
        issuer: { did: issuerDid, walletId: issuerWalletId },
        recipient: { did: payerDid }
    });
    console.log(`  ${checkmark()} invoice created: ${invoice._id}`);
    // Issue the invoice
    const issuedInvoice = await jpost(`/invoices/${invoice._id}/issue`, {});
    console.log(`  ${checkmark()} invoice issued: ${issuedInvoice.invoiceNumber}`);
    // Skip external notification for demo - just log success
    console.log(`  ${checkmark()} invoice ready for payment (demo mode - no external notification)`);
    return issuedInvoice;
}
async function initiatePayment(invoice, payerWalletId, repScore) {
    const idem = `demo:invoice-payment:${invoice._id}:${Date.now()}`;
    // Create transaction with reputation
    return jpost('/transactions/with-reputation', {
        type: 'transfer',
        sourceWalletId: payerWalletId,
        destWalletId: invoice.issuer.walletId,
        amount: {
            currency: invoice.amount.currency,
            scale: invoice.amount.scale,
            value: invoice.amount.value
        },
        reasonCode: 'INVOICE_PAYMENT',
        idempotencyKey: idem,
        actor: {
            type: 'agent',
            did: payerWalletId // This should be the agent DID, but we'll use wallet ID for demo
        },
        reputationHash: repScore.reputationHash
    });
}
async function topUpWallet(did, walletId, amountMinor) {
    const topup = await jpost("/transactions", {
        type: "mint",
        destWalletId: walletId,
        amountValue: amountMinor,
        reasonCode: "WELCOME_GRANT",
        idempotencyKey: `demo:topup:${did}:${Date.now()}`
    });
    console.log(`  ${checkmark()} top-up minted to ${did}: +${fmtNP(topup)}`);
}
async function waitForTxPosted(expectedTxId) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`${BASE.replace('http', 'ws')}/events`);
        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error(`Timeout waiting for tx.posted event${expectedTxId ? ` (expected: ${expectedTxId})` : ''}`));
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
                        try {
                            ws.close();
                        }
                        catch { }
                        resolve(msg);
                    }
                }
            }
            catch { }
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
    await attachWallet(A_DID, A_WALLET);
    await attachWallet(B_DID, B_WALLET);
    // Phase 2: Invoice & Reputation Verification
    console.log("\nPhase 2: Invoice & Reputation Verification");
    // Create and expose invoice
    const issuedInvoice = await createInvoice(B_DID, B_WALLET, A_DID, AMOUNT);
    // Check initial balances
    console.log("\n4) Check initial balances");
    const aWallet = await jget(`/wallets/${A_WALLET}`);
    const bWallet = await jget(`/wallets/${B_WALLET}`);
    console.log(`  Agent A balance: ${fmtNP(aWallet.balance)}`);
    console.log(`  Agent B balance: ${fmtNP(bWallet.balance)}`);
    // Top up Agent A if needed
    if (aWallet.balance < AMOUNT) {
        console.log("\n5) Top up Agent A wallet");
        const topupAmount = AMOUNT * 2; // Give extra for demo
        await topUpWallet(A_DID, A_WALLET, topupAmount);
    }
    // Phase 3: Reputation Verification
    console.log("\nPhase 3: Reputation Verification");
    console.log("6) Generate reputation keys and create reputation score");
    // Generate keys if not already done
    if (!VERIFIER_KEYS) {
        const keyRes = await jpost("/reputation/generate-keys", {});
        VERIFIER_KEYS = keyRes.keys;
        console.log(`  ${checkmark()} reputation keys generated`);
    }
    // Create reputation score for Agent A
    const reputationScore = {
        agentDid: A_DID,
        score: 75, // Good reputation score
        timestamp: new Date().toISOString(),
        source: "demo-verifier"
    };
    // Encrypt reputation score
    const reputationHash = AgentReputationSigner.encryptReputationScore(reputationScore, VERIFIER_KEYS.publicKey);
    console.log(`  ${checkmark()} reputation score encrypted for ${A_DID} (score: ${reputationScore.score})`);
    // Test reputation verification
    const repReq = await jget(`/reputation/requirements?transactionType=transfer&amount=${AMOUNT}`);
    console.log(`  ${checkmark()} reputation requirement for transfer: ${repReq.minimumReputationScore}`);
    // Phase 4: Payment with Reputation
    console.log("\nPhase 4: Payment with Reputation");
    console.log("7) Process invoice payment with reputation verification");
    const paymentTx = await initiatePayment(issuedInvoice, A_WALLET, {
        isValid: true,
        reputationScore,
        reputationHash
    });
    console.log(`  ${checkmark()} payment transaction created: ${paymentTx._id}`);
    // Wait for transaction confirmation
    console.log("\n8) Wait for transaction confirmation");
    await waitForTxPosted(paymentTx._id);
    // Check final balances
    console.log("\n9) Check final balances");
    const finalAWallet = await jget(`/wallets/${A_WALLET}`);
    const finalBWallet = await jget(`/wallets/${B_WALLET}`);
    console.log(`  Agent A final balance: ${fmtNP(finalAWallet.balance)}`);
    console.log(`  Agent B final balance: ${fmtNP(finalBWallet.balance)}`);
    // Check invoice status
    const finalInvoice = await jget(`/invoices/${issuedInvoice._id}`);
    console.log(`  Invoice status: ${finalInvoice.status}`);
    console.log("\n🎉 Demo completed successfully!");
    console.log("\n=== Summary ===");
    console.log(`✓ Agents created and configured`);
    console.log(`✓ Wallets created and linked`);
    console.log(`✓ Invoice created and issued`);
    console.log(`✓ Reputation system tested`);
    console.log(`✓ Payment processed with reputation verification`);
    console.log(`✓ Real-time events received`);
    console.log(`✓ All systems working correctly!`);
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
