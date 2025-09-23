/**
 * NANDA Points Express middleware
 * Replaces x402-express with NP-specific implementation
 */

import { NextFunction, Request, Response } from "express";
import {
  PaymentRequirements,
  PaymentPayload,
  NPRoutesConfig,
  NPPaymentConfig,
  NPPaymentError,
} from "./types.js";
import { nandaPoints, npUtils } from "./nanda-points-scheme.js";

export interface NPFacilitatorClient {
  verify(payment: PaymentPayload, requirements: PaymentRequirements): Promise<{
    isValid: boolean;
    invalidReason?: string;
    payer?: string;
  }>;
  settle(payment: PaymentPayload, requirements: PaymentRequirements): Promise<{
    success: boolean;
    txId: string;
    amount: string;
    from: string;
    to: string;
    timestamp: number;
    errorReason?: string;
  }>;
  supported(): Promise<{
    kinds: Array<{
      scheme: "nanda-points";
      network: "nanda-network";
      asset: "NP";
    }>;
  }>;
}

/**
 * Create NP facilitator client
 * Replaces x402's useFacilitator()
 */
export function createNPFacilitatorClient(facilitatorUrl: string): NPFacilitatorClient {
  return {
    async verify(payment, requirements) {
      const response = await fetch(`${facilitatorUrl}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment, paymentRequirements: requirements }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          isValid: false,
          invalidReason: error.invalidReason || "Verification failed",
        };
      }

      return await response.json();
    },

    async settle(payment, requirements) {
      const response = await fetch(`${facilitatorUrl}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment, paymentRequirements: requirements }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new NPPaymentError("Settlement failed", "SETTLEMENT_ERROR", result);
      }

      return result;
    },

    async supported() {
      const response = await fetch(`${facilitatorUrl}/supported`);
      if (!response.ok) {
        throw new NPPaymentError("Failed to get supported schemes", "FACILITATOR_ERROR");
      }
      return await response.json();
    },
  };
}

/**
 * Payment middleware for NANDA Points
 * Replaces x402-express paymentMiddleware
 */
export function npPaymentMiddleware(
  routes: NPRoutesConfig,
  facilitatorUrl: string
) {
  const facilitator = createNPFacilitatorClient(facilitatorUrl);
  const x402Version = 1;

  return async function npPaymentMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Find matching route
    const routeConfig = findMatchingRoute(routes, req.path, req.method);
    if (!routeConfig) {
      return next(); // No payment required for this route
    }

    const resource = `${req.protocol}://${req.headers.host}${req.originalUrl}`;
    const paymentRequirements = nandaPoints.createPaymentRequirements(
      routeConfig,
      resource,
      facilitatorUrl
    );

    const payment = req.header("X-PAYMENT");

    // No payment provided - return 402
    if (!payment) {
      res.status(402).json({
        x402Version,
        error: "X-PAYMENT header is required",
        accepts: [paymentRequirements],
      });
      return;
    }

    // Decode and validate payment
    let decodedPayment: PaymentPayload;
    try {
      decodedPayment = nandaPoints.decodePayment(payment);
      decodedPayment.x402Version = x402Version;
    } catch (error) {
      res.status(402).json({
        x402Version,
        error: error instanceof NPPaymentError ? error.message : "Invalid payment header",
        accepts: [paymentRequirements],
      });
      return;
    }

    // Verify payment
    try {
      const verification = await facilitator.verify(decodedPayment, paymentRequirements);
      if (!verification.isValid) {
        res.status(402).json({
          x402Version,
          error: verification.invalidReason,
          accepts: [paymentRequirements],
          payer: verification.payer,
        });
        return;
      }
    } catch (error) {
      res.status(402).json({
        x402Version,
        error: error instanceof Error ? error.message : "Payment verification failed",
        accepts: [paymentRequirements],
      });
      return;
    }

    // Intercept response to settle payment after successful request
    const originalEnd = res.end.bind(res);
    let endArgs: Parameters<typeof res.end> | null = null;

    res.end = function (chunk: any, encoding?: BufferEncoding, cb?: () => void) {
      endArgs = [chunk, encoding, cb];
      return res;
    } as any;

    // Continue to route handler
    await next();

    // If response was successful, settle payment
    if (res.statusCode < 400) {
      try {
        const settlement = await facilitator.settle(decodedPayment, paymentRequirements);
        if (settlement.success) {
          // Create X-PAYMENT-RESPONSE header
          const responseHeader = btoa(JSON.stringify({
            txId: settlement.txId,
            amount: settlement.amount,
            from: settlement.from,
            to: settlement.to,
            timestamp: settlement.timestamp,
          }));
          res.setHeader("X-PAYMENT-RESPONSE", responseHeader);
        }
      } catch (error) {
        console.error("Payment settlement failed:", error);
        // Continue anyway - don't fail the response for settlement issues
      }
    }

    // Send the original response
    res.end = originalEnd;
    if (endArgs) {
      originalEnd(...endArgs);
    }
  };
}

/**
 * Find matching route configuration
 */
function findMatchingRoute(
  routes: NPRoutesConfig,
  path: string,
  method: string
): NPPaymentConfig | null {
  // Check exact matches first
  const exactKey = `${method.toUpperCase()} ${path}`;
  if (routes[exactKey]) {
    return routes[exactKey];
  }

  // Check pattern matches
  for (const [route, config] of Object.entries(routes)) {
    if (matchesRoute(route, path, method)) {
      return config;
    }
  }

  return null;
}

/**
 * Check if path matches route pattern
 */
function matchesRoute(route: string, path: string, method: string): boolean {
  const [routeMethod, routePath] = route.includes(" ")
    ? route.split(" ", 2)
    : ["*", route];

  // Check method
  if (routeMethod !== "*" && routeMethod.toUpperCase() !== method.toUpperCase()) {
    return false;
  }

  // Convert route pattern to regex
  const pattern = routePath
    .replace(/\*/g, ".*")
    .replace(/\//g, "\\/");

  const regex = new RegExp(`^${pattern}$`);
  return regex.test(path);
}