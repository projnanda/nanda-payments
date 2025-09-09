import express from 'express';
import { UnifiedAgentModel } from '../models/UnifiedAgent.js';

const router = express.Router();

/**
 * Get agent reputation
 * GET /reputation/:agentId
 */
router.get('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;

    const agent = await UnifiedAgentModel.findOne({ 
      $or: [{ did: agentId }, { ethereumAddress: agentId }] 
    });
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({
      success: true,
      reputation: {
        agentDid: agent.did,
        score: agent.reputation.score,
        totalTasks: agent.reputation.totalTasks,
        successfulTasks: agent.reputation.successfulTasks,
        averageRating: agent.reputation.averageRating,
        lastUpdated: agent.reputation.lastUpdated,
        trend: agent.reputation.trend,
        reliability: agent.reputation.reliability,
        performance: {
          successRate: agent.performance.successRate,
          clientSatisfaction: agent.performance.clientSatisfaction,
          averageCompletionTime: agent.performance.averageCompletionTime
        }
      }
    });
  } catch (error) {
    console.error('Error fetching reputation:', error);
    res.status(500).json({ error: 'Failed to fetch reputation' });
  }
});

/**
 * Get reputation leaderboard
 * GET /reputation/leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 20, specialty } = req.query;

    const filter: any = { status: 'active' };
    if (specialty) filter.specialties = { $in: [specialty] };

    const agents = await UnifiedAgentModel.find(filter)
      .sort({ 'reputation.score': -1 })
      .limit(Number(limit))
      .select('did identity reputation specialties pricing performance');

    res.json({
      success: true,
      leaderboard: agents.map(agent => ({
        rank: agents.indexOf(agent) + 1,
        agentDid: agent.did,
        agentName: agent.identity.agentName,
        score: agent.reputation.score,
        totalTasks: agent.reputation.totalTasks,
        averageRating: agent.reputation.averageRating,
        specialties: agent.specialties,
        minimumPrice: agent.pricing.minimumPrice,
        successRate: agent.performance.successRate
      }))
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * Update reputation (admin only)
 * POST /reputation/update
 */
router.post('/update', async (req, res) => {
  try {
    const { agentDid, newScore, reason } = req.body;

    if (!agentDid || !newScore) {
      return res.status(400).json({ error: 'Agent DID and new score are required' });
    }

    const agent = await UnifiedAgentModel.findOne({ did: agentDid });
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const previousScore = agent.reputation.score;
    agent.reputation.score = Math.max(10, Math.min(100, newScore));
    agent.reputation.lastUpdated = new Date().toISOString();
    agent.reputation.trend = newScore > previousScore ? 'increasing' : 
                           newScore < previousScore ? 'decreasing' : 'stable';
    agent.updatedAt = new Date().toISOString();

    await agent.save();

    res.json({
      success: true,
      reputation: {
        agentDid: agent.did,
        previousScore,
        newScore: agent.reputation.score,
        trend: agent.reputation.trend,
        reason: reason || 'Manual update'
      }
    });
  } catch (error) {
    console.error('Error updating reputation:', error);
    res.status(500).json({ error: 'Failed to update reputation' });
  }
});

export default router;
