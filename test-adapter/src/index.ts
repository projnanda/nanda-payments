/**
 * NANDA Adapter with Payment Integration
 *
 * TypeScript adaptation of the Python adapter with NANDA Points payment requirements
 * for the /api/send endpoint. Based on https://github.com/projnanda/adapter
 */

import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import {
  quickSetup,
  paymentMiddleware,
  createPaymentConfig,
  type ToolPaymentRequirement
} from '@nanda/payments-sdk';

// Load environment variables
config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'http://localhost:3001';
const AGENT_NAME = process.env.AGENT_NAME || 'nanda-adapter';
const AGENT_BRIDGE_URL = process.env.AGENT_BRIDGE_URL || 'http://localhost:3000';

// In-memory storage for messages and conversations (similar to Python version)
interface Message {
  id: string;
  content: string;
  timestamp: string;
  conversationId: string;
  clientId: string;
  response?: string;
}

interface Agent {
  name: string;
  url: string;
  status: 'online' | 'offline';
}

const messages: Message[] = [];
const conversations = new Map<string, Message[]>();
const connectedClients = new Set<express.Response>();

// Mock agent registry (in real implementation, this would come from a registry service)
const mockAgents: Agent[] = [
  { name: 'claude-agent', url: 'http://localhost:3000', status: 'online' },
  { name: 'gpt-agent', url: 'http://localhost:3001', status: 'online' },
  { name: 'local-bridge', url: AGENT_BRIDGE_URL, status: 'online' }
];

/**
 * Initialize NANDA Payments for the adapter
 */
async function initializePayments() {
  try {
    const payments = await quickSetup({
      facilitatorUrl: FACILITATOR_URL,
      agentName: AGENT_NAME
    });

    console.log(`✅ NANDA Payments initialized for agent: ${AGENT_NAME}`);
    console.log(`   Facilitator: ${FACILITATOR_URL}`);

    return payments;
  } catch (error) {
    console.error('❌ Failed to initialize NANDA Payments:', error);
    throw error;
  }
}

/**
 * Simulate message sending to agent bridge (similar to Python A2AClient)
 */
async function sendToAgentBridge(message: string, conversationId: string, clientId: string): Promise<string> {
  // In a real implementation, this would make HTTP requests to the agent bridge
  // For now, we'll simulate the response

  console.log(`📤 Sending to agent bridge: ${AGENT_BRIDGE_URL}`);
  console.log(`   Message: ${message.substring(0, 100)}...`);
  console.log(`   Conversation: ${conversationId}`);
  console.log(`   Client: ${clientId}`);

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Mock response (in real implementation, would come from actual agent)
  return `Agent processed: "${message}" - Response generated for conversation ${conversationId}`;
}

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Send message to SSE clients
 */
function broadcastMessage(message: Message) {
  const data = JSON.stringify(message);
  connectedClients.forEach(client => {
    try {
      client.write(`data: ${data}\n\n`);
    } catch (error) {
      // Remove disconnected clients
      connectedClients.delete(client);
    }
  });
}

// ==============================================================================
// API ROUTES
// ==============================================================================

/**
 * Health check endpoint (free)
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'nanda-adapter',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    payments: 'enabled'
  });
});

/**
 * List available agents (free)
 */
app.get('/api/agents/list', (req, res) => {
  res.json({
    agents: mockAgents,
    count: mockAgents.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * Get latest message (free)
 */
app.get('/api/render', (req, res) => {
  const latest = messages[messages.length - 1];
  res.json({
    message: latest || null,
    timestamp: new Date().toISOString()
  });
});

/**
 * Server-Sent Events for message streaming (free)
 */
app.get('/api/messages/stream', (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Add client to set
  connectedClients.add(res);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    connectedClients.delete(res);
  });
});

// ==============================================================================
// PAYMENT-PROTECTED ROUTES
// ==============================================================================

// Configure payment requirements for protected routes
const paymentConfig = createPaymentConfig({
  facilitatorUrl: FACILITATOR_URL,
  agentName: AGENT_NAME
});

// Apply payment middleware to protected routes
app.use(paymentMiddleware({
  'POST /api/send': {
    amount: 10, // 10 NANDA Points per message
    description: 'Send message to agent bridge',
    timeout: 30000
  },
  'POST /api/receive_message': {
    amount: 5, // 5 NANDA Points per received message
    description: 'Receive message from agent bridge',
    timeout: 30000
  }
}, paymentConfig));

/**
 * Send message to agent bridge (PAID - 10 NP)
 * Main endpoint that mirrors the Python adapter's /api/send functionality
 */
app.post('/api/send', async (req, res) => {
  try {
    const { message, conversation_id, client_id } = req.body;

    // Validate required fields
    if (!message) {
      return res.status(400).json({
        error: 'Message is required',
        code: 'MISSING_MESSAGE'
      });
    }

    // Generate IDs if not provided
    const conversationId = conversation_id || `conv_${Date.now()}`;
    const clientId = client_id || `client_${Date.now()}`;
    const messageId = generateMessageId();

    console.log(`💰 Paid message received from ${clientId}`);
    console.log(`   Payment verified, processing message...`);

    // Send to agent bridge
    const agentResponse = await sendToAgentBridge(message, conversationId, clientId);

    // Create message record
    const messageRecord: Message = {
      id: messageId,
      content: message,
      timestamp: new Date().toISOString(),
      conversationId,
      clientId,
      response: agentResponse
    };

    // Store message
    messages.push(messageRecord);

    // Update conversation
    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, []);
    }
    conversations.get(conversationId)!.push(messageRecord);

    // Broadcast to SSE clients
    broadcastMessage(messageRecord);

    // Return response (matches Python adapter format)
    res.json({
      success: true,
      message_id: messageId,
      conversation_id: conversationId,
      client_id: clientId,
      response: agentResponse,
      timestamp: messageRecord.timestamp,
      cost: '10 NP',
      payment_verified: true
    });

  } catch (error) {
    console.error('Error in /api/send:', error);
    res.status(500).json({
      error: 'Failed to process message',
      code: 'PROCESSING_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Receive message from agent bridge (PAID - 5 NP)
 * Endpoint for agent bridge to send messages back
 */
app.post('/api/receive_message', async (req, res) => {
  try {
    const { message, conversation_id, client_id, metadata } = req.body;

    if (!message) {
      return res.status(400).json({
        error: 'Message is required',
        code: 'MISSING_MESSAGE'
      });
    }

    const messageId = generateMessageId();
    const messageRecord: Message = {
      id: messageId,
      content: message,
      timestamp: new Date().toISOString(),
      conversationId: conversation_id || 'unknown',
      clientId: client_id || 'agent-bridge'
    };

    // Store message
    messages.push(messageRecord);

    // Broadcast to SSE clients
    broadcastMessage(messageRecord);

    console.log(`💰 Received paid message from agent bridge`);
    console.log(`   Message ID: ${messageId}`);

    res.json({
      success: true,
      message_id: messageId,
      received_at: messageRecord.timestamp,
      cost: '5 NP',
      payment_verified: true
    });

  } catch (error) {
    console.error('Error in /api/receive_message:', error);
    res.status(500).json({
      error: 'Failed to receive message',
      code: 'RECEIVE_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==============================================================================
// DEBUG/ADMIN ROUTES (FREE)
// ==============================================================================

/**
 * Get conversation history (free)
 */
app.get('/api/conversations/:id', (req, res) => {
  const conversationId = req.params.id;
  const conversation = conversations.get(conversationId) || [];

  res.json({
    conversation_id: conversationId,
    messages: conversation,
    count: conversation.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * Get all messages (free, for debugging)
 */
app.get('/api/messages', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const paginatedMessages = messages.slice(offset, offset + limit);

  res.json({
    messages: paginatedMessages,
    total: messages.length,
    limit,
    offset,
    timestamp: new Date().toISOString()
  });
});

/**
 * Get payment statistics (free)
 */
app.get('/api/stats', (req, res) => {
  const totalMessages = messages.length;
  const paidMessages = messages.filter(m => m.response).length;
  const totalRevenue = paidMessages * 10; // 10 NP per message

  res.json({
    total_messages: totalMessages,
    paid_messages: paidMessages,
    free_requests: totalMessages - paidMessages,
    total_revenue_np: totalRevenue,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ==============================================================================
// SERVER STARTUP
// ==============================================================================

async function startServer() {
  try {
    // Initialize payments
    await initializePayments();

    // Start server
    app.listen(PORT, HOST, () => {
      console.log('🚀 NANDA Adapter Server Started');
      console.log('=================================');
      console.log(`   Server: http://${HOST}:${PORT}`);
      console.log(`   Agent: ${AGENT_NAME}`);
      console.log(`   Facilitator: ${FACILITATOR_URL}`);
      console.log('');
      console.log('📡 Available Endpoints:');
      console.log('   GET  /api/health           - Health check (FREE)');
      console.log('   GET  /api/agents/list      - List agents (FREE)');
      console.log('   GET  /api/messages/stream  - SSE stream (FREE)');
      console.log('   POST /api/send             - Send message (10 NP) 💰');
      console.log('   POST /api/receive_message  - Receive message (5 NP) 💰');
      console.log('   GET  /api/render           - Latest message (FREE)');
      console.log('   GET  /api/conversations/:id - Conversation history (FREE)');
      console.log('   GET  /api/messages         - All messages (FREE)');
      console.log('   GET  /api/stats            - Payment statistics (FREE)');
      console.log('');
      console.log('💰 Payment Requirements:');
      console.log('   /api/send: 10 NANDA Points');
      console.log('   /api/receive_message: 5 NANDA Points');
      console.log('');
      console.log('✅ Ready to accept paid requests!');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down NANDA Adapter...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down NANDA Adapter...');
  process.exit(0);
});

// Start the server
startServer().catch(console.error);