/**
 * MongoDB utilities for NANDA Points
 * Integrates with existing MongoDB schema
 */

import { MongoClient, Db, Collection } from "mongodb";
import { NPAgent, NPWallet, NPTransaction, NPReceipt, NPFacilitatorConfig } from "./types.js";

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Connect to MongoDB using existing connection settings
 */
export async function connectToMongoDB(config: NPFacilitatorConfig): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    client = new MongoClient(config.mongoUri);
    await client.connect();
    db = client.db(config.dbName);

    console.log(`Connected to MongoDB: ${config.dbName}`);
    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

/**
 * Get agents collection (existing schema)
 */
export function getAgentCollection(database: Db): Collection<NPAgent> {
  return database.collection<NPAgent>("agents");
}

/**
 * Get wallets collection (existing schema)
 */
export function getWalletCollection(database: Db): Collection<NPWallet> {
  return database.collection<NPWallet>("wallets");
}

/**
 * Get transactions collection (existing schema)
 */
export function getTransactionCollection(database: Db): Collection<NPTransaction> {
  return database.collection<NPTransaction>("transactions");
}

/**
 * Get receipts collection (existing schema)
 */
export function getReceiptCollection(database: Db): Collection<NPReceipt> {
  return database.collection<NPReceipt>("receipts");
}

/**
 * Close MongoDB connection
 */
export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

/**
 * MongoDB transaction utilities
 */
export const mongoUtils = {
  /**
   * Find agent by name
   */
  async findAgent(database: Db, agentName: string): Promise<NPAgent | null> {
    const agentCollection = getAgentCollection(database);
    return await agentCollection.findOne({ agent_name: agentName });
  },

  /**
   * Find wallet by agent name
   */
  async findWallet(database: Db, agentName: string): Promise<NPWallet | null> {
    const walletCollection = getWalletCollection(database);
    return await walletCollection.findOne({ agent_name: agentName });
  },

  /**
   * Find transaction by ID
   */
  async findTransaction(database: Db, txId: string): Promise<NPTransaction | null> {
    const transactionCollection = getTransactionCollection(database);
    return await transactionCollection.findOne({ txId });
  },

  /**
   * Find receipt by transaction ID
   */
  async findReceipt(database: Db, txId: string): Promise<NPReceipt | null> {
    const receiptCollection = getReceiptCollection(database);
    return await receiptCollection.findOne({ txId });
  },

  /**
   * Get agent balance
   */
  async getAgentBalance(database: Db, agentName: string): Promise<number | null> {
    const wallet = await mongoUtils.findWallet(database, agentName);
    return wallet ? wallet.balanceMinor : null;
  },

  /**
   * Check if agent exists and has sufficient balance
   */
  async validateAgentAndBalance(
    database: Db,
    agentName: string,
    requiredAmount: number
  ): Promise<{ valid: boolean; reason?: string; balance?: number }> {
    const agent = await mongoUtils.findAgent(database, agentName);
    if (!agent) {
      return { valid: false, reason: "Agent not found" };
    }

    const wallet = await mongoUtils.findWallet(database, agentName);
    if (!wallet) {
      return { valid: false, reason: "Agent wallet not found" };
    }

    if (wallet.balanceMinor < requiredAmount) {
      return {
        valid: false,
        reason: "Insufficient balance",
        balance: wallet.balanceMinor,
      };
    }

    return { valid: true, balance: wallet.balanceMinor };
  },
};
