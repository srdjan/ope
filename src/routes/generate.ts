import type { GenerateRequest, FinalResponse } from "../types.ts";
import { analyze } from "../engine/analyze.ts";
import { synthesize } from "../engine/synthesize.ts";
import { compileIR } from "../engine/compile.ts";
import { route } from "../engine/route.ts";
import { validateOrRepair } from "../engine/validate.ts";

export async function handleGenerate(body: GenerateRequest): Promise<Response> {
  if (!body || typeof body.rawPrompt !== "string" || body.rawPrompt.trim().length === 0) {
    return new Response(JSON.stringify({ error: "rawPrompt is required" }), { status: 400 });
  }

  const analysis = analyze(body);
  const ir = synthesize(body.rawPrompt, analysis);
  // Placeholder for future Ax/DSPy optimization:
  const ir2 = ir;

  const compiled = compileIR(ir2, body.rawPrompt);
  const decision = route(body.targetHint);
  const { text } = await decision.adapter({
    system: compiled.system,
    user: compiled.user,
    maxTokens: compiled.decoding.maxTokens,
    temperature: compiled.decoding.temperature
  });

  const output = validateOrRepair(text);
  const result: FinalResponse = {
    output,
    meta: {
      model: decision.model,
      ir: ir2,
      compiled: { system: compiled.system, user: compiled.user },
      decoding: compiled.decoding
    }
  };

  return new Response(JSON.stringify(result, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
