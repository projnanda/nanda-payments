import { NandaPointsRest } from './rest.js';

export interface PaywallConfig {
  priceNP: number; // price in NP points (major units)
  recipient: string; // recipient agent name
  description?: string;
}

export interface PaywallOptions {
  nandaBaseUrl: string; // e.g. http://localhost:3000
}

// Express-like middleware: (req, res, next) => void
export function x402NpExpress(config: PaywallConfig, options: PaywallOptions) {
  const rest = new NandaPointsRest({ baseUrl: options.nandaBaseUrl });

  return async (req: any, res: any, next: any) => {
    const agent = header(req, 'x-payment-agent');
    const txId = header(req, 'x-payment-tx-id');
    const amount = header(req, 'x-payment-amount');

    if (!agent || !txId || !amount) {
      return res.status(402).json(paymentRequiredBody(config));
    }

    try {
      const receipt = await rest.getReceiptByTx(txId);
      if ((receipt as any)?.error) {
        return res.status(402).json(errorBody('Payment receipt not found', { txId }));
      }
      const r: any = receipt;
      const amountPoints = r.scale != null ? r.amountMinor / Math.pow(10, r.scale) : undefined;

      if (r.fromAgent !== agent || r.toAgent !== config.recipient) {
        return res.status(402).json(errorBody('Payment party mismatch', {
          expected: { from: agent, to: config.recipient },
          actual: { from: r.fromAgent, to: r.toAgent }
        }));
      }
      if (amountPoints !== config.priceNP || String(amount) !== String(config.priceNP)) {
        return res.status(402).json(errorBody('Invalid payment amount', {
          expected: config.priceNP,
          received: amountPoints
        }));
      }

      return next();
    } catch (e: any) {
      return res.status(500).json(errorBody('Internal error verifying payment', { error: String(e?.message || e) }));
    }
  };
}

function header(req: any, name: string): string | undefined {
  const v = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

function paymentRequiredBody(config: PaywallConfig) {
  return {
    error: 'PAYMENT_REQUIRED',
    protocol: 'x402-np',
    price: { amount: config.priceNP, currency: 'NP' },
    recipient: config.recipient,
    description: config.description ?? 'Payment required',
    instructions: {
      steps: [
        `Pay ${config.priceNP} NP to ${config.recipient} using initiateTransaction`,
        'Retry with headers:',
        'X-PAYMENT-AGENT, X-PAYMENT-TX-ID, X-PAYMENT-AMOUNT'
      ]
    }
  };
}

function errorBody(message: string, data?: unknown) {
  return { error: message, details: data };
}


