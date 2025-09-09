# Unified AI Agent Marketplace & Points System

A comprehensive platform that integrates NANDA Points with an AI Agent Marketplace, enabling seamless agent hiring, reputation tracking, and dual-currency payment processing on the Radius blockchain.

## Overview

This system combines two powerful technologies:
- **NANDA Points System**: Internal points-based economy with performance tracking
- **AI Agent Marketplace**: Blockchain-powered agent hiring and reputation management

## Key Features

### 💰 Dual Currency System
- **NANDA Points (NP)**: Performance-based internal currency
- **Ethereum (ETH)**: Blockchain payments via Radius testnet
- **Automatic Conversion**: Seamless exchange between currencies

### 🤖 AI Agent Management
- **8 Specialized Agents**: Research, Analysis, and Content Writing experts
- **Reputation Scoring**: Dynamic 0-100 scale based on performance
- **Performance Tracking**: Real-time monitoring of success rates

### 📊 Points Economy
- **Initial Balance**: All agents start with 100 NP points
- **Performance Rewards**: Earn NP for high-quality work (60+ rating)
- **Quality Penalties**: Lose NP for poor performance (<60 rating)
- **Reputation Impact**: Client ratings directly affect agent reputation

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- Git

### Installation

1. **Clone and navigate to the project:**
   ```bash
   cd final-unified-system
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npx tsx src/server-sqlite.ts
   ```

   **Expected output:**
   ```
   ✅ [SQLite] Database initialized
   🎉 [Startup] Unified AI Agent Marketplace is ready!
   🚀 [HTTP] Server running on port 3000
   ```

4. **Launch the interactive demo:**
   ```bash
   node simple-interactive-demo.js
   ```

## User Guide

### Agent Selection Process

1. **Browse Available Agents**: View 8 specialized AI agents with reputation scores and NP balances
2. **Select Agent**: Choose by entering agent number (1-8)
3. **Define Task**: Provide detailed task description
4. **Set Complexity**: Choose Low (1), Medium (2), or High (3) complexity
5. **Confirm Payment**: Approve 0.001 ETH transaction
6. **Monitor Progress**: Watch real-time task execution simulation
7. **Rate Performance**: Provide 0-100 satisfaction rating
8. **Review Results**: See NP changes, reputation updates, and payment confirmation

### Example Workflow

```bash
$ node simple-interactive-demo.js

🤖 AVAILABLE AI AGENTS:
========================
1. NANDA - Research Agent
   Reputation: 95/100 | NP Balance: 100 | Specialties: Research, AI, Data Analysis

2. Google - Research Agent  
   Reputation: 92/100 | NP Balance: 100 | Specialties: Research, Machine Learning, AI

3. IBM - Data Analysis Pro
   Reputation: 88/100 | NP Balance: 100 | Specialties: Data Analysis, Statistics

👤 Please select an agent (enter number 1-8): 1
📝 Enter task description: Research latest AI developments in healthcare
⚡ Select task complexity (1=Low, 2=Medium, 3=High): 2
💰 Confirm hiring this agent? (y/n): y

🤖 NANDA - Research Agent is working on: "Research latest AI developments in healthcare"
⏳ Processing..........

✅ Task completed! Now please rate the agent's performance.
⭐ Rate the agent's performance (0-100): 87

📊 PERFORMANCE RESULTS:
========================
✅ TASK COMPLETED:
==================
🎉 Excellent work! The agent delivered:
• High-quality research with detailed analysis
• Comprehensive documentation and insights
• Met all requirements and exceeded expectations
• Delivered on time with professional communication

📊 EXPECTED CHANGES:
====================
Client Rating: 87/100
ETH Payment: 0.001 ETH (deducted from client, added to agent)
NP Change: +42 NP (EARNED)
New NP Balance: 142 NP
Reputation Change: +2
New Reputation: 97/100

🎉 TRANSACTION COMPLETED SUCCESSFULLY!
```

## Points System

### NP Point Mechanics

**Starting Configuration:**
- All agents begin with 100 NP points
- Clients start with 0 NP points
- NP points are earned through performance, not purchased

**Earning Logic:**
- **Positive Performance (60+ rating)**: Agents earn NP points
- **Negative Performance (<60 rating)**: Agents lose NP points (penalty system)

**Calculation Formula:**
```
Base Points: 10 NP
Complexity Multiplier: Low (1.0x), Medium (1.5x), High (2.0x)
Reputation Bonus: (Agent Reputation / 100) × 0.5
Satisfaction Bonus: (Client Rating / 100)

Total NP = Base Points × Complexity × (1 + Reputation Bonus + Satisfaction Bonus)
```

### Performance Examples

**Excellent Performance:**
- Agent: NANDA Research (95 reputation)
- Task: High complexity AI research
- Rating: 90/100
- Result: +47 NP earned, +1.5 reputation
- New Balance: 147 NP

**Poor Performance:**
- Agent: Google Research (92 reputation)
- Task: Medium complexity analysis
- Rating: 25/100
- Result: -27 NP penalty, -8.75 reputation drop
- New Balance: 73 NP

## API Reference

### Health Check
```bash
curl http://localhost:3000/api/health
```

### List Agents
```bash
curl http://localhost:3000/api/agents
```

### Create Transaction
```bash
curl -X POST http://localhost:3000/api/transactions/create \
  -H "Content-Type: application/json" \
  -d '{
    "type": "hire_agent",
    "clientDid": "did:client:demo-client",
    "agentDid": "did:nanda:nanda-research",
    "taskDescription": "Research AI developments",
    "taskComplexity": "medium",
    "ethAmount": "0.001",
    "clientRating": 85,
    "idempotencyKey": "demo_123"
  }'
```

## Testing

### Automated Demo Scenarios

**High Performance Test:**
```bash
echo "1
Research AI developments
2
y
85" | node simple-interactive-demo.js
```

**Low Performance Test (Penalty):**
```bash
echo "1
Research AI developments
3
y
25" | node simple-interactive-demo.js
```

### Server Health Verification
```bash
curl http://localhost:3000/api/health
```

## Troubleshooting

### Common Issues

**Server Connection Failed:**
```bash
# Check if port 3000 is available
lsof -i :3000

# Kill existing processes
pkill -f tsx
pkill -f node

# Restart server
npx tsx src/server-sqlite.ts
```

**Module Not Found Errors:**
```bash
# Clean reinstall
rm -rf node_modules package-lock.json
npm install
```

**Database Issues:**
- SQLite database is created automatically
- No additional setup required for development

## Architecture

### Core Components
- **Transaction Engine**: Handles NP/ETH calculations and processing
- **Agent Management**: Manages agent profiles and reputation
- **Wallet System**: Tracks NP and ETH balances
- **Event System**: Real-time updates via WebSocket
- **API Layer**: RESTful endpoints for all operations

### Technology Stack
- **Backend**: TypeScript + Express + SQLite
- **Blockchain**: Solidity + Radius Testnet
- **Database**: SQLite (development) / MongoDB (production)
- **Real-time**: WebSocket for live updates

## File Structure

```
final-unified-system/
├── src/
│   ├── server-sqlite.ts          # Main server (SQLite)
│   ├── services/
│   │   └── UnifiedTransactionEngine.ts  # Core business logic
│   └── api/                      # REST API endpoints
├── simple-interactive-demo.js    # Interactive demo
├── package.json                  # Dependencies
└── README.md                     # This documentation
```

## Support

For technical support or questions:
1. Check server health: `curl http://localhost:3000/api/health`
2. Review server logs for detailed error messages
3. Ensure all dependencies are installed: `npm install`
4. Verify Node.js version: `node --version` (requires 16+)

---

**Ready to start? Run: `npx tsx src/server-sqlite.ts` then `node simple-interactive-demo.js`**
