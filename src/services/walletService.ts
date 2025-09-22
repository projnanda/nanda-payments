import { randomUUID } from "crypto";
import { Wallets, Agents } from './database.js';
import { Wallet, NP, createMinorUnits, MinorUnits, AgentFacts } from '../models/index.js';

export const DEFAULT_SEED_POINTS = 1000; // new agent seed

function nowIso() { return new Date().toISOString(); }

export async function ensureWallet(agent_name: string, seedPoints?: number): Promise<Wallet> {
  const createdAt = nowIso();
  const seedMinor = NP.toMinorUnits(seedPoints ?? DEFAULT_SEED_POINTS);

  let wallet = await Wallets.findOne({ agent_name });
  if (!wallet) {
    const walletId = randomUUID();
    const toInsertWallet: Wallet = {
      walletId,
      agent_name,
      balanceMinor: seedMinor,
      createdAt,
      updatedAt: createdAt
    };
    try {
      await Wallets.insertOne(toInsertWallet);
    } catch (e: any) {
      if (!(e && e.code === 11000)) throw e;
    }
    wallet = await Wallets.findOne({ agent_name });
  }

  return wallet!;
}

export async function getWallet(agent_name: string): Promise<Wallet | null> {
  return Wallets.findOne({ agent_name });
}

export async function getBalanceMinor(agent_name: string): Promise<MinorUnits> {
  const w = await getWallet(agent_name);
  return w?.balanceMinor ?? createMinorUnits(0);
}

export async function attachWallet(agent_name: string, seedPoints?: number): Promise<{ agent: AgentFacts; wallet: Wallet } | null> {
  // First verify the agent exists
  const agent = await Agents.findOne({ agent_name });
  if (!agent) {
    return null;
  }

  // Check if agent already has a wallet attached
  if (agent.walletId) {
    const existingWallet = await getWallet(agent_name);
    if (existingWallet) {
      return { agent, wallet: existingWallet };
    }
  }

  // Create a new wallet for the agent
  const wallet = await ensureWallet(agent_name, seedPoints ?? DEFAULT_SEED_POINTS);
  
  // Update the agent with the walletId
  await Agents.updateOne(
    { agent_name }, 
    { $set: { walletId: wallet.walletId, updated_at: nowIso() } }
  );
  
  // Return the updated agent with the wallet
  const updatedAgent = await Agents.findOne({ agent_name });
  return { agent: updatedAgent!, wallet };
}
