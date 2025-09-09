import express from 'express';
import walletRoutes from './wallets.js';
import agentRoutes from './agents.js';
import transactionRoutes from './transactions.js';
import reputationRoutes from './reputation.js';
import healthRoutes from './health.js';

const router = express.Router();

// Mount all API routes
router.use('/wallets', walletRoutes);
router.use('/agents', agentRoutes);
router.use('/transactions', transactionRoutes);
router.use('/reputation', reputationRoutes);
router.use('/health', healthRoutes);

// API documentation endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Unified AI Agent Marketplace API',
    version: '1.0.0',
    description: 'API for managing AI agents, wallets, transactions, and reputation',
    endpoints: {
      wallets: {
        'POST /wallets/create': 'Create a new unified wallet',
        'GET /wallets/:walletId': 'Get wallet details',
        'GET /wallets/agent/:agentDid': 'Get wallet by agent DID',
        'POST /wallets/exchange': 'Exchange between NP and ETH',
        'GET /wallets/:walletId/history': 'Get transaction history',
        'PUT /wallets/:walletId/limits': 'Update wallet limits'
      },
      agents: {
        'POST /agents/register': 'Register new agent',
        'GET /agents/:id': 'Get agent details',
        'PUT /agents/:id': 'Update agent profile',
        'DELETE /agents/:id': 'Deactivate agent',
        'GET /agents': 'List all agents'
      },
      transactions: {
        'POST /transactions/create': 'Create unified transaction',
        'GET /transactions/:id': 'Get transaction details',
        'GET /transactions': 'List transactions',
        'POST /transactions/:id/rate': 'Rate transaction'
      },
      reputation: {
        'GET /reputation/:agentId': 'Get agent reputation',
        'POST /reputation/update': 'Update reputation',
        'GET /reputation/leaderboard': 'Get top agents'
      },
      health: {
        'GET /health': 'Health check',
        'GET /health/detailed': 'Detailed health status'
      }
    }
  });
});

export default router;
