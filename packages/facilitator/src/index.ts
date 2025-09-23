/**
 * NANDA Points Facilitator Server
 * Implements x402 facilitator API with MongoDB/NP backend
 */

import { config } from "dotenv";
import express from "express";
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

let database: any = null;

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
    const settlement = await settlePayment(payment, paymentRequirements);
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
      throw new NPVerificationError(validation.reason!, {
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
async function settlePayment(
  payment: PaymentPayload,
  requirements: PaymentRequirements
): Promise<SettlementResponse> {
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

    // This would integrate with your existing NP transaction system
    // For now, we'll simulate the transaction process
    const paymentAmount = npUtils.parseAmount(payment.amount);

    // TODO: Replace with actual NP transaction system integration
    // This should call your existing initiateTransaction logic
    const receipt = await simulateNPTransaction(
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
 * Simulate NP transaction (replace with actual implementation)
 */
async function simulateNPTransaction(
  from: string,
  to: string,
  amount: number,
  txId: string
) {
  // TODO: Replace with your actual NP transaction logic
  // This should integrate with your existing transaction/receipt system

  const receipt = {
    txId,
    fromAgent: from,
    toAgent: to,
    amountMinor: amount,
    amountPoints: amount,
    timestamp: new Date().toISOString(),
    fromBalanceAfter: 0, // Would be calculated from actual balances
    toBalanceAfter: 0,   // Would be calculated from actual balances
  };

  console.log(`Simulated NP transaction: ${from} → ${to}, ${amount} NP`);
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