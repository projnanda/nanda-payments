import { Router } from 'express';
import { Receipts } from '../services/database.js';

const router = Router();

// Get all receipts
router.get('/', async (req, res) => {
  try {
    const receipts = await Receipts.find({}).toArray();
    res.json(receipts);
  } catch (error) {
    console.error('Error fetching all receipts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get receipts by agent name (both sent and received)
router.get('/agent/:agentName', async (req, res) => {
  try {
    const { agentName } = req.params;
    const receipts = await Receipts.find({
      $or: [
        { fromAgent: agentName },
        { toAgent: agentName }
      ]
    }).toArray();
    
    res.json(receipts);
  } catch (error) {
    console.error('Error fetching receipts by agent name:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get receipt by receipt ID (MongoDB _id)
router.get('/id/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await Receipts.findOne({ _id: id });
    
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    
    res.json(receipt);
  } catch (error) {
    console.error('Error fetching receipt by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get receipt by transaction ID
router.get('/transaction/:txId', async (req, res) => {
  try {
    const { txId } = req.params;
    const receipt = await Receipts.findOne({ txId });
    
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    
    res.json(receipt);
  } catch (error) {
    console.error('Error fetching receipt by transaction ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
