/**
 * Points Schema and Management
 *
 * Centralized points definitions, validation, and conversion logic.
 * Supports multiple point systems with different scales and properties.
 */

// Base types for point amounts
export type MinorUnits = number & { readonly __brand: unique symbol };  // Branded type for integer validation
export type MajorUnits = number;  // User-facing amounts (e.g., dollars, points)

// Helper to create validated MinorUnits
export function createMinorUnits(value: number): MinorUnits {
  if (!Number.isInteger(value)) {
    throw new TypeError(`MinorUnits must be an integer, got: ${value}`);
  }
  if (value < 0) {
    throw new RangeError(`MinorUnits must be non-negative, got: ${value}`);
  }
  return value as MinorUnits;
}

// Result types using discriminated unions
export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export type ParseResult =
  | { success: true; amount: MinorUnits }
  | { success: false; error: string };

/**
 * Points Definition Schema
 *
 * Defines all properties and behaviors of a point system
 */
export interface PointsDefinition {
  /** Points code (ISO-like, e.g., "USD", "NP") */
  readonly code: string;

  /** Human-readable name */
  readonly name: string;

  /** Points symbol for display */
  readonly symbol: string;

  /** Number of decimal places (e.g., 2 for USD cents, 0 for whole units) */
  readonly scale: number;

  /** Smallest unit name (e.g., "cent", "satoshi", "wei") */
  readonly minorUnitName: string;

  /** Major unit name (e.g., "dollar", "point", "token") */
  readonly majorUnitName: string;

  /** Maximum amount allowed in minor units */
  readonly maxAmount: MinorUnits;

  /** Minimum amount allowed in minor units */
  readonly minAmount: MinorUnits;
}

/**
 * Points Operations Interface
 *
 * Provides all operations for a specific point system
 */
export interface PointsOperations {
  /** Convert major units to minor units for storage */
  toMinorUnits(majorAmount: MajorUnits): MinorUnits;

  /** Convert minor units to major units for display */
  toMajorUnits(minorAmount: MinorUnits): MajorUnits;

  /** Format amount for user display */
  format(minorAmount: MinorUnits): string;

  /** Validate amount is within points limits */
  validate(minorAmount: MinorUnits): ValidationResult;

  /** Parse user input string to minor units */
  parse(input: string): ParseResult;
}

/**
 * Complete Points Implementation
 */
export class Points implements PointsOperations {
  constructor(private definition: PointsDefinition) {}

  get code(): string { return this.definition.code; }
  get name(): string { return this.definition.name; }
  get symbol(): string { return this.definition.symbol; }
  get scale(): number { return this.definition.scale; }
  get majorUnitName(): string { return this.definition.majorUnitName; }
  get minorUnitName(): string { return this.definition.minorUnitName; }

  toMinorUnits(majorAmount: MajorUnits): MinorUnits {
    const factor = Math.pow(10, this.definition.scale);
    return createMinorUnits(Math.trunc(majorAmount * factor));
  }

  toMajorUnits(minorAmount: MinorUnits): MajorUnits {
    const factor = Math.pow(10, this.definition.scale);
    return minorAmount / factor;
  }

  format(minorAmount: MinorUnits): string {
    const majorAmount = this.toMajorUnits(minorAmount);
    const formatted = this.definition.scale === 0
      ? majorAmount.toString()
      : majorAmount.toFixed(this.definition.scale);

    return `${formatted} ${this.definition.symbol}`;
  }

  validate(minorAmount: MinorUnits): ValidationResult {
    if (!Number.isInteger(minorAmount)) {
      return { valid: false, error: "Amount must be an integer in minor units" };
    }

    if (minorAmount < this.definition.minAmount) {
      return { valid: false, error: `Amount below minimum (${this.format(this.definition.minAmount)})` };
    }

    if (minorAmount > this.definition.maxAmount) {
      return { valid: false, error: `Amount above maximum (${this.format(this.definition.maxAmount)})` };
    }

    return { valid: true };
  }

  parse(input: string): ParseResult {
    const cleaned = input.trim().replace(this.definition.symbol, '').trim();
    const parsed = parseFloat(cleaned);

    if (isNaN(parsed)) {
      return { success: false, error: `Invalid ${this.definition.name} amount: "${input}"` };
    }

    const minorAmount = this.toMinorUnits(parsed);
    const validation = this.validate(minorAmount);

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    return { success: true, amount: minorAmount };
  }
}

// =====================================================
// NANDA Points (NP) Definition
// =====================================================

/**
 * NANDA Points Definition
 *
 * - Whole number points (no fractional units)
 * - 1:1 mapping between major and minor units
 * - Symbol: "NP"
 * - Scale: 0 (no decimal places)
 */
export const NANDA_POINTS_DEFINITION: PointsDefinition = {
  code: "NP",
  name: "NANDA Points",
  symbol: "NP",
  scale: 0,
  minorUnitName: "point",
  majorUnitName: "point",
  maxAmount: createMinorUnits(Number.MAX_SAFE_INTEGER),  // ~9 quadrillion points
  minAmount: createMinorUnits(0)
} as const;

/**
 * Global NANDA Points Instance
 *
 * Use this singleton for all NP operations throughout the application
 */
export const NP = new Points(NANDA_POINTS_DEFINITION);

// =====================================================
// Legacy Compatibility Exports
// =====================================================

/** @deprecated Use NP.code instead */
export const NP_CURRENCY = NP.code;

/** @deprecated Use NP.scale instead */
export const NP_SCALE = NP.scale;

/** @deprecated Use NP.toMinorUnits() instead */
export const toMinor = (points: MajorUnits): MinorUnits => NP.toMinorUnits(points);

/** @deprecated Use NP.toMajorUnits() instead */
export const toPoints = (minor: MinorUnits): MajorUnits => NP.toMajorUnits(minor);

/** @deprecated Use MinorUnits type instead */
export type Minor = MinorUnits;

// =====================================================
// Points Registry (for future multi-points support)
// =====================================================

export const SUPPORTED_POINTS = {
  NP: NP
} as const;

export type SupportedPointsCode = keyof typeof SUPPORTED_POINTS;

export function getPoints(code: SupportedPointsCode): Points {
  return SUPPORTED_POINTS[code];
}

export function isSupportedPoints(code: string): code is SupportedPointsCode {
  return code in SUPPORTED_POINTS;
}