/**
 * NANDA Points facilitator client
 * Handles communication with the NANDA Points facilitator service
 */

import {
  PaymentRequirements,
  PaymentPayload,
  VerificationResponse,
  SettlementResponse,
  SupportedResponse,
  NPPaymentError,
} from "./types.js";

export interface FacilitatorClient {
  verify(
    payment: PaymentPayload,
    requirements: PaymentRequirements
  ): Promise<VerificationResponse>;
  settle(
    payment: PaymentPayload,
    requirements: PaymentRequirements
  ): Promise<SettlementResponse>;
  supported(): Promise<SupportedResponse>;
}

/**
 * Create NANDA Points facilitator client
 * Provides x402-compliant communication with the facilitator
 */
export function createFacilitatorClient(facilitatorUrl: string): FacilitatorClient {
  return {
    async verify(payment, requirements) {
      const response = await fetch(`${facilitatorUrl}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "@nanda/payments-sdk"
        },
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
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "@nanda/payments-sdk"
        },
        body: JSON.stringify({ payment, paymentRequirements: requirements }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new NPPaymentError("Settlement failed", "SETTLEMENT_ERROR", result);
      }

      return result;
    },

    async supported() {
      const response = await fetch(`${facilitatorUrl}/supported`, {
        headers: {
          "User-Agent": "@nanda/payments-sdk"
        }
      });

      if (!response.ok) {
        throw new NPPaymentError("Failed to get supported schemes", "FACILITATOR_ERROR");
      }

      return await response.json();
    },
  };
}

/**
 * Create payment requirements for NANDA Points
 */
export function createPaymentRequirements(
  amount: number,
  resource: string,
  description: string,
  payTo: string,
  facilitatorUrl: string,
  options: {
    timeout?: number;
    mimeType?: string;
  } = {}
): PaymentRequirements {
  return {
    scheme: "nanda-points",
    network: "nanda-network",
    maxAmountRequired: amount.toString(),
    resource,
    description,
    mimeType: options.mimeType || "application/json",
    payTo,
    maxTimeoutSeconds: options.timeout || 60,
    asset: "NP",
    extra: {
      facilitatorUrl,
    },
  };
}