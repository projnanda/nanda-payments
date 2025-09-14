import { Router } from "express";
import { z } from "zod";
import { AgentModel, WalletModel } from "../models/index.js";
export const agents = Router();
// await AgentModel.syncIndexes();
agents.post("/agents/resolve", async (req, res) => {
    const schema = z.object({
        did: z.string(),
        primaryFactsUrl: z.string().optional(),
        agentName: z.string().optional(),
        label: z.string().optional(),
        payments: z.object({
            np: z.object({
                walletId: z.string().optional(),
                scale: z.number().optional(),
                receiveEndpoint: z.string().optional(),
                invoiceEndpoint: z.string().optional(),
                eventsWebhook: z.string().optional(),
                accepts: z.array(z.string()).optional(),
                minAmount: z.number().optional(),
                ttl: z.number().optional(),
                walletProofVerified: z.boolean().optional()
            }).optional()
        }).optional(),
        facts: z.any().optional(),
        status: z.enum(["active", "suspended", "expired"]).optional()
    });
    const body = schema.parse(req.body);
    const update = {
        ...(body.agentName && { agentName: body.agentName }),
        ...(body.label && { label: body.label }),
        ...(body.primaryFactsUrl && { primaryFactsUrl: body.primaryFactsUrl }),
        ...(body.facts && { facts: body.facts }),
        ...(body.status && { status: body.status }),
    };
    if (body.payments?.np) {
        update["payments.np"] = body.payments.np;
    }
    const doc = await AgentModel.findOneAndUpdate({ did: body.did }, { $set: update, $setOnInsert: { did: body.did } }, { upsert: true, new: true });
    res.json(doc);
});
// --- Basic CRUD for Agents (for testing/dev) ---
// CREATE
agents.post("/agents", async (req, res) => {
    try {
        const schema = z.object({
            did: z.string(),
            agentName: z.string().optional(),
            label: z.string().optional(),
            primaryFactsUrl: z.string().url().optional(),
            payments: z.object({
                np: z.object({
                    walletId: z.string().optional(),
                    scale: z.number().optional(),
                    receiveEndpoint: z.string().optional(),
                    invoiceEndpoint: z.string().optional(),
                    eventsWebhook: z.string().optional(),
                    accepts: z.array(z.string()).optional(),
                    minAmount: z.number().optional(),
                    ttl: z.number().optional(),
                    walletProofVerified: z.boolean().optional()
                })
            }).optional(),
            facts: z.any().optional(),
            status: z.enum(["active", "suspended", "expired"]).optional()
        });
        const body = schema.parse(req.body);
        const doc = await AgentModel.create({
            did: body.did,
            agentName: body.agentName,
            label: body.label,
            primaryFactsUrl: body.primaryFactsUrl,
            facts: body.facts,
            payments: body.payments,
            status: body.status
        });
        return res.status(201).json(doc);
    }
    catch (e) {
        if (e?.code === 11000) {
            return res.status(409).json({ error: { code: "DID_EXISTS", message: "Agent with this DID already exists" } });
        }
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: e?.message ?? "Invalid request" } });
    }
});
// LIST
agents.get("/agents", async (req, res) => {
    const { did, q, limit = "50", after } = req.query;
    const filter = {};
    if (did)
        filter.did = did;
    if (q) {
        filter.$or = [
            { agentName: { $regex: q, $options: "i" } },
            { label: { $regex: q, $options: "i" } },
            { did: { $regex: q, $options: "i" } }
        ];
    }
    if (after)
        filter._id = { $lt: after };
    const docs = await AgentModel.find(filter).sort({ _id: -1 }).limit(parseInt(limit, 10));
    res.json(docs);
});
// READ (by DID)
agents.get("/agents/:did", async (req, res) => {
    const doc = await AgentModel.findOne({ did: req.params.did });
    if (!doc)
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Agent not found" } });
    res.json(doc);
});
// UPDATE (by DID)
agents.patch("/agents/:did", async (req, res) => {
    try {
        const schema = z.object({
            agentName: z.string().optional(),
            label: z.string().optional(),
            primaryFactsUrl: z.string().url().optional(),
            payments: z.object({
                np: z.object({
                    walletId: z.string().optional(),
                    scale: z.number().optional(),
                    receiveEndpoint: z.string().optional(),
                    invoiceEndpoint: z.string().optional(),
                    eventsWebhook: z.string().optional(),
                    accepts: z.array(z.string()).optional(),
                    minAmount: z.number().optional(),
                    ttl: z.number().optional(),
                    walletProofVerified: z.boolean().optional()
                })
            }).optional(),
            facts: z.any().optional(),
            status: z.enum(["active", "suspended", "expired"]).optional()
        });
        const body = schema.parse(req.body);
        const update = { ...body };
        const doc = await AgentModel.findOneAndUpdate({ did: req.params.did }, { $set: update }, { new: true });
        if (!doc)
            return res.status(404).json({ error: { code: "NOT_FOUND", message: "Agent not found" } });
        res.json(doc);
    }
    catch (e) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: e?.message ?? "Invalid request" } });
    }
});
// DELETE (by DID)
agents.delete("/agents/:did", async (req, res) => {
    const force = String(req.query.force || "false").toLowerCase() === "true";
    const did = req.params.did;
    const walletCount = await WalletModel.countDocuments({ agentDid: did });
    if (walletCount > 0 && !force) {
        return res.status(409).json({ error: { code: "HAS_WALLETS", message: `Agent has ${walletCount} wallet(s); use ?force=true to delete agent and wallets (transactions retained).` } });
    }
    let deletedWallets = 0;
    if (force && walletCount > 0) {
        const resDel = await WalletModel.deleteMany({ agentDid: did });
        deletedWallets = resDel.deletedCount || 0;
    }
    const del = await AgentModel.deleteOne({ did });
    if (del.deletedCount === 0)
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Agent not found" } });
    res.json({ ok: true, deletedAgent: del.deletedCount, deletedWallets });
});
