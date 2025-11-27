import type { PromptIR } from "../types.ts";
import type { AnalysisReport } from "./analyze.ts";
import type { ContextInstruction } from "../ports/context.ts";

// Type for suggested examples from enhancement
type Example = { readonly user: string; readonly assistant: string };

/**
 * Synthesize PromptIR from analysis and optional context instruction
 *
 * Context instruction can override taskType-based defaults.
 * Context takes precedence: if provided, it replaces taskType effects.
 *
 * @param rawPrompt - The (enhanced) prompt text
 * @param a - Analysis report from analyze stage
 * @param contextInstr - Optional context instructions
 * @param suggestedExamples - Optional examples from enhancement for few-shot learning
 */
export function synthesize(
  rawPrompt: string,
  a: AnalysisReport,
  contextInstr?: ContextInstruction,
  suggestedExamples?: ReadonlyArray<Example>,
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
  // Include prompt context hint for better targeting
  const promptHint = extractPromptHint(rawPrompt);
  const baseObjective = promptHint
    ? `Answer about ${promptHint} accurately and concisely.`
    : "Answer the user's request accurately and concisely.";
  const objective = contextInstr?.objectivePrefix
    ? `${contextInstr.objectivePrefix} ${baseObjective}`
    : baseObjective;

  const steps = ["analyze", "answer"];

  // Use suggested examples from enhancement (populates the previously-empty field)
  const examples = suggestedExamples ?? [];

  return {
    role,
    objective,
    constraints,
    style,
    steps,
    outputSchema: { answer: "string", citations: "string[]" },
    examples,
  };
}

/**
 * Extract a brief hint from the prompt for the objective.
 * Returns null if prompt is too generic.
 */
function extractPromptHint(rawPrompt: string): string | null {
  // Extract key noun phrases or topics from the prompt
  const words = rawPrompt.toLowerCase().split(/\s+/);

  // Look for "what is/are", "how to/does", "explain" patterns
  const whatMatch = rawPrompt.match(/what\s+(?:is|are)\s+(\w+(?:\s+\w+)?)/i);
  if (whatMatch) return whatMatch[1];

  const explainMatch = rawPrompt.match(/explain\s+(\w+(?:\s+\w+)?)/i);
  if (explainMatch) return explainMatch[1];

  const howMatch = rawPrompt.match(/how\s+(?:to|does|do)\s+(\w+(?:\s+\w+)?)/i);
  if (howMatch) return howMatch[1];

  // For short prompts, don't add hint
  if (words.length < 5) return null;

  return null;
}
