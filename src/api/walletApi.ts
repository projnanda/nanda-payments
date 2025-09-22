import { Router } from 'express';
import { Wallets } from '../services/database.js';

const router = Router();

// Get wallet by agent name
router.get('/agent/:agentName', async (req, res) => {
  try {
    const { agentName } = req.params;
    const wallet = await Wallets.findOne({ agent_name: agentName });
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    res.json(wallet);
  } catch (error) {
    console.error('Error fetching wallet by agent name:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all wallets
router.get('/', async (req, res) => {
  try {
    const wallets = await Wallets.find({}).toArray();
    res.json(wallets);
  } catch (error) {
    console.error('Error fetching all wallets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get wallet by wallet ID
router.get('/id/:walletId', async (req, res) => {
  try {
    const { walletId } = req.params;
    const wallet = await Wallets.findOne({ walletId });
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    res.json(wallet);
  } catch (error) {
    console.error('Error fetching wallet by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
