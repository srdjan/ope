/**
 * HTTP error response helpers
 *
 * Provides pure functions for mapping domain errors to HTTP responses
 * Following Light FP principles: pure functions, explicit error handling
 */

import type { AdapterError } from "../adapters/types.ts";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
} as const;

/**
 * Map adapter error to HTTP response
 * Pure function - no side effects
 */
export function mapAdapterErrorToHttpResponse(
  error: AdapterError,
): Response {
  const status = error.kind === "CONFIG_MISSING"
    ? 500
    : error.kind === "NETWORK_ERROR"
    ? 502
    : 500;

  const detail = error.kind === "NETWORK_ERROR" ? error.body : error.detail;

  return new Response(
    JSON.stringify({ error: error.kind, detail }),
    { status, headers: JSON_HEADERS },
  );
}

/**
 * Create error response with consistent formatting
 */
export function createErrorResponse(
  errorMessage: string,
  detail: string,
  status: number,
): Response {
  return new Response(
    JSON.stringify({ error: errorMessage, detail }),
    { status, headers: JSON_HEADERS },
  );
}

/**
 * Create validation error response
 */
export function createValidationError(message: string): Response {
  return createErrorResponse("VALIDATION_ERROR", message, 400);
}

/**
 * Export JSON headers for consistent usage across the app
 */
export { JSON_HEADERS };
