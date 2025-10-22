import type {
  Adapter,
  AdapterError,
  GenerateArgs,
  GenerateResult,
} from "./types.ts";
import { err, ok, type Result } from "../lib/result.ts";
import { LLM_BASE_URL } from "../config.ts";

export const localHttp: Adapter = async (
  args: GenerateArgs,
): Promise<Result<GenerateResult, AdapterError>> => {
  if (!LLM_BASE_URL) {
    return err({ kind: "CONFIG_MISSING", detail: "LLM_BASE_URL not set" });
  }

  const prompt = `${args.system}\n\n${args.user}`;

  try {
    const res = await fetch(LLM_BASE_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prompt,
        max_tokens: args.maxTokens,
        temperature: args.temperature,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return err({ kind: "NETWORK_ERROR", status: res.status, body });
    }

    const data = await res.json();
    // Expect { text: string } or { choices: [{ text } ] }
    const text = typeof data.text === "string"
      ? data.text
      : (Array.isArray(data.choices) && data.choices[0]?.text) ||
        JSON.stringify(data);

    return ok({ text: String(text) });
  } catch (e) {
    return err({
      kind: "INVALID_RESPONSE",
      detail: e instanceof Error ? e.message : String(e),
    });
  }
};
