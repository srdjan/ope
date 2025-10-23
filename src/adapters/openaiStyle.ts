import type {
  Adapter,
  AdapterError,
  GenerateArgs,
  GenerateResult,
} from "./types.ts";
import { err, ok, type Result } from "../lib/result.ts";
import { CLOUD_API_KEY, CLOUD_BASE_URL, CLOUD_MODEL } from "../config.ts";
import { logInfo, logError } from "../lib/logger.ts";

export const openaiStyle: Adapter = async (
  args: GenerateArgs,
): Promise<Result<GenerateResult, AdapterError>> => {
  if (!CLOUD_BASE_URL || !CLOUD_API_KEY) {
    logError("openaiStyle: Cloud configuration missing");
    return err({
      kind: "CONFIG_MISSING",
      detail: "CLOUD_BASE_URL and CLOUD_API_KEY must be set",
    });
  }

  const url = new URL("/v1/chat/completions", CLOUD_BASE_URL).toString();
  const payload = {
    model: CLOUD_MODEL,
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
    temperature: args.temperature,
    max_tokens: args.maxTokens,
  };

  logInfo("openaiStyle adapter called", {
    adapter: "openaiStyle",
    url,
    model: CLOUD_MODEL,
    systemLength: args.system.length,
    userLength: args.user.length,
    maxTokens: args.maxTokens,
    temperature: args.temperature,
  });

  try {
    const startTime = performance.now();
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${CLOUD_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const duration = Math.round(performance.now() - startTime);

    if (!res.ok) {
      const body = await res.text();
      logError("openaiStyle: HTTP error response", undefined, {
        adapter: "openaiStyle",
        status: res.status,
        duration,
        bodyPreview: body.slice(0, 200),
      });
      return err({ kind: "NETWORK_ERROR", status: res.status, body });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ??
      data.choices?.[0]?.text ?? "";

    logInfo("openaiStyle response received", {
      adapter: "openaiStyle",
      duration,
      responseLength: text.length,
      model: data.model,
      finishReason: data.choices?.[0]?.finish_reason,
    });

    return ok({ text: String(text) });
  } catch (e) {
    logError("openaiStyle: Exception during request", e, {
      adapter: "openaiStyle",
      url,
    });
    return err({
      kind: "INVALID_RESPONSE",
      detail: e instanceof Error ? e.message : String(e),
    });
  }
};
