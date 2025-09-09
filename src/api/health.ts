import express from 'express';
import mongoose from 'mongoose';
import { ethers } from 'ethers';

const router = express.Router();

/**
 * Basic health check
 * GET /health
 */
router.get('/', async (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'running',
        database: mongoStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Detailed health check
 * GET /health/detailed
 */
router.get('/detailed', async (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const mongoPing = mongoose.connection.readyState === 1 ? 'ok' : 'failed';
    
    // Test blockchain connection
    let blockchainStatus = 'disconnected';
    let blockchainPing = 'failed';
    
    try {
      const provider = new ethers.JsonRpcProvider(process.env.RADIUS_RPC_URL);
      const blockNumber = await provider.getBlockNumber();
      blockchainStatus = 'connected';
      blockchainPing = 'ok';
    } catch (error) {
      console.error('Blockchain connection error:', error);
    }

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        api: {
          status: 'running',
          uptime: process.uptime()
        },
        database: {
          status: mongoStatus,
          ping: mongoPing,
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          name: mongoose.connection.name
        },
        blockchain: {
          status: blockchainStatus,
          ping: blockchainPing,
          rpcUrl: process.env.RADIUS_RPC_URL ? 'configured' : 'not configured'
        }
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

export default router;
