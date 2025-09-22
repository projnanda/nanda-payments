import { ObjectId } from 'mongodb';
import { MinorUnits } from './points';

export interface Txn {
  _id?: ObjectId | string; // Mongo _id
  txId: string; // uuid string
  fromAgent: string; // agent_name of sender
  toAgent: string; // agent_name of receiver
  amountMinor: MinorUnits;
  currency: "NP";
  scale: 0;
  createdAt: string;
  status: "completed" | "rejected";
  error?: string | null;
  task: string; // task that the transaction was completed for
}
