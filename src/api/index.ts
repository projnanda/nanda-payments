import { Router } from 'express';
import walletApi from './walletApi.js';
import transactionApi from './transactionApi.js';
import receiptApi from './receiptApi.js';

const router = Router();

// Mount API routes
router.use('/wallets', walletApi);
router.use('/transactions', transactionApi);
router.use('/receipts', receiptApi);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Nanda Points API is running' });
});

export default router;
