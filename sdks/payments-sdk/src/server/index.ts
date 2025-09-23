/**
 * Server-side utilities for NANDA Points payments
 * Focused on MCP server developers who want to monetize their tools
 */

import {
  PaymentConfig,
  ToolPaymentRequirement,
  PaymentRequirements,
  PaymentPayload,
  NPPaymentError,
} from "../shared/types.js";
import { createFacilitatorClient, createPaymentRequirements } from "../shared/facilitator.js";

export * from "../shared/types.js";
export { createFacilitatorClient, createPaymentRequirements } from "../shared/facilitator.js";

/**
 * Create payment configuration for your server
 */
export function createPaymentConfig(config: PaymentConfig): PaymentConfig {
  return {
    timeout: 30000,
    retryCount: 3,
    retryDelay: 1000,
    ...config,
  };
}

/**
 * Require payment for a tool or function
 * This is the main API for MCP server developers
 */
export function requirePayment<T extends (...args: any[]) => any>(
  requirement: ToolPaymentRequirement,
  config: PaymentConfig
) {
  const facilitator = createFacilitatorClient(config.facilitatorUrl);

  return function (originalTool: T): T {
    return (async (...args: any[]) => {
      // Extract payment from the first argument if it contains payment context
      const firstArg = args[0];
      const paymentHeader = firstArg?.headers?.["x-payment"] || firstArg?.payment;

      if (!paymentHeader) {
        // Return payment requirements
        const requirements = createPaymentRequirements(
          requirement.amount,
          "tool://function",
          requirement.description || "Payment required for tool execution",
          requirement.recipient || config.agentName,
          config.facilitatorUrl
        );

        throw new NPPaymentError(
          "Payment required",
          "PAYMENT_REQUIRED",
          { requirements }
        );
      }

      try {
        // Decode and verify payment
        const payment: PaymentPayload = typeof paymentHeader === 'string'
          ? JSON.parse(atob(paymentHeader))
          : paymentHeader;

        const requirements = createPaymentRequirements(
          requirement.amount,
          "tool://function",
          requirement.description || "Payment for tool execution",
          requirement.recipient || config.agentName,
          config.facilitatorUrl
        );

        // Verify payment
        const verification = await facilitator.verify(payment, requirements);
        if (!verification.isValid) {
          throw new NPPaymentError(
            "Payment verification failed",
            "VERIFICATION_FAILED",
            verification
          );
        }

        // Execute the original tool
        const result = await originalTool(...args);

        // Settle payment after successful execution
        try {
          await facilitator.settle(payment, requirements);
        } catch (settlementError) {
          console.warn("Payment settlement failed:", settlementError);
          // Don't fail the response for settlement issues
        }

        return result;

      } catch (error) {
        if (error instanceof NPPaymentError) {
          throw error;
        }
        throw new NPPaymentError(
          "Payment processing failed",
          "PAYMENT_ERROR",
          error
        );
      }
    }) as T;
  };
}

/**
 * Create a payment-protected MCP tool handler
 * This integrates with the @modelcontextprotocol/sdk patterns
 */
export function createPaidTool<T extends Record<string, any>>(
  toolName: string,
  requirement: ToolPaymentRequirement,
  config: PaymentConfig,
  handler: (args: T, context?: any) => Promise<any>
) {
  const facilitator = createFacilitatorClient(config.facilitatorUrl);

  return {
    name: toolName,
    description: requirement.description || `Tool requiring ${requirement.amount} NP`,
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (args: T, context?: any) => {
      // Extract payment from context (this would come from MCP request headers)
      const paymentHeader = context?.headers?.["x-payment"];

      if (!paymentHeader) {
        // Return payment requirements instead of executing tool
        const requirements = createPaymentRequirements(
          requirement.amount,
          `tool://${toolName}`,
          requirement.description || `Payment required for ${toolName}`,
          requirement.recipient || config.agentName,
          config.facilitatorUrl
        );

        throw new NPPaymentError(
          "Payment required",
          "PAYMENT_REQUIRED",
          { requirements }
        );
      }

      try {
        // Decode payment
        const payment: PaymentPayload = JSON.parse(atob(paymentHeader));

        // Create requirements for verification
        const requirements = createPaymentRequirements(
          requirement.amount,
          `tool://${toolName}`,
          requirement.description || `Payment for ${toolName}`,
          requirement.recipient || config.agentName,
          config.facilitatorUrl
        );

        // Verify payment
        const verification = await facilitator.verify(payment, requirements);
        if (!verification.isValid) {
          throw new NPPaymentError(
            "Payment verification failed",
            "VERIFICATION_FAILED",
            verification
          );
        }

        // Execute the tool
        const result = await handler(args, context);

        // Settle payment after successful execution
        try {
          await facilitator.settle(payment, requirements);
        } catch (settlementError) {
          console.warn("Payment settlement failed:", settlementError);
          // Don't fail the response for settlement issues
        }

        return result;

      } catch (error) {
        if (error instanceof NPPaymentError) {
          throw error;
        }
        throw new NPPaymentError(
          "Payment processing failed",
          "PAYMENT_ERROR",
          error
        );
      }
    }
  };
}

/**
 * Express middleware for payment verification
 * For developers using Express.js servers
 */
export function paymentMiddleware(
  routes: Record<string, ToolPaymentRequirement>,
  config: PaymentConfig
) {
  const facilitator = createFacilitatorClient(config.facilitatorUrl);

  return async (req: any, res: any, next: any) => {
    const routeConfig = routes[req.path] || routes[`${req.method} ${req.path}`];

    if (!routeConfig) {
      return next(); // No payment required
    }

    const payment = req.header("X-PAYMENT");

    if (!payment) {
      const requirements = createPaymentRequirements(
        routeConfig.amount,
        `${req.protocol}://${req.headers.host}${req.originalUrl}`,
        routeConfig.description || `Payment required`,
        routeConfig.recipient || config.agentName,
        config.facilitatorUrl
      );

      return res.status(402).json({
        x402Version: 1,
        error: "X-PAYMENT header is required",
        accepts: [requirements],
      });
    }

    try {
      const decodedPayment: PaymentPayload = JSON.parse(atob(payment));
      const requirements = createPaymentRequirements(
        routeConfig.amount,
        `${req.protocol}://${req.headers.host}${req.originalUrl}`,
        routeConfig.description || `Payment required`,
        routeConfig.recipient || config.agentName,
        config.facilitatorUrl
      );

      const verification = await facilitator.verify(decodedPayment, requirements);
      if (!verification.isValid) {
        return res.status(402).json({
          x402Version: 1,
          error: verification.invalidReason,
          accepts: [requirements],
        });
      }

      // Store payment info for settlement after successful response
      req.payment = decodedPayment;
      req.paymentRequirements = requirements;

      return next();

    } catch (error) {
      return res.status(402).json({
        x402Version: 1,
        error: "Invalid payment header",
        accepts: [createPaymentRequirements(
          routeConfig.amount,
          `${req.protocol}://${req.headers.host}${req.originalUrl}`,
          routeConfig.description || `Payment required`,
          routeConfig.recipient || config.agentName,
          config.facilitatorUrl
        )],
      });
    }
  };
}