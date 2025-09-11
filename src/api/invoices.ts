import { Router } from "express";
import { z } from "zod";
import { InvoiceModel } from "../models/Invoice.js";
import { AgentModel, WalletModel } from "../models/index.js";
import { emit } from "../lib/eventBus.js";
import { createTransaction } from "../services/transactionEngine.js";

export const invoices = Router();

// Create invoice
invoices.post("/invoices", async (req, res) => {
  const schema = z.object({
    amount: z.object({
      value: z.number().positive(),
      currency: z.string().optional(),
      scale: z.number().optional()
    }),
    issuer: z.object({
      did: z.string(),
      walletId: z.string()
    }),
    recipient: z.object({
      did: z.string(),
      walletId: z.string().optional()
    }),
    paymentTerms: z.object({
      dueDate: z.string().datetime().optional(),
      acceptPartial: z.boolean().optional(),
      minAmount: z.number().optional(),
      allowOverpayment: z.boolean().optional(),
      maxAmount: z.number().optional()
    }).optional(),
    metadata: z.object({
      memo: z.string().optional(),
      description: z.string().optional(),
      items: z.array(z.object({
        description: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        amount: z.number()
      })).optional(),
      tags: z.array(z.string()).optional(),
      externalRef: z.string().optional()
    }).optional()
  });

  try {
    const body = schema.parse(req.body);

    // Verify issuer exists and owns the wallet
    const issuer = await AgentModel.findOne({ did: body.issuer.did });
    if (!issuer) {
      return res.status(404).json({ error: { code: "ISSUER_NOT_FOUND", message: "Issuer agent not found" } });
    }

    const issuerWallet = await WalletModel.findOne({ 
      _id: body.issuer.walletId,
      agentDid: body.issuer.did 
    });
    if (!issuerWallet) {
      return res.status(404).json({ error: { code: "ISSUER_WALLET_NOT_FOUND", message: "Issuer wallet not found or not owned by issuer" } });
    }

    // Verify recipient exists
    const recipient = await AgentModel.findOne({ did: body.recipient.did });
    if (!recipient) {
      return res.status(404).json({ error: { code: "RECIPIENT_NOT_FOUND", message: "Recipient agent not found" } });
    }

    // If recipient wallet specified, verify it exists and is owned by recipient
    if (body.recipient.walletId) {
      const recipientWallet = await WalletModel.findOne({
        _id: body.recipient.walletId,
        agentDid: body.recipient.did
      });
      if (!recipientWallet) {
        return res.status(404).json({ error: { code: "RECIPIENT_WALLET_NOT_FOUND", message: "Recipient wallet not found or not owned by recipient" } });
      }
    }

    // Create the invoice
    const invoice = await InvoiceModel.create({
      ...body,
      status: "draft",
      transactions: []
    });

    // Emit event
    emit({ type: "invoice.created", invoiceId: invoice._id });

    res.status(201).json(invoice);
  } catch (e: any) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: e?.message ?? "Invalid request" } });
  }
});

// Issue invoice (change status from draft to issued)
invoices.post("/invoices/:invoiceId/issue", async (req, res) => {
  try {
    const invoice = await InvoiceModel.findById(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Invoice not found" } });
    }

    if (invoice.status !== "draft") {
      return res.status(422).json({ error: { code: "INVALID_STATE", message: "Only draft invoices can be issued" } });
    }

    invoice.status = "issued";
    invoice.issuedAt = new Date();
    await invoice.save();

    // Emit event
    emit({ type: "invoice.issued", invoiceId: invoice._id });

    res.json(invoice);
  } catch (e: any) {
    return res.status(400).json({ error: { code: "ERROR", message: e?.message ?? "Error issuing invoice" } });
  }
});

// Cancel invoice
invoices.post("/invoices/:invoiceId/cancel", async (req, res) => {
  try {
    const invoice = await InvoiceModel.findById(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Invoice not found" } });
    }

    if (invoice.status === "paid" || invoice.status === "cancelled") {
      return res.status(422).json({ error: { code: "INVALID_STATE", message: "Cannot cancel paid or already cancelled invoices" } });
    }

    invoice.status = "cancelled";
    invoice.cancelledAt = new Date();
    await invoice.save();

    // Emit event
    emit({ type: "invoice.cancelled", invoiceId: invoice._id });

    res.json(invoice);
  } catch (e: any) {
    return res.status(400).json({ error: { code: "ERROR", message: e?.message ?? "Error cancelling invoice" } });
  }
});

// Get invoice by ID
invoices.get("/invoices/:invoiceId", async (req, res) => {
  const invoice = await InvoiceModel.findById(req.params.invoiceId);
  if (!invoice) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Invoice not found" } });
  }
  res.json(invoice);
});

// List invoices
invoices.get("/invoices", async (req, res) => {
  const { status, issuerDid, recipientDid, limit = "50", after } = req.query as any;
  const filter: any = {};

  if (status) filter.status = status;
  if (issuerDid) filter["issuer.did"] = issuerDid;
  if (recipientDid) filter["recipient.did"] = recipientDid;
  if (after) filter._id = { $lt: after };

  const invoices = await InvoiceModel.find(filter)
    .sort({ _id: -1 })
    .limit(parseInt(limit, 10));

  res.json(invoices);
});

// Pay invoice
invoices.post("/invoices/:invoiceId/pay", async (req, res) => {
  const schema = z.object({
    amount: z.number().positive(),
    walletId: z.string(),
    idempotencyKey: z.string()
  });

  try {
    const body = schema.parse(req.body);
    const invoice = await InvoiceModel.findById(req.params.invoiceId);
    
    if (!invoice || !invoice.amount || !invoice.issuer) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Invoice not found or invalid" } });
    }

    // Check invoice status
    if (invoice.status !== "issued") {
      return res.status(422).json({ 
        error: { code: "INVALID_STATE", message: "Only issued invoices can be paid" }
      });
    }

    // Calculate current paid amount from transactions
    const currentPaid = invoice.transactions?.reduce((sum, tx) => sum + tx.amount, 0) ?? 0;
    const remainingAmount = invoice.amount.value - currentPaid;
    
    if (invoice.paymentTerms?.acceptPartial === false && body.amount !== remainingAmount) {
      return res.status(422).json({ 
        error: { code: "INVALID_AMOUNT", message: "Partial payment not allowed" }
      });
    }

    if (invoice.paymentTerms?.minAmount && body.amount < invoice.paymentTerms.minAmount) {
      return res.status(422).json({ 
        error: { code: "INVALID_AMOUNT", message: "Amount below minimum allowed" }
      });
    }

    if (invoice.paymentTerms?.allowOverpayment === false && 
        (currentPaid + body.amount) > invoice.amount.value) {
      return res.status(422).json({ 
        error: { code: "INVALID_AMOUNT", message: "Amount would exceed invoice total" }
      });
    }

    if (invoice.paymentTerms?.maxAmount && body.amount > invoice.paymentTerms.maxAmount) {
      return res.status(422).json({ 
        error: { code: "INVALID_AMOUNT", message: "Amount above maximum allowed" }
      });
    }

    // Create transaction
    const sourceWallet = await WalletModel.findById(body.walletId);
    if (!sourceWallet) {
      return res.status(404).json({ 
        error: { code: "WALLET_NOT_FOUND", message: "Source wallet not found" }
      });
    }

    // Create transaction
    const transaction = await createTransaction({
      type: "transfer",
      sourceWalletId: body.walletId,
      destWalletId: invoice.issuer.walletId,
      amountValue: body.amount,
      reasonCode: "invoice.payment",
      idempotencyKey: body.idempotencyKey,
      actor: { 
        type: "agent",
        did: sourceWallet.agentDid,
        walletId: sourceWallet._id.toString()
      },
      facts: {
        from: {
          did: sourceWallet.agentDid,
          walletId: sourceWallet._id.toString()
        },
        to: {
          did: invoice.issuer.did,
          walletId: invoice.issuer.walletId
        }
      },
      metadata: {
        invoiceId: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber
      }
    });

    // Update invoice
    invoice.transactions = invoice.transactions ?? [];
    invoice.transactions.push({
      txId: transaction._id.toString(),
      amount: body.amount,
      timestamp: new Date()
    });

    // Check if invoice is fully paid
    const newTotalPaid = currentPaid + body.amount;
    if (newTotalPaid >= invoice.amount.value) {
      invoice.status = "paid";
      invoice.paidAt = new Date();
    }

    await invoice.save();

    // Emit event
    emit({ 
      type: "invoice.payment",
      invoiceId: invoice._id,
      txId: transaction._id,
      amount: body.amount,
      totalPaid: newTotalPaid,
      status: invoice.status
    });

    res.json(invoice);
  } catch (e: any) {
    if (e.httpCode === 402) {
      return res.status(402).json({ 
        error: { code: "INSUFFICIENT_FUNDS", message: e.message }
      });
    }
    return res.status(400).json({ 
      error: { code: "ERROR", message: e?.message ?? "Error processing payment" }
    });
  }
});
