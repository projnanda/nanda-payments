import { Receipts } from './database.js';
import { Receipt } from '../models/index.js';

export async function getReceiptByTx(txId: string): Promise<Receipt | null> {
  return Receipts.findOne({ txId });
}
