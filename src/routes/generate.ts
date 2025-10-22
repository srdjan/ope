import type { FinalResponse, GenerateRequest } from "../types.ts";
import { analyze } from "../engine/analyze.ts";
import { synthesize } from "../engine/synthesize.ts";
import { compileIR } from "../engine/compile.ts";
import { route } from "../engine/route.ts";
import { validateOrRepair } from "../engine/validate.ts";
import { hasCloud, hasLocalHttp } from "../config.ts";

export async function handleGenerate(body: GenerateRequest): Promise<Response> {
  if (
    !body || typeof body.rawPrompt !== "string" ||
    body.rawPrompt.trim().length === 0
  ) {
    return new Response(JSON.stringify({ error: "rawPrompt is required" }), {
      status: 400,
    });
  }

  const analysis = analyze(body);
  const ir = synthesize(body.rawPrompt, analysis);
  // Placeholder for future Ax/DSPy optimization:
  const ir2 = ir;

  const compiled = compileIR(ir2, body.rawPrompt);

  // Pass capabilities to route for dependency injection (pure function)
  const capabilities = { hasCloud: hasCloud(), hasLocalHttp: hasLocalHttp() };
  const decision = route(capabilities, body.targetHint);

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
  const output = validateOrRepair(text);
  const result: FinalResponse = {
    output,
    meta: {
      model: decision.model,
      ir: ir2,
      compiled: { system: compiled.system, user: compiled.user },
      decoding: compiled.decoding,
    },
  };

  return new Response(JSON.stringify(result, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
