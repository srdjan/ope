/**
 * Context Port - Pluggable instructions for LLM calls
 *
 * Enables customization of prompt generation for specific domains
 * (medical, legal, code, academic, etc.) while keeping core logic pure.
 *
 * Follows Ports & Adapters pattern like ConfigPort.
 */

import { MAX_TEMPERATURE, MIN_TEMPERATURE } from "../lib/branded.ts";

export type ContextInstruction = {
  readonly roleSuffix?: string; // Append to role (e.g., "in medical field")
  readonly objectivePrefix?: string; // Prepend to objective
  readonly additionalConstraints?: ReadonlyArray<string>;
  readonly additionalStyle?: ReadonlyArray<string>;
  readonly temperatureOverride?: number; // Override default 1
  readonly maxTokensOverride?: number; // Override default 600
  readonly systemSuffix?: string; // Append to compiled system prompt
  readonly userPrefix?: string; // Prepend to compiled user prompt
};

export type ContextDefinition = {
  readonly id: string; // e.g., "medical", "legal", "code"
  readonly name: string; // Human-readable name
  readonly description: string; // What this context is for
  readonly instruction: ContextInstruction;
};

/**
 * Port interface for context resolution
 */
export interface ContextPort {
  /**
   * Get context by ID
   * Returns null if context doesn't exist
   */
  getContext(contextId: string): ContextDefinition | null;

  /**
   * List all available context IDs
   */
  listContexts(): ReadonlyArray<string>;

  /**
   * Get all context definitions (for debugging/listing)
   */
  getAllContexts(): ReadonlyArray<ContextDefinition>;
}

/**
 * Validation error type
 */
export type ContextValidationError = {
  readonly kind: "INVALID_TEMPERATURE" | "INVALID_MAX_TOKENS" | "TEXT_TOO_LONG";
  readonly detail: string;
};

/**
 * Validate a context instruction
 * Returns null if valid, otherwise returns error
 */
export function validateContextInstruction(
  instr: ContextInstruction,
): ContextValidationError | null {
  const MAX_TEXT_LENGTH = 250_000;

  // Validate temperature (use constants from branded.ts for single source of truth)
  if (
    instr.temperatureOverride !== undefined &&
    (instr.temperatureOverride < MIN_TEMPERATURE ||
      instr.temperatureOverride > MAX_TEMPERATURE)
  ) {
    return {
      kind: "INVALID_TEMPERATURE",
      detail: `Temperature must be between ${MIN_TEMPERATURE} and ${MAX_TEMPERATURE}, got ${instr.temperatureOverride}`,
    };
  }

  // Validate maxTokens (positive number)
  if (
    instr.maxTokensOverride !== undefined &&
    (instr.maxTokensOverride <= 0 || instr.maxTokensOverride > 100_000)
  ) {
    return {
      kind: "INVALID_MAX_TOKENS",
      detail: `Max tokens must be between 1 and 100,000, got ${instr.maxTokensOverride}`,
    };
  }

  // Validate text lengths
  const textFields = [
    instr.roleSuffix,
    instr.objectivePrefix,
    instr.systemSuffix,
    instr.userPrefix,
    ...(instr.additionalConstraints ?? []),
    ...(instr.additionalStyle ?? []),
  ].filter((s): s is string => s !== undefined);

  for (const text of textFields) {
    if (text.length > MAX_TEXT_LENGTH) {
      return {
        kind: "TEXT_TOO_LONG",
        detail: `Text field exceeds ${MAX_TEXT_LENGTH} characters: ${text.slice(0, 100)}...`,
      };
    }
  }

  return null;
}

/**
 * Create context port from parsed context definitions
 */
export function makeContextPort(
  contexts: ReadonlyArray<ContextDefinition>,
): ContextPort {
  const contextMap = new Map(contexts.map((c) => [c.id, c]));

  return {
    getContext: (contextId: string) => contextMap.get(contextId) ?? null,
    listContexts: () => Array.from(contextMap.keys()),
    getAllContexts: () => contexts,
  };
}

/**
 * Create test context port with custom contexts
 */
export function makeTestContextPort(
  contexts: ReadonlyArray<ContextDefinition>,
): ContextPort {
  return makeContextPort(contexts);
}
