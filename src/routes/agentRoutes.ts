import { ensureAgent, getAgent, setAgentServiceCharge } from '../services/agentService.js';
import { getWallet } from '../services/walletService.js';
import { AgentFacts, Wallet } from '../models/index.js';

export async function getAgentWithWallet(agent_name: string): Promise<{ agent: AgentFacts; wallet: Wallet } | null> {
  const agent = await ensureAgent(agent_name);
  if (!agent) {
    return null;
  }
  const wallet = await getWallet(agent_name);
  if (!wallet) {
    return null;
  }
  return { agent, wallet };
}

export { ensureAgent, getAgent, setAgentServiceCharge };
