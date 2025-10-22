import type {
  Adapter,
  AdapterError,
  GenerateArgs,
  GenerateResult,
} from "./types.ts";
import { err, ok, type Result } from "../lib/result.ts";
import { CLOUD_API_KEY, CLOUD_BASE_URL } from "../config.ts";

export const openaiStyle: Adapter = async (
  args: GenerateArgs,
): Promise<Result<GenerateResult, AdapterError>> => {
  if (!CLOUD_BASE_URL || !CLOUD_API_KEY) {
    return err({
      kind: "CONFIG_MISSING",
      detail: "CLOUD_BASE_URL and CLOUD_API_KEY must be set",
    });
  }

  const url = new URL("/v1/chat/completions", CLOUD_BASE_URL).toString();
  const payload = {
    model: Deno.env.get("CLOUD_MODEL") ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
    temperature: args.temperature,
    max_tokens: args.maxTokens,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${CLOUD_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      return err({ kind: "NETWORK_ERROR", status: res.status, body });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ??
      data.choices?.[0]?.text ?? "";
    return ok({ text: String(text) });
  } catch (e) {
    return err({
      kind: "INVALID_RESPONSE",
      detail: e instanceof Error ? e.message : String(e),
    });
  }
};
