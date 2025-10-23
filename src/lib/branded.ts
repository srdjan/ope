/**
 * Branded type primitives for domain modeling.
 * Prevents mixing up different string/number concepts at compile time.
 *
 * Following Light FP principles:
 * - Types (not interfaces) for data
 * - Smart constructors with validation
 * - Readonly by design
 */

// Model identifiers
declare const ModelIdBrand: unique symbol;
export type ModelId = string & { readonly [ModelIdBrand]: true };
export const makeModelId = (s: string): ModelId => s as ModelId;

// Prompt text
declare const PromptTextBrand: unique symbol;
export type PromptText = string & { readonly [PromptTextBrand]: true };
export const makePromptText = (s: string): PromptText => {
  if (s.trim().length === 0) throw new Error("Prompt text cannot be empty");
  return s as PromptText;
};

// System prompts
declare const SystemPromptBrand: unique symbol;
export type SystemPrompt = string & { readonly [SystemPromptBrand]: true };
export const makeSystemPrompt = (s: string): SystemPrompt => s as SystemPrompt;

// User prompts
declare const UserPromptBrand: unique symbol;
export type UserPrompt = string & { readonly [UserPromptBrand]: true };
export const makeUserPrompt = (s: string): UserPrompt => s as UserPrompt;

// Temperature (must be 0-2)
export const MIN_TEMPERATURE = 0;
export const MAX_TEMPERATURE = 2;

declare const TemperatureBrand: unique symbol;
export type Temperature = number & { readonly [TemperatureBrand]: true };
export const makeTemperature = (n: number): Temperature => {
  if (n < MIN_TEMPERATURE || n > MAX_TEMPERATURE) {
    throw new Error(
      `Temperature must be ${MIN_TEMPERATURE}-${MAX_TEMPERATURE}, got ${n}`,
    );
  }
  return n as Temperature;
};

// Max tokens (must be positive)
declare const MaxTokensBrand: unique symbol;
export type MaxTokens = number & { readonly [MaxTokensBrand]: true };
export const makeMaxTokens = (n: number): MaxTokens => {
  if (n <= 0) throw new Error(`MaxTokens must be positive, got ${n}`);
  return n as MaxTokens;
};

// Citation URL
declare const CitationUrlBrand: unique symbol;
export type CitationUrl = string & { readonly [CitationUrlBrand]: true };
export const makeCitationUrl = (s: string): CitationUrl => {
  if (s !== "unknown") {
    try {
      new URL(s);
    } catch {
      throw new Error(`Invalid citation URL: ${s}`);
    }
  }
  return s as CitationUrl;
};

// Safe citation URL constructor that doesn't throw
export const makeCitationUrlSafe = (s: string): CitationUrl => {
  if (s === "unknown") return s as CitationUrl;
  try {
    new URL(s);
    return s as CitationUrl;
  } catch {
    return "unknown" as CitationUrl;
  }
};
