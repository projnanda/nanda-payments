import { ObjectId } from 'mongodb';
import { MinorUnits } from './points';

// Wallet (linked by agent_name; NOT embedded on agent facts)
export interface Wallet {
  _id?: ObjectId | string;
  walletId: string; // unique wallet identifier
  agent_name: string; // FK to AgentFacts.agent_name
  balanceMinor: MinorUnits; // >= 0, always in NP minor units
  createdAt: string;
  updatedAt: string;
}
