import express from 'express';
import cors from 'cors';
import { initMongo } from '../services/index.js';
import apiRoutes from './index.js';

// Environment configuration
const API_PORT = process.env.API_PORT ? parseInt(process.env.API_PORT, 10) : 8080;
const HOST = process.env.HOST || 'localhost';

// Initialize MongoDB connection
await initMongo();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Nanda Points API Server', 
    version: '0.2.0',
    endpoints: {
      wallets: '/api/wallets',
      transactions: '/api/transactions',
      receipts: '/api/receipts',
      health: '/api/health'
    }
  });
});

// Start the API server
app.listen(API_PORT, HOST, () => {
  console.log(`🚀 NANDA Points API Server running at http://${HOST}:${API_PORT}`);
  console.log(`📡 API endpoints: http://${HOST}:${API_PORT}/api`);
  console.log(`💊 Health check: http://${HOST}:${API_PORT}/api/health`);
});
