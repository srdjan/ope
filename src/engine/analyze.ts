import type { GenerateRequest, PromptAnalysis } from "../types.ts";

export type AnalysisReport = {
  readonly needsJson: boolean;
  readonly needsCitations: boolean;
  readonly maxWords: number;
};

/**
 * Analyze a generate request to determine output requirements.
 * Optionally accepts PromptAnalysis from enhancement stage to adjust behavior.
 */
export function analyze(
  req: GenerateRequest,
  promptAnalysis?: PromptAnalysis,
): AnalysisReport {
  const tt = req.taskType ?? "qa";

  // Base needs citations for qa and summarize tasks
  // Also enable for academic domain (from auto-detection)
  const needsCitations = tt === "qa" || tt === "summarize" ||
    promptAnalysis?.detectedDomain === "academic";

  // Base word limits by task type
  const baseMaxWords = tt === "summarize" ? 180 : tt === "extract" ? 120 : 160;

  // Adjust word limit based on prompt complexity
  // Complex prompts may need more words to answer properly
  const complexityMultiplier = promptAnalysis
    ? 1 + (promptAnalysis.ambiguityScore * 0.3) + // Up to 30% more for ambiguous prompts
      (promptAnalysis.isCompoundQuestion ? 0.5 : 0) // 50% more for compound questions
    : 1;

  const maxWords = Math.round(baseMaxWords * complexityMultiplier);

  return { needsJson: true, needsCitations, maxWords };
}
