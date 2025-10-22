// Enhanced schema validation with repair tracking.
// Provides full visibility into validation failures and repairs.

import { type CitationUrl, makeCitationUrlSafe } from "../lib/branded.ts";

export type OutShape = {
  readonly answer: string;
  readonly citations: ReadonlyArray<CitationUrl>;
};

export type ValidationError =
  | { readonly kind: "INVALID_JSON"; readonly parseError: string }
  | {
    readonly kind: "MISSING_FIELDS";
    readonly missingFields: ReadonlyArray<string>;
  }
  | { readonly kind: "INVALID_TYPES"; readonly issues: ReadonlyArray<string> };

export type ValidationResult =
  | { readonly ok: true; readonly value: OutShape; readonly repaired: false }
  | {
    readonly ok: true;
    readonly value: OutShape;
    readonly repaired: true;
    readonly repairReason: string;
    readonly originalError: ValidationError;
  };

/**
 * Validates model output and repairs if possible, with full tracking.
 * Returns detailed validation result to make failures visible.
 */
export function validateOrRepair(text: string): ValidationResult {
  // Try to parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    // JSON parse failed - repair by wrapping
    return {
      ok: true,
      value: { answer: text.trim(), citations: [] },
      repaired: true,
      repairReason: "Invalid JSON - wrapped raw text as answer",
      originalError: {
        kind: "INVALID_JSON",
        parseError: e instanceof Error ? e.message : String(e),
      },
    };
  }

  // Check if parsed is an object
  if (!parsed || typeof parsed !== "object") {
    return {
      ok: true,
      value: { answer: JSON.stringify(parsed), citations: [] },
      repaired: true,
      repairReason: "Parsed value was not an object",
      originalError: {
        kind: "INVALID_TYPES",
        issues: [`Expected object, got ${typeof parsed}`],
      },
    };
  }

  const obj = parsed as Record<string, unknown>;

  // Check for required fields
  const missingFields: string[] = [];
  if (!("answer" in obj)) missingFields.push("answer");
  if (!("citations" in obj)) missingFields.push("citations");

  if (missingFields.length > 0) {
    // Repair: extract what we can
    const answer = "answer" in obj ? String(obj.answer ?? "") : text.trim();
    const citations = "citations" in obj && Array.isArray(obj.citations)
      ? obj.citations.map((c) => makeCitationUrlSafe(String(c)))
      : [];

    return {
      ok: true,
      value: { answer, citations },
      repaired: true,
      repairReason: `Missing required fields: ${missingFields.join(", ")}`,
      originalError: { kind: "MISSING_FIELDS", missingFields },
    };
  }

  // Validate and coerce types
  const issues: string[] = [];
  const answer = String(obj.answer ?? "");
  let citations: CitationUrl[];

  if (typeof obj.answer !== "string") {
    issues.push(`answer was ${typeof obj.answer}, coerced to string`);
  }

  if (!Array.isArray(obj.citations)) {
    issues.push(`citations was ${typeof obj.citations}, expected array`);
    citations = [];
  } else {
    citations = obj.citations.map((c, idx) => {
      if (typeof c !== "string") {
        issues.push(`citation[${idx}] was ${typeof c}, coerced to string`);
      }
      return makeCitationUrlSafe(String(c));
    });
  }

  // Additional validation: check citation URLs
  const invalidCitations = citations.filter(
    (c) => c === ("unknown" as CitationUrl) && String(c) !== "unknown",
  );
  if (invalidCitations.length > 0) {
    issues.push(
      `${invalidCitations.length} citations were invalid URLs (coerced to "unknown")`,
    );
  }

  if (issues.length > 0) {
    return {
      ok: true,
      value: { answer, citations },
      repaired: true,
      repairReason: "Type coercion or validation issues",
      originalError: { kind: "INVALID_TYPES", issues },
    };
  }

  // Perfect validation - no repair needed
  return {
    ok: true,
    value: { answer, citations },
    repaired: false,
  };
}

/**
 * Extracts validation metrics from a validation result.
 * Useful for monitoring/logging.
 */
export function getValidationMetrics(result: ValidationResult): {
  readonly wasRepaired: boolean;
  readonly errorKind: string | null;
  readonly errorDetail: string | null;
} {
  if (!result.repaired) {
    return { wasRepaired: false, errorKind: null, errorDetail: null };
  }

  return {
    wasRepaired: true,
    errorKind: result.originalError.kind,
    errorDetail: result.repairReason,
  };
}
