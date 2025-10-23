import type {
  Adapter,
  AdapterError,
  GenerateArgs,
  GenerateResult,
} from "./types.ts";
import { err, ok, type Result } from "../lib/result.ts";
import { LLM_BASE_URL } from "../config.ts";
import { logInfo, logError } from "../lib/logger.ts";

export const localHttp: Adapter = async (
  args: GenerateArgs,
): Promise<Result<GenerateResult, AdapterError>> => {
  if (!LLM_BASE_URL) {
    logError("localHttp: LLM_BASE_URL not configured");
    return err({ kind: "CONFIG_MISSING", detail: "LLM_BASE_URL not set" });
  }

  const prompt = `${args.system}\n\n${args.user}`;

  logInfo("localHttp adapter called", {
    adapter: "localHttp",
    url: LLM_BASE_URL,
    promptLength: prompt.length,
    maxTokens: args.maxTokens,
    temperature: args.temperature,
  });

  try {
    const startTime = performance.now();
    const res = await fetch(LLM_BASE_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prompt,
        max_tokens: args.maxTokens,
        temperature: args.temperature,
      }),
    });

    const duration = Math.round(performance.now() - startTime);

    if (!res.ok) {
      const body = await res.text();
      logError("localHttp: HTTP error response", undefined, {
        adapter: "localHttp",
        status: res.status,
        duration,
        bodyPreview: body.slice(0, 200),
      });
      return err({ kind: "NETWORK_ERROR", status: res.status, body });
    }

    const data = await res.json();
    // Expect { text: string } or { choices: [{ text } ] }
    const text = typeof data.text === "string"
      ? data.text
      : (Array.isArray(data.choices) && data.choices[0]?.text) ||
        JSON.stringify(data);

    logInfo("localHttp response received", {
      adapter: "localHttp",
      duration,
      responseLength: text.length,
    });

    return ok({ text: String(text) });
  } catch (e) {
    logError("localHttp: Exception during request", e, {
      adapter: "localHttp",
      url: LLM_BASE_URL,
    });
    return err({
      kind: "INVALID_RESPONSE",
      detail: e instanceof Error ? e.message : String(e),
    });
  }
};
