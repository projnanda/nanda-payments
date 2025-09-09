import express from 'express';
import { ethers } from 'ethers';
import { UnifiedWalletModel } from '../models/UnifiedWallet.js';
import { UnifiedAgentModel } from '../models/UnifiedAgent.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const CreateWalletSchema = z.object({
  agentDid: z.string(),
  ethereumAddress: z.string().optional(),
  generateNewKey: z.boolean().optional().default(false)
});

const ExchangeCurrencySchema = z.object({
  agentDid: z.string(),
  fromCurrency: z.enum(['NP', 'ETH']),
  toCurrency: z.enum(['NP', 'ETH']),
  amount: z.number().positive(),
  idempotencyKey: z.string()
});

/**
 * Create a new unified wallet for an agent
 * POST /wallets/create
 */
router.post('/create', async (req, res) => {
  try {
    const { agentDid, ethereumAddress, generateNewKey } = CreateWalletSchema.parse(req.body);

    // Check if agent exists
    const agent = await UnifiedAgentModel.findOne({ did: agentDid });
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Check if wallet already exists
    const existingWallet = await UnifiedWalletModel.findOne({ agentDid });
    if (existingWallet) {
      return res.status(409).json({ error: 'Wallet already exists for this agent' });
    }

    let ethAddress = ethereumAddress;
    let privateKey: string | undefined;

    // Generate new wallet if requested
    if (generateNewKey || !ethereumAddress) {
      const wallet = ethers.Wallet.createRandom();
      ethAddress = wallet.address;
      privateKey = wallet.privateKey;
    }

    // Create unified wallet
    const wallet = new UnifiedWalletModel({
      walletId: `wal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentDid,
      ethereumAddress: ethAddress,
      balances: {
        nandaPoints: {
          amount: 0,
          scale: 3,
          currency: 'NP',
          lastUpdated: new Date().toISOString()
        },
        ethereum: {
          amount: '0',
          currency: 'ETH',
          lastUpdated: new Date().toISOString()
        }
      },
      limits: {
        dailyNP: 1000000,
        dailyETH: '1.0',
        maxNP: 10000000,
        maxETH: '10.0',
        allowOverdraft: false
      },
      transactionHistory: [],
      exchangeRate: {
        npToEth: 0.000001,
        ethToNp: 1000000,
        lastUpdated: new Date().toISOString()
      },
      status: 'active',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });

    await wallet.save();

    // Update agent with wallet info
    agent.ethereumAddress = ethAddress;
    agent.wallets.ethereum.address = ethAddress;
    agent.wallets.ethereum.lastUpdated = new Date().toISOString();
    agent.wallets.nandaPoints.walletId = wallet.walletId;
    agent.wallets.nandaPoints.lastUpdated = new Date().toISOString();
    agent.updatedAt = new Date().toISOString();
    await agent.save();

    const response: any = {
      success: true,
      wallet: {
        walletId: wallet.walletId,
        agentDid: wallet.agentDid,
        ethereumAddress: wallet.ethereumAddress,
        balances: wallet.balances,
        status: wallet.status,
        createdAt: wallet.createdAt
      }
    };

    // Include private key only if generated
    if (privateKey) {
      response.privateKey = privateKey;
      response.warning = 'Keep your private key secure! Do not share it with anyone.';
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating wallet:', error);
    res.status(500).json({ error: 'Failed to create wallet' });
  }
});

/**
 * Get wallet details
 * GET /wallets/:walletId
 */
router.get('/:walletId', async (req, res) => {
  try {
    const { walletId } = req.params;

    const wallet = await UnifiedWalletModel.findOne({ walletId });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json({
      success: true,
      wallet: {
        walletId: wallet.walletId,
        agentDid: wallet.agentDid,
        ethereumAddress: wallet.ethereumAddress,
        balances: wallet.balances,
        limits: wallet.limits,
        exchangeRate: wallet.exchangeRate,
        status: wallet.status,
        transactionHistory: wallet.transactionHistory.slice(-10), // Last 10 transactions
        createdAt: wallet.createdAt,
        lastUpdated: wallet.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

/**
 * Get wallet by agent DID
 * GET /wallets/agent/:agentDid
 */
router.get('/agent/:agentDid', async (req, res) => {
  try {
    const { agentDid } = req.params;

    const wallet = await UnifiedWalletModel.findOne({ agentDid });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found for this agent' });
    }

    res.json({
      success: true,
      wallet: {
        walletId: wallet.walletId,
        agentDid: wallet.agentDid,
        ethereumAddress: wallet.ethereumAddress,
        balances: wallet.balances,
        limits: wallet.limits,
        exchangeRate: wallet.exchangeRate,
        status: wallet.status,
        transactionHistory: wallet.transactionHistory.slice(-10),
        createdAt: wallet.createdAt,
        lastUpdated: wallet.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error fetching wallet by agent:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

/**
 * Exchange currency between NP and ETH
 * POST /wallets/exchange
 */
router.post('/exchange', async (req, res) => {
  try {
    const { agentDid, fromCurrency, toCurrency, amount, idempotencyKey } = ExchangeCurrencySchema.parse(req.body);

    const wallet = await UnifiedWalletModel.findOne({ agentDid });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Validate balances
    if (fromCurrency === 'NP' && wallet.balances.nandaPoints.amount < amount) {
      return res.status(400).json({ error: 'Insufficient NP balance' });
    }
    if (fromCurrency === 'ETH' && parseFloat(wallet.balances.ethereum.amount) < amount) {
      return res.status(400).json({ error: 'Insufficient ETH balance' });
    }

    // Calculate exchange amounts
    const exchangeRate = wallet.exchangeRate.npToEth;
    let fromAmount: number;
    let toAmount: number;

    if (fromCurrency === 'NP' && toCurrency === 'ETH') {
      fromAmount = amount;
      toAmount = amount * exchangeRate;
    } else if (fromCurrency === 'ETH' && toCurrency === 'NP') {
      fromAmount = amount;
      toAmount = amount / exchangeRate;
    } else {
      return res.status(400).json({ error: 'Invalid currency pair' });
    }

    // Process exchange
    if (fromCurrency === 'NP') {
      wallet.balances.nandaPoints.amount -= fromAmount;
      wallet.balances.ethereum.amount = (parseFloat(wallet.balances.ethereum.amount) + toAmount).toString();
    } else {
      wallet.balances.ethereum.amount = (parseFloat(wallet.balances.ethereum.amount) - fromAmount).toString();
      wallet.balances.nandaPoints.amount += toAmount;
    }

    wallet.balances.nandaPoints.lastUpdated = new Date().toISOString();
    wallet.balances.ethereum.lastUpdated = new Date().toISOString();

    // Add transaction to history
    wallet.transactionHistory.push({
      transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'exchange',
      amount: fromAmount,
      currency: fromCurrency,
      timestamp: new Date().toISOString(),
      description: `Exchange ${fromAmount} ${fromCurrency} to ${toAmount} ${toCurrency}`,
      status: 'completed'
    });

    await wallet.save();

    res.json({
      success: true,
      exchange: {
        fromCurrency,
        toCurrency,
        fromAmount,
        toAmount,
        exchangeRate,
        transactionId: wallet.transactionHistory[wallet.transactionHistory.length - 1].transactionId
      },
      newBalances: wallet.balances
    });
  } catch (error) {
    console.error('Error exchanging currency:', error);
    res.status(500).json({ error: 'Failed to exchange currency' });
  }
});

/**
 * Get transaction history
 * GET /wallets/:walletId/history
 */
router.get('/:walletId/history', async (req, res) => {
  try {
    const { walletId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const wallet = await UnifiedWalletModel.findOne({ walletId });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const history = wallet.transactionHistory
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      history,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: wallet.transactionHistory.length
      }
    });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

/**
 * Update wallet limits
 * PUT /wallets/:walletId/limits
 */
router.put('/:walletId/limits', async (req, res) => {
  try {
    const { walletId } = req.params;
    const { dailyNP, dailyETH, maxNP, maxETH, allowOverdraft } = req.body;

    const wallet = await UnifiedWalletModel.findOne({ walletId });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    if (dailyNP !== undefined) wallet.limits.dailyNP = dailyNP;
    if (dailyETH !== undefined) wallet.limits.dailyETH = dailyETH;
    if (maxNP !== undefined) wallet.limits.maxNP = maxNP;
    if (maxETH !== undefined) wallet.limits.maxETH = maxETH;
    if (allowOverdraft !== undefined) wallet.limits.allowOverdraft = allowOverdraft;

    wallet.lastUpdated = new Date().toISOString();
    await wallet.save();

    res.json({
      success: true,
      limits: wallet.limits
    });
  } catch (error) {
    console.error('Error updating wallet limits:', error);
    res.status(500).json({ error: 'Failed to update wallet limits' });
  }
});

export default router;
