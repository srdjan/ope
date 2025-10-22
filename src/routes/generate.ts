import type { FinalResponse, GenerateRequest } from "../types.ts";
import { analyze } from "../engine/analyze.ts";
import { synthesize } from "../engine/synthesize.ts";
import { compileIR } from "../engine/compile.ts";
import { route } from "../engine/route.ts";
import { getValidationMetrics, validateOrRepair } from "../engine/validate.ts";
import { hasCloud, hasLocalHttp } from "../config.ts";
import { makePromptText } from "../lib/branded.ts";

export async function handleGenerate(
  body: unknown,
): Promise<Response> {
  // Validate and parse input
  if (
    !body || typeof body !== "object" || !("rawPrompt" in body) ||
    typeof (body as { rawPrompt: unknown }).rawPrompt !== "string" ||
    (body as { rawPrompt: string }).rawPrompt.trim().length === 0
  ) {
    return new Response(JSON.stringify({ error: "rawPrompt is required" }), {
      status: 400,
    });
  }

  const rawBody = body as {
    rawPrompt: string;
    taskType?: "qa" | "extract" | "summarize";
    targetHint?: "local" | "cloud";
  };

  // Create properly typed request with branded types
  const request: GenerateRequest = {
    rawPrompt: makePromptText(rawBody.rawPrompt),
    taskType: rawBody.taskType,
    targetHint: rawBody.targetHint,
  };

  const analysis = analyze(request);
  const ir = synthesize(request.rawPrompt, analysis);
  // Placeholder for future Ax/DSPy optimization:
  const ir2 = ir;

  const compiled = compileIR(ir2, request.rawPrompt);

  // Pass capabilities to route for dependency injection (pure function)
  const capabilities = { hasCloud: hasCloud(), hasLocalHttp: hasLocalHttp() };
  const decision = route(capabilities, request.targetHint);

  // Handle Result type from adapter
  const adapterResult = await decision.adapter({
    system: compiled.system,
    user: compiled.user,
    maxTokens: compiled.decoding.maxTokens,
    temperature: compiled.decoding.temperature,
  });

  if (!adapterResult.ok) {
    const { error } = adapterResult;
    // Map error kinds to HTTP status codes
    const status = error.kind === "CONFIG_MISSING"
      ? 500
      : error.kind === "NETWORK_ERROR"
      ? 502
      : 500;
    return new Response(
      JSON.stringify({
        error: error.kind,
        detail: error.kind === "NETWORK_ERROR" ? error.body : error.detail,
      }),
      { status },
    );
  }

  const { text } = adapterResult.value;
  const validationResult = validateOrRepair(text);
  const validationMetrics: {
    readonly wasRepaired: boolean;
    readonly errorKind: string | null;
    readonly errorDetail: string | null;
  } = getValidationMetrics(validationResult);

  const result: FinalResponse = {
    output: validationResult.value,
    meta: {
      model: decision.model,
      ir: ir2,
      compiled: { system: compiled.system, user: compiled.user },
      decoding: compiled.decoding,
      validation: validationMetrics,
    },
  };

  return new Response(JSON.stringify(result, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
