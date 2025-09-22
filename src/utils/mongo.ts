import 'dotenv/config';
import { MongoClient, Db } from 'mongodb';

export const DEFAULT_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
export const DEFAULT_DB = process.env.NP_DB_NAME || 'nanda_points';

export let client: MongoClient;
export let db: Db;

/**
 * Initialize a single shared Mongo connection and DB handle.
 * Safe to call multiple times; connects only once.
 */
export async function initMongo() {
  if (client) return;
  client = new MongoClient(DEFAULT_URI);
  await client.connect();
  db = client.db(DEFAULT_DB);
}

export async function closeMongo() {
  if (client) {
    await client.close();
  }
}
