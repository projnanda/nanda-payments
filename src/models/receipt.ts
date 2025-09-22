import { ObjectId } from 'mongodb';
import { MinorUnits } from './points';

export interface Receipt {
  _id?: ObjectId | string;
  txId: string; // mirrors transaction
  issuedAt: string;
  fromAgent: string; // agent_name of sender
  toAgent: string; // agent_name of receiver
  amountMinor: MinorUnits;
  fromBalanceAfter: MinorUnits;
  toBalanceAfter: MinorUnits;
}
