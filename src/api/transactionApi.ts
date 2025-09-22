import { Router } from 'express';
import { Transactions } from '../services/database.js';

const router = Router();

// Get all transactions
router.get('/', async (req, res) => {
  try {
    const transactions = await Transactions.find({}).toArray();
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get transactions by agent name (both sent and received)
router.get('/agent/:agentName', async (req, res) => {
  try {
    const { agentName } = req.params;
    const transactions = await Transactions.find({
      $or: [
        { fromAgent: agentName },
        { toAgent: agentName }
      ]
    }).toArray();
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions by agent name:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get transaction by transaction ID
router.get('/id/:txId', async (req, res) => {
  try {
    const { txId } = req.params;
    const transaction = await Transactions.findOne({ txId });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
