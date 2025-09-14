import { Router } from "express";
import { z } from "zod";
import { AgentModel, WalletModel, NP_CURRENCY, NP_SCALE } from "../models/index.js";
import { WalletLinkNonceModel } from "../models/index.js";
import { createTransaction } from "../services/transactionEngine.js";
import { randomUUID } from "crypto";
export const wallets = Router();
// --- Agent ↔ Wallet link: start ---
function parseWalletProof(proof) {
    // expected format: "nonce:<nonce>; walletId:<walletId>"
    const parts = proof.split(";").map(s => s.trim());
    const map = {};
    for (const p of parts) {
        const [k, v] = p.split(":").map(s => s.trim());
        if (k && v)
            map[k] = v;
    }
    return { nonce: map["nonce"], walletId: map["walletId"] };
}
// --- Agent ↔ Wallet link: end ---
const WELCOME_GRANT = parseInt(process.env.WELCOME_GRANT || "100000", 10);
// Create wallet (and optionally apply welcome grant)
wallets.post("/wallets", async (req, res) => {
    const schema = z.object({
        did: z.string(),
        type: z.enum(["user", "treasury", "fee_pool", "escrow"]).default("user"),
        labels: z.array(z.string()).optional()
    });
    const { did, type, labels } = schema.parse(req.body);
    const agent = await AgentModel.findOne({ did });
    if (!agent)
        return res.status(404).json({ error: { code: "AGENT_NOT_FOUND", message: "Agent not found" } });
    const wallet = await WalletModel.create({
        agentDid: did,
        type,
        currency: NP_CURRENCY,
        scale: NP_SCALE,
        labels: labels ?? ["default"]
    });
    // Apply welcome grant for user wallets when enabled
    if (type === "user" && agent.issuancePolicy?.welcomeGrant?.enabled && WELCOME_GRANT > 0) {
        await createTransaction({
            type: "mint",
            sourceWalletId: null,
            destWalletId: wallet._id.toString(),
            amountValue: WELCOME_GRANT,
            reasonCode: "WELCOME_GRANT",
            actor: { type: "system", did: did, walletId: wallet._id.toString() },
            idempotencyKey: `welcome:${did}:${wallet._id.toString()}`,
            facts: { from: { did }, to: { did, eventsWebhook: agent.payments?.np?.eventsWebhook } }
        });
    }
    res.status(201).json(wallet);
});
// Attach an existing wallet to an agent (direct, no nonce/FACTS; useful for testing/admin)
wallets.post("/wallets/:walletId/attach", async (req, res) => {
    try {
        const schema = z.object({
            did: z.string(),
            force: z.boolean().optional().default(false),
            payments: z.object({
                scale: z.number().optional(),
                receiveEndpoint: z.string().optional(),
                invoiceEndpoint: z.string().optional(),
                eventsWebhook: z.string().optional(),
                accepts: z.array(z.string()).optional(),
                minAmount: z.number().optional(),
                ttl: z.number().optional()
            }).optional()
        });
        const { did, force, payments } = schema.parse(req.body);
        const { walletId } = req.params;
        const agent = await AgentModel.findOne({ did });
        if (!agent)
            return res.status(404).json({ error: { code: "AGENT_NOT_FOUND", message: "Agent not found" } });
        const wallet = await WalletModel.findById(walletId);
        if (!wallet)
            return res.status(404).json({ error: { code: "WALLET_NOT_FOUND", message: "Wallet not found" } });
        if (!force && wallet.agentDid !== did) {
            return res.status(403).json({ error: { code: "WALLET_OWNERSHIP_ERROR", message: "Wallet does not belong to DID (use force=true to override in dev)" } });
        }
        const p = payments || {};
        const update = {
            "payments.np.walletId": wallet._id.toString(),
            "payments.np.scale": p.scale ?? agent.payments?.np?.scale ?? NP_SCALE,
            "payments.np.receiveEndpoint": p.receiveEndpoint ?? agent.payments?.np?.receiveEndpoint,
            "payments.np.invoiceEndpoint": p.invoiceEndpoint ?? agent.payments?.np?.invoiceEndpoint,
            "payments.np.eventsWebhook": p.eventsWebhook ?? agent.payments?.np?.eventsWebhook,
            "payments.np.accepts": p.accepts ?? agent.payments?.np?.accepts ?? ["earn", "transfer", "spend"],
            "payments.np.minAmount": p.minAmount ?? agent.payments?.np?.minAmount ?? 1,
            "payments.np.ttl": p.ttl ?? agent.payments?.np?.ttl ?? 3600,
            "payments.np.walletProofVerified": true
        };
        const updated = await AgentModel.findOneAndUpdate({ did }, { $set: update }, { new: true });
        return res.json({ ok: true, agent: updated });
    }
    catch (e) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: e?.message ?? "Invalid request" } });
    }
});
// Detach the linked wallet from an agent (keeps other payment fields)
wallets.post("/wallets/:walletId/detach", async (req, res) => {
    try {
        const schema = z.object({ did: z.string(), force: z.boolean().optional().default(false) });
        const { did, force } = schema.parse(req.body);
        const { walletId } = req.params;
        const agent = await AgentModel.findOne({ did });
        if (!agent)
            return res.status(404).json({ error: { code: "AGENT_NOT_FOUND", message: "Agent not found" } });
        const wallet = await WalletModel.findById(walletId);
        if (!wallet)
            return res.status(404).json({ error: { code: "WALLET_NOT_FOUND", message: "Wallet not found" } });
        if (!force && wallet.agentDid !== did) {
            return res.status(403).json({ error: { code: "WALLET_OWNERSHIP_ERROR", message: "Wallet does not belong to DID (use force=true to override in dev)" } });
        }
        if (!force && agent?.payments?.np?.walletId && agent.payments.np.walletId !== walletId) {
            return res.status(409).json({ error: { code: "WALLET_MISMATCH", message: "Agent is linked to a different wallet; use force=true to detach anyway" } });
        }
        const updated = await AgentModel.findOneAndUpdate({ did }, { $unset: { "payments.np.walletId": "" }, $set: { "payments.np.walletProofVerified": false } }, { new: true });
        return res.json({ ok: true, agent: updated });
    }
    catch (e) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: e?.message ?? "Invalid request" } });
    }
});
// Get a wallet by id
wallets.get("/wallets/:walletId", async (req, res) => {
    const wallet = await WalletModel.findById(req.params.walletId);
    if (!wallet)
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Wallet not found" } });
    res.json(wallet);
});
// List wallets (optionally by DID)
wallets.get("/wallets", async (req, res) => {
    const did = req.query.did;
    const q = did ? { agentDid: did } : {};
    const list = await WalletModel.find(q).sort({ createdAt: -1 });
    res.json(list);
});
// Start link: issues a nonce for DID and (optionally) updates primaryFactsUrl
wallets.post("/wallets/link", async (req, res) => {
    try {
        const schema = z.object({ did: z.string(), primaryFactsUrl: z.string().url().optional() });
        const { did, primaryFactsUrl } = schema.parse(req.body);
        const agent = await AgentModel.findOne({ did });
        if (!agent)
            return res.status(404).json({ error: { code: "AGENT_NOT_FOUND", message: "Agent not found" } });
        if (primaryFactsUrl && primaryFactsUrl !== agent.primaryFactsUrl) {
            await AgentModel.updateOne({ did }, { $set: { primaryFactsUrl } });
        }
        const nonce = randomUUID();
        await WalletLinkNonceModel.findOneAndUpdate({ did }, { $set: { nonce }, $setOnInsert: { did } }, { upsert: true, new: true });
        return res.json({ nonce });
    }
    catch (e) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: e?.message ?? "Invalid request" } });
    }
});
// Verify link: reads walletProof from Facts (or accepts provided values) and verifies ownership
wallets.post("/wallets/link/verify", async (req, res) => {
    try {
        const schema = z.object({
            did: z.string(),
            walletProof: z.string().optional(),
            walletId: z.string().optional(),
            primaryFactsUrl: z.string().url().optional()
        });
        const { did, walletProof, walletId: providedWalletId, primaryFactsUrl } = schema.parse(req.body);
        const agent = await AgentModel.findOne({ did });
        if (!agent)
            return res.status(404).json({ error: { code: "AGENT_NOT_FOUND", message: "Agent not found" } });
        // Allow updating primaryFactsUrl here as well (optional convenience)
        if (primaryFactsUrl && primaryFactsUrl !== agent.primaryFactsUrl) {
            await AgentModel.updateOne({ did }, { $set: { primaryFactsUrl } });
            agent.primaryFactsUrl = primaryFactsUrl;
        }
        const nonceDoc = await WalletLinkNonceModel.findOne({ did });
        if (!nonceDoc)
            return res.status(422).json({ error: { code: "LINK_NOT_REQUESTED", message: "Start link with /wallets/link first" } });
        let proofStr = walletProof;
        let walletId = providedWalletId;
        let ext = {};
        // If proof not provided, try fetching from Agent Facts (Node 18+ global fetch)
        if (!proofStr || !walletId) {
            if (!agent.primaryFactsUrl)
                return res.status(400).json({ error: { code: "FACTS_URL_MISSING", message: "Agent.primaryFactsUrl is not set" } });
            const resp = await fetch(agent.primaryFactsUrl);
            if (!resp.ok)
                return res.status(400).json({ error: { code: "FACTS_FETCH_FAILED", message: `Failed to fetch Facts: ${resp.status}` } });
            const facts = await resp.json();
            ext = (facts?.extensions?.nanda?.payments?.np)
                || (facts?.nanda?.payments?.np)
                || facts?.nanda
                || {};
            proofStr = proofStr ?? ext?.walletProof;
            walletId = walletId ?? ext?.walletId;
            if (!proofStr)
                return res.status(422).json({ error: { code: "PROOF_NOT_FOUND", message: "walletProof not present in Facts" } });
        }
        const parsed = parseWalletProof(proofStr);
        if (!parsed.nonce || !parsed.walletId)
            return res.status(400).json({ error: { code: "PROOF_INVALID", message: "walletProof must include nonce and walletId" } });
        if (parsed.nonce !== nonceDoc.nonce)
            return res.status(409).json({ error: { code: "NONCE_MISMATCH", message: "Provided proof nonce does not match" } });
        if (providedWalletId && providedWalletId !== parsed.walletId)
            return res.status(409).json({ error: { code: "WALLET_ID_MISMATCH", message: "walletId mismatch" } });
        // Verify the wallet exists and belongs to the DID
        const wallet = await WalletModel.findById(parsed.walletId);
        if (!wallet)
            return res.status(404).json({ error: { code: "WALLET_NOT_FOUND", message: "Wallet not found" } });
        if (wallet.agentDid !== did)
            return res.status(403).json({ error: { code: "WALLET_OWNERSHIP_ERROR", message: "Wallet does not belong to DID" } });
        // Persist the payments.np block (+ defaults) on the Agent
        const paymentsUpdate = {
            "payments.np.walletId": parsed.walletId,
            "payments.np.scale": (ext?.scale ?? NP_SCALE),
            "payments.np.receiveEndpoint": (ext?.receiveEndpoint ?? agent.payments?.np?.receiveEndpoint),
            "payments.np.invoiceEndpoint": (ext?.invoiceEndpoint ?? agent.payments?.np?.invoiceEndpoint),
            "payments.np.eventsWebhook": (ext?.eventsWebhook ?? agent.payments?.np?.eventsWebhook),
            "payments.np.accepts": (ext?.accepts ?? agent.payments?.np?.accepts ?? ["earn", "transfer", "spend"]),
            "payments.np.minAmount": (ext?.minAmount ?? agent.payments?.np?.minAmount ?? 1),
            "payments.np.ttl": (ext?.ttl ?? agent.payments?.np?.ttl ?? 3600),
            "payments.np.walletProofVerified": true
        };
        const updated = await AgentModel.findOneAndUpdate({ did }, { $set: paymentsUpdate }, { new: true });
        // Consume nonce
        await WalletLinkNonceModel.deleteOne({ did });
        return res.json({ ok: true, agent: updated });
    }
    catch (e) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: e?.message ?? "Invalid request" } });
    }
});
