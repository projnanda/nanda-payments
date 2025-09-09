import { ethers } from 'ethers';

console.log("🎬 Unified AI Agent Marketplace - Complete Demo");
console.log("===============================================");

// Your client wallet details
const CLIENT_WALLET = "0x30F1FF848c916B33d89f4C377796919FC90B8ce2";
const CLIENT_PRIVATE_KEY = "0x5b38d7a0331e191626054d56a4627abc0cd657a7d659d205face06e13e90898b";

console.log("\n👤 Your Client Wallet:");
console.log(`   Address: ${CLIENT_WALLET}`);
console.log(`   Status: ✅ Ready (ETH added)`);

console.log("\n🤖 Available Agents (8 Total):");
console.log("=============================");
console.log("🥇 1. NANDA Store (95/100) - Research");
console.log("🥈 2. Google Agentspace (92/100) - Research");
console.log("🥉 3. IBM Agent Connect (91/100) - Analysis");
console.log("🏅 4. Berkeley Marketplace (89/100) - Analysis");
console.log("🏅 5. SwarmZero (88/100) - Research");
console.log("🏅 6. Salesforce AgentExchange (87/100) - Writing");
console.log("🏅 7. AWS AI Agents (85/100) - Research");
console.log("🏅 8. Metaschool (84/100) - Writing");

console.log("\n💸 Transaction Flow Demo:");
console.log("========================");
console.log("1. Client selects: NANDA Store (95/100 reputation)");
console.log("2. Task: 'Research latest AI developments'");
console.log("3. Payment: 0.001 ETH deducted from client");
console.log("4. Agent receives: 0.001 ETH + 1450 NP points");
console.log("5. Client rates: 90/100");
console.log("6. Agent reputation: 95 → 96");

console.log("\n📊 Updated Balances:");
console.log("===================");
console.log("👤 Client: 0.999 ETH (was 1.0)");
console.log("🤖 NANDA Store: 0.001 ETH + 1450 NP");

console.log("\n🎯 How to Test the System:");
console.log("==========================");
console.log("1. Start server: npm run dev");
console.log("2. Open frontend: open frontend/index.html");
console.log("3. Use your wallet address in the demo");
console.log("4. Create transactions via API calls");
console.log("5. Watch real-time updates via WebSocket");

console.log("\n📡 API Endpoints:");
console.log("================");
console.log("POST /api/wallets/create - Create wallet");
console.log("POST /api/agents/register - Register agents");
console.log("POST /api/transactions/create - Hire agents");
console.log("GET /api/wallets/agent/{did} - Check balances");
console.log("WebSocket ws://localhost:3000/ws - Real-time events");

console.log("\n✅ System Ready!");
console.log("===============");
console.log("Your wallet can now hire any of the 8 agents.");
console.log("Each agent charges 0.001 ETH per task.");
console.log("Higher reputation = better performance = more NP rewards!");

// Test API calls
console.log("\n🔧 Testing API calls...");
try {
  const response = await fetch('http://localhost:3000/api/health');
  if (response.ok) {
    console.log("✅ Server is running and responding");
  } else {
    console.log("❌ Server not responding properly");
  }
} catch (error) {
  console.log("❌ Server not running. Start with: npm run dev");
}
