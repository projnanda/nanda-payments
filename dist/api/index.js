import { health } from "./health.js";
import { agents } from "./agents.js";
import { wallets } from "./wallets.js";
import { transactions } from "./transactions.js";
import { reputationTransactions } from "./reputationTransactions.js";
import { invoices } from "./invoices.js";
import { events } from "./events.js";
export function mountApi(app) {
    app.use(health);
    app.use(agents);
    app.use(wallets);
    app.use(transactions);
    app.use(reputationTransactions); // Add reputation endpoints
    app.use(invoices); // Add invoice endpoints
    app.use(events); // Add events endpoints
}
