import type { GenerateRequest } from "../types.ts";

export type AnalysisReport = {
  needsJson: boolean;
  needsCitations: boolean;
  maxWords: number;
};

export function analyze(req: GenerateRequest): AnalysisReport {
  const tt = req.taskType ?? "qa";
  const needsCitations = tt === "qa" || tt === "summarize";
  const maxWords = tt === "summarize" ? 180 : tt === "extract" ? 120 : 160;
  return { needsJson: true, needsCitations, maxWords };
}
