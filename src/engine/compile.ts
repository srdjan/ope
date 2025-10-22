import type { PromptIR, CompiledPrompt } from "../types.ts";

export function compileIR(ir: PromptIR, rawPrompt: string): CompiledPrompt {
  const system = [
    `ROLE: ${ir.role}`,
    `OBJECTIVE: ${ir.objective}`,
    `CONSTRAINTS: ${ir.constraints.join("; ")}`,
    `STYLE: ${ir.style.join("; ")}`,
    `STEPS: ${ir.steps.join(" -> ")}`
  ].join("\n");

  const user = [
    "TASK:",
    rawPrompt,
    "",
    "OUTPUT: Return a JSON object with fields:",
    "- answer: string",
    "- citations: string[] (URLs or source identifiers; use [] or ['unknown'] if none)."
  ].join("\n");

  return { system, user, decoding: { temperature: 0.2, maxTokens: 600 } };
}
