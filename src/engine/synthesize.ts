import type { PromptIR } from "../types.ts";
import type { AnalysisReport } from "./analyze.ts";
import type { ContextInstruction } from "../ports/context.ts";

/**
 * Synthesize PromptIR from analysis and optional context instruction
 *
 * Context instruction can override taskType-based defaults.
 * Context takes precedence: if provided, it replaces taskType effects.
 */
export function synthesize(
  _rawPrompt: string,
  a: AnalysisReport,
  contextInstr?: ContextInstruction,
): PromptIR {
  // Base constraints from analysis
  const constraintWord = `${a.maxWords - 40}-${a.maxWords}-words`;
  const baseConstraints = ["json-only", "cite-or-say-unknown", constraintWord];

  // Apply context instructions (overrides base)
  const constraints = contextInstr?.additionalConstraints
    ? [...baseConstraints, ...contextInstr.additionalConstraints]
    : baseConstraints;

  // Base style
  const baseStyle = ["succinct", "use table only if clearly useful"];
  const style = contextInstr?.additionalStyle
    ? [...baseStyle, ...contextInstr.additionalStyle]
    : baseStyle;

  // Role (with context suffix if provided)
  const role = contextInstr?.roleSuffix
    ? `precise expert ${contextInstr.roleSuffix}`
    : "precise expert";

  // Objective (with context prefix if provided)
  const objective = contextInstr?.objectivePrefix
    ? `${contextInstr.objectivePrefix} Answer the user's request accurately and concisely.`
    : "Answer the user's request accurately and concisely.";

  const steps = ["analyze", "answer"];

  return {
    role,
    objective,
    constraints,
    style,
    steps,
    outputSchema: { answer: "string", citations: "string[]" },
    examples: [],
  };
}
