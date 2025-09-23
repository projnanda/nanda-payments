/**
 * NANDA Points payment scheme implementation
 * Replaces the EVM blockchain schemes from x402
 */

import {
  PaymentPayload,
  PaymentRequirements,
  NPPaymentError,
  Resource,
  NPPaymentConfig,
} from "./types.js";

/**
 * NANDA Points payment scheme
 * Replaces x402's exact.evm scheme
 */
export const nandaPoints = {
  /**
   * Create payment requirements for NANDA Points
   */
  createPaymentRequirements(
    config: NPPaymentConfig,
    resource: Resource,
    facilitatorUrl: string
  ): PaymentRequirements {
    return {
      scheme: "nanda-points",
      network: "nanda-network",
      maxAmountRequired: config.priceNP.toString(),
      resource,
      description: config.description || `Payment of ${config.priceNP} NP required`,
      mimeType: "application/json",
      payTo: config.recipient,
      maxTimeoutSeconds: config.maxTimeoutSeconds || 60,
      asset: "NP",
      outputSchema: undefined,
      extra: {
        facilitatorUrl,
      },
    };
  },

  /**
   * Encode payment payload for NANDA Points
   * Replaces exact.evm.encodePayment()
   */
  encodePayment(payload: PaymentPayload): string {
    try {
      return btoa(JSON.stringify(payload));
    } catch (error) {
      throw new NPPaymentError(
        "Failed to encode payment payload",
        "ENCODING_ERROR",
        error
      );
    }
  },

  /**
   * Decode payment payload from X-PAYMENT header
   * Replaces exact.evm.decodePayment()
   */
  decodePayment(xPaymentHeader: string): PaymentPayload {
    try {
      const decoded = JSON.parse(atob(xPaymentHeader));

      // Validate required fields
      if (!decoded.scheme || decoded.scheme !== "nanda-points") {
        throw new NPPaymentError(
          "Invalid payment scheme",
          "INVALID_SCHEME",
          { expected: "nanda-points", received: decoded.scheme }
        );
      }

      if (!decoded.payTo || !decoded.amount || !decoded.from || !decoded.txId) {
        throw new NPPaymentError(
          "Missing required payment fields",
          "INVALID_PAYLOAD",
          decoded
        );
      }

      return {
        x402Version: decoded.x402Version || 1,
        scheme: "nanda-points",
        network: "nanda-network",
        payTo: decoded.payTo,
        amount: decoded.amount,
        from: decoded.from,
        txId: decoded.txId,
        timestamp: decoded.timestamp || Date.now(),
        extra: decoded.extra,
      };
    } catch (error) {
      if (error instanceof NPPaymentError) {
        throw error;
      }
      throw new NPPaymentError(
        "Failed to decode payment payload",
        "DECODING_ERROR",
        error
      );
    }
  },

  /**
   * Create a payment payload for NANDA Points transaction
   */
  createPaymentPayload(
    from: string,
    to: string,
    amount: number,
    txId: string
  ): PaymentPayload {
    return {
      x402Version: 1,
      scheme: "nanda-points",
      network: "nanda-network",
      payTo: to,
      amount: amount.toString(),
      from,
      txId,
      timestamp: Date.now(),
    };
  },

  /**
   * Validate payment payload structure
   */
  validatePayment(payload: PaymentPayload): boolean {
    return !!(
      payload.scheme === "nanda-points" &&
      payload.network === "nanda-network" &&
      payload.payTo &&
      payload.amount &&
      payload.from &&
      payload.txId
    );
  },
};

/**
 * Utility functions for NANDA Points amounts
 */
export const npUtils = {
  /**
   * Convert NP amount to minor units (same as major for NP, scale=0)
   */
  toMinorUnits(amount: number): number {
    return amount; // NP scale is 0, so minor = major
  },

  /**
   * Convert minor units to NP amount
   */
  toMajorUnits(minorUnits: number): number {
    return minorUnits; // NP scale is 0, so major = minor
  },

  /**
   * Parse amount from string (handles both integer and decimal)
   */
  parseAmount(amount: string): number {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 0) {
      throw new NPPaymentError(
        "Invalid amount format",
        "INVALID_AMOUNT",
        { amount }
      );
    }
    return Math.floor(parsed); // NP amounts are integers
  },

  /**
   * Format amount for display
   */
  formatAmount(amount: number): string {
    return `${amount} NP`;
  },
};