import type { PromptIR } from "../types.ts";
import type { AnalysisReport } from "./analyze.ts";

export function synthesize(rawPrompt: string, a: AnalysisReport): PromptIR {
  const constraintWord = `${a.maxWords - 40}-${a.maxWords}-words`;
  const constraints = ["json-only", "cite-or-say-unknown", constraintWord];
  const style = ["succinct", "use table only if clearly useful"];
  const steps = ["analyze", "answer"];
  return {
    role: "precise expert",
    objective: "Answer the user’s request accurately and concisely.",
    constraints,
    style,
    steps,
    outputSchema: { answer: "string", citations: "string[]" },
    examples: []
  };
}
