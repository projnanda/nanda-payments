/**
 * NANDA Points Facilitator Server
 * Implements x402 facilitator API with MongoDB/NP backend
 */

import { config } from "dotenv";
import express from "express";
import { Db } from "mongodb";
import {
  connectToMongoDB,
  NPFacilitatorConfig,
  PaymentPayload,
  PaymentRequirements,
  VerificationResponse,
  SettlementResponse,
  SupportedResponse,
  mongoUtils,
  nandaPoints,
  npUtils,
  NPVerificationError,
  NPSettlementError,
} from "x402-nanda-shared";

config();

const app = express();
app.use(express.json());

// Configuration
const facilitatorConfig: NPFacilitatorConfig = {
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017",
  dbName: process.env.NP_DB_NAME || "nanda_points",
  baseUrl: process.env.FACILITATOR_BASE_URL || "http://localhost:4021",
};

let database: Db | null = null;

// Initialize MongoDB connection
async function initializeDatabase() {
  if (!database) {
    database = await connectToMongoDB(facilitatorConfig);
  }
  return database;
}

/**
 * GET /supported
 * Returns supported payment schemes (x402 standard endpoint)
 */
app.get("/supported", async (req, res) => {
  try {
    const response: SupportedResponse = {
      kinds: [
        {
          scheme: "nanda-points",
          network: "nanda-network",
          asset: "NP",
          extra: {
            facilitatorUrl: `${facilitatorConfig.baseUrl}/facilitator`,
            description: "NANDA Points payment scheme using MongoDB backend",
            scale: 0,
            currency: "NP",
          },
        },
      ],
    };

    res.json(response);
  } catch (error) {
    console.error("Error in /supported:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /verify
 * Verify payment without settling (x402 standard endpoint)
 */
app.post("/verify", async (req, res) => {
  try {
    const { payment, paymentRequirements } = req.body as {
      payment: PaymentPayload;
      paymentRequirements: PaymentRequirements;
    };

    await initializeDatabase();

    const verification = await verifyPayment(payment, paymentRequirements);
    res.json(verification);
  } catch (error) {
    console.error("Error in /verify:", error);
    if (error instanceof NPVerificationError) {
      res.status(402).json({
        isValid: false,
        invalidReason: error.message,
        details: error.details,
      });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

/**
 * POST /settle
 * Verify and settle payment (x402 standard endpoint)
 */
app.post("/settle", async (req, res) => {
  try {
    const { payment, paymentRequirements } = req.body as {
      payment: PaymentPayload;
      paymentRequirements: PaymentRequirements;
    };

    await initializeDatabase();

    // First verify the payment
    const verification = await verifyPayment(payment, paymentRequirements);
    if (!verification.isValid) {
      return res.status(402).json({
        success: false,
        errorReason: verification.invalidReason,
        txId: payment.txId,
      });
    }

    // Then settle it (update balances, create receipt)
    const settlement = await settlePayment(payment);
    res.json(settlement);
  } catch (error) {
    console.error("Error in /settle:", error);
    if (error instanceof NPSettlementError) {
      res.status(402).json({
        success: false,
        errorReason: error.message,
        details: error.details,
      });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

/**
 * Verify payment against NANDA Points system
 */
async function verifyPayment(
  payment: PaymentPayload,
  requirements: PaymentRequirements
): Promise<VerificationResponse> {
  try {
    // Validate payment payload structure
    if (!nandaPoints.validatePayment(payment)) {
      throw new NPVerificationError("Invalid payment payload structure");
    }

    // Check scheme compatibility
    if (payment.scheme !== "nanda-points" || requirements.scheme !== "nanda-points") {
      throw new NPVerificationError("Unsupported payment scheme");
    }

    // Parse amounts
    const paymentAmount = npUtils.parseAmount(payment.amount);
    const requiredAmount = npUtils.parseAmount(requirements.maxAmountRequired);

    // Check amount is sufficient
    if (paymentAmount < requiredAmount) {
      throw new NPVerificationError(
        `Insufficient payment amount: ${paymentAmount} < ${requiredAmount}`,
        { paymentAmount, requiredAmount }
      );
    }

    // Check recipient matches
    if (payment.payTo !== requirements.payTo) {
      throw new NPVerificationError(
        `Payment recipient mismatch: ${payment.payTo} !== ${requirements.payTo}`,
        { paymentRecipient: payment.payTo, requiredRecipient: requirements.payTo }
      );
    }

    // Validate payer agent exists and has sufficient balance
    const validation = await mongoUtils.validateAgentAndBalance(
      database,
      payment.from,
      paymentAmount
    );

    if (!validation.valid) {
      throw new NPVerificationError(validation.reason ?? "Validation failed", {
        agent: payment.from,
        balance: validation.balance,
        required: paymentAmount,
      });
    }

    // Validate recipient agent exists
    const recipient = await mongoUtils.findAgent(database, payment.payTo);
    if (!recipient) {
      throw new NPVerificationError(`Recipient agent not found: ${payment.payTo}`);
    }

    // Check if transaction already exists (prevent double-spending)
    const existingTx = await mongoUtils.findTransaction(database, payment.txId);
    if (existingTx) {
      // If transaction exists and is completed, payment is valid
      if (existingTx.status === "completed") {
        return {
          isValid: true,
          payer: payment.from,
          amount: payment.amount,
          txId: payment.txId,
        };
      } else {
        throw new NPVerificationError("Transaction exists but not completed", {
          txId: payment.txId,
          status: existingTx.status,
        });
      }
    }

    return {
      isValid: true,
      payer: payment.from,
      amount: payment.amount,
      txId: payment.txId,
    };
  } catch (error) {
    if (error instanceof NPVerificationError) {
      return {
        isValid: false,
        invalidReason: error.message,
        payer: payment.from,
      };
    }
    throw error;
  }
}

/**
 * Settle payment in NANDA Points system
 */
async function settlePayment(payment: PaymentPayload): Promise<SettlementResponse> {
  try {
    // Check if already settled
    const existingReceipt = await mongoUtils.findReceipt(database, payment.txId);
    if (existingReceipt) {
      return {
        success: true,
        txId: payment.txId,
        amount: payment.amount,
        from: payment.from,
        to: payment.payTo,
        timestamp: Date.now(),
        receipt: existingReceipt,
      };
    }

    // Execute actual NP transaction with MongoDB balance updates
    const paymentAmount = npUtils.parseAmount(payment.amount);

    // Execute real NP transaction with MongoDB
    const receipt = await executeNPTransaction(
      payment.from,
      payment.payTo,
      paymentAmount,
      payment.txId
    );

    return {
      success: true,
      txId: payment.txId,
      amount: payment.amount,
      from: payment.from,
      to: payment.payTo,
      timestamp: Date.now(),
      receipt,
    };
  } catch (error) {
    throw new NPSettlementError("Settlement failed", error);
  }
}

/**
 * Execute real NP transaction using MongoDB
 * Based on the working implementation from main branch
 */
async function executeNPTransaction(from: string, to: string, amount: number, txId: string) {
  const createdAt = new Date().toISOString();

  // Get collection references
  const walletCollection = database.collection("wallets");
  const transactionCollection = database.collection("transactions");
  const receiptCollection = database.collection("receipts");

  // 1. Ensure both wallets exist and check balance
  const fromWallet = await walletCollection.findOne({ agent_name: from });
  const toWallet = await walletCollection.findOne({ agent_name: to });

  if (!fromWallet) throw new Error(`Sender wallet not found: ${from}`);
  if (!toWallet) throw new Error(`Receiver wallet not found: ${to}`);
  if (fromWallet.balanceMinor < amount)
    throw new Error(`Insufficient funds: ${fromWallet.balanceMinor} < ${amount}`);

  // 2. Deduct from sender's wallet
  const updatedFromWallet = await walletCollection.findOneAndUpdate(
    { agent_name: from },
    { $inc: { balanceMinor: -amount }, $set: { updatedAt: createdAt } },
    { returnDocument: "after" }
  );
  if (!updatedFromWallet) throw new Error("Failed to update sender wallet");

  // 3. Add to receiver's wallet
  const updatedToWallet = await walletCollection.findOneAndUpdate(
    { agent_name: to },
    { $inc: { balanceMinor: amount }, $set: { updatedAt: createdAt } },
    { returnDocument: "after" }
  );
  if (!updatedToWallet) throw new Error("Failed to update receiver wallet");

  // 4. Record transaction
  const transaction = {
    txId,
    fromAgent: from,
    toAgent: to,
    amountMinor: amount,
    currency: "NP",
    scale: 0,
    createdAt,
    status: "completed",
    error: null,
    task: "x402-payment",
  };
  await transactionCollection.insertOne(transaction);

  // 5. Create receipt
  const receipt = {
    txId,
    issuedAt: createdAt,
    fromAgent: from,
    toAgent: to,
    amountMinor: amount,
    fromBalanceAfter: updatedFromWallet.balanceMinor,
    toBalanceAfter: updatedToWallet.balanceMinor,
  };
  await receiptCollection.insertOne(receipt);

  console.log(`✅ Real NP transaction completed: ${from} → ${to}, ${amount} NP`);
  console.log(
    `   Balances: ${from}=${updatedFromWallet.balanceMinor}, ${to}=${updatedToWallet.balanceMinor}`
  );

  return receipt;
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "nanda-points-facilitator",
    version: "1.0.0",
    schemes: ["nanda-points"],
  });
});

const PORT = process.env.FACILITATOR_PORT || 4022;

app.listen(PORT, () => {
  console.log(`🏦 NANDA Points Facilitator running at http://localhost:${PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   GET  /supported - Get supported payment schemes`);
  console.log(`   POST /verify    - Verify payment`);
  console.log(`   POST /settle    - Settle payment`);
  console.log(`   GET  /health    - Health check`);
});

export { app };
