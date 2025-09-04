import { Express } from "express";
import { health } from "./health.js";
import { agents } from "./agents.js";
import { wallets } from "./wallets.js";
import { transactions } from "./transactions.js";

export function mountApi(app: Express) {
  app.use(health);
  app.use(agents);
  app.use(wallets);
  app.use(transactions);
}
