import type { CompiledPrompt, PromptIR } from "../types.ts";
import type { ContextInstruction } from "../ports/context.ts";
import {
  makeMaxTokens,
  makeSystemPrompt,
  makeTemperature,
  makeUserPrompt,
} from "../lib/branded.ts";

/**
 * Compile PromptIR into system/user prompts with decoding parameters
 *
 * Context instruction can append to prompts and override decoding parameters.
 */
export function compileIR(
  ir: PromptIR,
  rawPrompt: string,
  contextInstr?: ContextInstruction,
): CompiledPrompt {
  // Build base system prompt
  let systemText = [
    `ROLE: ${ir.role}`,
    `OBJECTIVE: ${ir.objective}`,
    `CONSTRAINTS: ${ir.constraints.join("; ")}`,
    `STYLE: ${ir.style.join("; ")}`,
    `STEPS: ${ir.steps.join(" -> ")}`,
  ].join("\n");

  // Add examples for few-shot learning if provided (from enhancement)
  if (ir.examples.length > 0) {
    const examplesText = ir.examples
      .map((ex, i) => `Example ${i + 1}:\nUser: ${ex.user}\nAssistant: ${ex.assistant}`)
      .join("\n\n");
    systemText += `\n\nEXAMPLES:\n${examplesText}`;
  }

  // Append context-specific system suffix if provided
  if (contextInstr?.systemSuffix) {
    systemText += `\n\n${contextInstr.systemSuffix}`;
  }

  // Build base user prompt
  let userText = [
    "TASK:",
    rawPrompt,
    "",
    "OUTPUT: Return a JSON object with fields:",
    "- answer: string",
    "- citations: string[] (URLs or source identifiers; use [] or ['unknown'] if none).",
  ].join("\n");

  // Prepend context-specific user prefix if provided
  if (contextInstr?.userPrefix) {
    userText = `${contextInstr.userPrefix}\n\n${userText}`;
  }

  // Decoding parameters (context overrides defaults)
  const temperature = contextInstr?.temperatureOverride ?? 1;
  const maxTokens = contextInstr?.maxTokensOverride ?? 600;

  return {
    system: makeSystemPrompt(systemText),
    user: makeUserPrompt(userText),
    decoding: {
      temperature: makeTemperature(temperature),
      maxTokens: makeMaxTokens(maxTokens),
    },
  };
}
