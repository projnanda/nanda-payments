import express from 'express';
import { UnifiedTransactionModel } from '../models/UnifiedTransaction.js';
import { UnifiedTransactionEngine } from '../services/UnifiedTransactionEngine.js';
import { z } from 'zod';

const router = express.Router();

// Initialize transaction engine
const transactionEngine = new UnifiedTransactionEngine(
  process.env.RADIUS_RPC_URL || 'https://rpc.testnet.radiustech.xyz/...'
);

// Validation schemas
const CreateTransactionSchema = z.object({
  type: z.enum(['unified_payment', 'point_transfer', 'eth_payment', 'exchange', 'task_completion']),
  clientDid: z.string(),
  agentDid: z.string(),
  taskId: z.string().optional(),
  taskDescription: z.string().optional(),
  taskCategory: z.string().optional(),
  taskComplexity: z.enum(['low', 'medium', 'high']).optional(),
  estimatedDuration: z.string().optional(),
  ethAmount: z.string(),
  npAmount: z.number().positive(),
  clientRating: z.number().min(1).max(100).optional(),
  idempotencyKey: z.string(),
  metadata: z.any().optional()
});

const ExchangeSchema = z.object({
  fromCurrency: z.enum(['NP', 'ETH']),
  toCurrency: z.enum(['NP', 'ETH']),
  amount: z.number().positive(),
  agentDid: z.string(),
  idempotencyKey: z.string()
});

/**
 * Create a unified transaction
 * POST /transactions/create
 */
router.post('/create', async (req, res) => {
  try {
    const data = CreateTransactionSchema.parse(req.body);

    const transaction = await transactionEngine.createUnifiedTransaction(data);

    res.status(201).json({
      success: true,
      transaction: {
        id: transaction._id,
        type: transaction.type,
        status: transaction.status,
        client: transaction.client,
        agent: transaction.agent,
        task: transaction.task,
        payments: transaction.payments,
        reputation: transaction.reputation,
        timestamps: transaction.timestamps,
        metadata: transaction.metadata
      }
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

/**
 * Exchange currency
 * POST /transactions/exchange
 */
router.post('/exchange', async (req, res) => {
  try {
    const data = ExchangeSchema.parse(req.body);

    const transaction = await transactionEngine.exchangeCurrency(data);

    res.status(201).json({
      success: true,
      transaction: {
        id: transaction._id,
        type: transaction.type,
        status: transaction.status,
        exchange: transaction.exchange,
        timestamps: transaction.timestamps
      }
    });
  } catch (error) {
    console.error('Error exchanging currency:', error);
    res.status(500).json({ error: 'Failed to exchange currency' });
  }
});

/**
 * Get transaction details
 * GET /transactions/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await UnifiedTransactionModel.findById(id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({
      success: true,
      transaction: {
        id: transaction._id,
        type: transaction.type,
        status: transaction.status,
        client: transaction.client,
        agent: transaction.agent,
        task: transaction.task,
        payments: transaction.payments,
        reputation: transaction.reputation,
        exchange: transaction.exchange,
        timestamps: transaction.timestamps,
        metadata: transaction.metadata
      }
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

/**
 * List transactions
 * GET /transactions
 */
router.get('/', async (req, res) => {
  try {
    const { 
      clientDid, 
      agentDid, 
      type, 
      status, 
      limit = 50, 
      offset = 0 
    } = req.query;

    const filter: any = {};
    if (clientDid) filter['client.did'] = clientDid;
    if (agentDid) filter['agent.did'] = agentDid;
    if (type) filter.type = type;
    if (status) filter.status = status;

    const transactions = await UnifiedTransactionModel.find(filter)
      .sort({ 'timestamps.createdAt': -1 })
      .limit(Number(limit))
      .skip(Number(offset));

    const total = await UnifiedTransactionModel.countDocuments(filter);

    res.json({
      success: true,
      transactions: transactions.map(tx => ({
        id: tx._id,
        type: tx.type,
        status: tx.status,
        client: tx.client,
        agent: tx.agent,
        task: tx.task,
        payments: tx.payments,
        timestamps: tx.timestamps
      })),
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total
      }
    });
  } catch (error) {
    console.error('Error listing transactions:', error);
    res.status(500).json({ error: 'Failed to list transactions' });
  }
});

/**
 * Rate a transaction
 * POST /transactions/:id/rate
 */
router.post('/:id/rate', async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 100) {
      return res.status(400).json({ error: 'Rating must be between 1 and 100' });
    }

    const transaction = await UnifiedTransactionModel.findById(id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status !== 'completed') {
      return res.status(400).json({ error: 'Transaction must be completed to rate' });
    }

    // Update transaction with rating
    transaction.reputation.clientRating = rating;
    transaction.reputation.newScore = transactionEngine.calculateNewReputation(
      transaction.reputation.previousScore, 
      rating
    );
    transaction.timestamps.reputationUpdatedAt = new Date().toISOString();
    transaction.metadata.clientSatisfaction = transactionEngine.calculateSatisfactionLevel(rating);

    await transaction.save();

    res.json({
      success: true,
      message: 'Transaction rated successfully',
      rating: {
        clientRating: rating,
        previousScore: transaction.reputation.previousScore,
        newScore: transaction.reputation.newScore
      }
    });
  } catch (error) {
    console.error('Error rating transaction:', error);
    res.status(500).json({ error: 'Failed to rate transaction' });
  }
});

export default router;
