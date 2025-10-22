import type { CompiledPrompt, PromptIR } from "../types.ts";
import {
  makeMaxTokens,
  makeSystemPrompt,
  makeTemperature,
  makeUserPrompt,
} from "../lib/branded.ts";

export function compileIR(ir: PromptIR, rawPrompt: string): CompiledPrompt {
  const systemText = [
    `ROLE: ${ir.role}`,
    `OBJECTIVE: ${ir.objective}`,
    `CONSTRAINTS: ${ir.constraints.join("; ")}`,
    `STYLE: ${ir.style.join("; ")}`,
    `STEPS: ${ir.steps.join(" -> ")}`,
  ].join("\n");

  const userText = [
    "TASK:",
    rawPrompt,
    "",
    "OUTPUT: Return a JSON object with fields:",
    "- answer: string",
    "- citations: string[] (URLs or source identifiers; use [] or ['unknown'] if none).",
  ].join("\n");

  return {
    system: makeSystemPrompt(systemText),
    user: makeUserPrompt(userText),
    decoding: {
      temperature: makeTemperature(0.2),
      maxTokens: makeMaxTokens(600),
    },
  };
}
