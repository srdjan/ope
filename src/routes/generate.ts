import type { FinalResponse, GenerateRequest } from "../types.ts";
import { analyze } from "../engine/analyze.ts";
import { synthesize } from "../engine/synthesize.ts";
import { compileIR } from "../engine/compile.ts";
import { route } from "../engine/route.ts";
import { getValidationMetrics, validateOrRepair } from "../engine/validate.ts";
import { config as envConfig, type ConfigPort } from "../config.ts";
import type { ContextPort } from "../ports/context.ts";
import { getContextPort } from "../contextConfig.ts";
import { makePromptText } from "../lib/branded.ts";
import { createRequestLogger, logStage } from "../lib/logger.ts";

export async function handleGenerate(
  body: unknown,
  requestId: string,
  cfg: ConfigPort = envConfig,
  ctxPort?: ContextPort,
): Promise<Response> {
  const logger = createRequestLogger(requestId);
  logger.info("Pipeline starting");
  const jsonHeaders = { "content-type": "application/json; charset=utf-8" };
  // Validate and parse input
  if (
    !body || typeof body !== "object" || !("rawPrompt" in body) ||
    typeof (body as { rawPrompt: unknown }).rawPrompt !== "string" ||
    (body as { rawPrompt: string }).rawPrompt.trim().length === 0
  ) {
    logger.error("Invalid request: missing or empty rawPrompt");
    return new Response(
      JSON.stringify({ error: "rawPrompt is required" }),
      {
        status: 400,
        headers: jsonHeaders,
      },
    );
  }

  const rawBody = body as {
    rawPrompt: string;
    taskType?: "qa" | "extract" | "summarize";
    targetHint?: "local" | "cloud";
    context?: string;
  };

  // Create properly typed request with branded types
  const request: GenerateRequest = {
    rawPrompt: makePromptText(rawBody.rawPrompt),
    taskType: rawBody.taskType,
    targetHint: rawBody.targetHint,
    context: rawBody.context,
  };

  // Resolve context instruction (if provided)
  let contextInstr = undefined;
  if (request.context) {
    // Get context port (lazy load if not injected)
    const port = ctxPort ?? await getContextPort();
    const ctx = port.getContext(request.context);

    if (!ctx) {
      // Unknown context - return 400 error
      logger.error("Unknown context requested", { context: request.context });
      return new Response(
        JSON.stringify({
          error: "Unknown context",
          detail: `Context '${request.context}' not found. Available contexts: ${port.listContexts().join(", ")}`,
        }),
        {
          status: 400,
          headers: jsonHeaders,
        },
      );
    }

    contextInstr = ctx.instruction;
    logger.info("Context applied", {
      contextId: ctx.id,
      contextName: ctx.name,
    });
  }

  // Stage 1: Analyze
  const analyzeEnd = logStage(logger, "analyze");
  const analysis = analyze(request);
  analyzeEnd({
    needsJson: analysis.needsJson,
    needsCitations: analysis.needsCitations,
    maxWords: analysis.maxWords,
  });

  // Stage 2: Synthesize (with context)
  const synthesizeEnd = logStage(logger, "synthesize");
  const ir = synthesize(request.rawPrompt, analysis, contextInstr);
  // Placeholder for future Ax/DSPy optimization:
  const ir2 = ir;
  synthesizeEnd({
    role: ir2.role,
    constraintsCount: ir2.constraints.length,
    styleCount: ir2.style.length,
  });

  // Stage 3: Compile (with context)
  const compileEnd = logStage(logger, "compile");
  const compiled = compileIR(ir2, request.rawPrompt, contextInstr);
  compileEnd({
    systemPromptLength: compiled.system.length,
    userPromptLength: compiled.user.length,
    temperature: compiled.decoding.temperature,
    maxTokens: compiled.decoding.maxTokens,
  });

  // Stage 4: Route
  const routeEnd = logStage(logger, "route");
  const capabilities = {
    hasCloud: cfg.hasCloud(),
    hasLocalHttp: cfg.hasLocalHttp(),
  };
  const decision = route(capabilities, request.targetHint);
  routeEnd({
    model: decision.model,
    targetHint: request.targetHint,
    hasCloud: capabilities.hasCloud,
    hasLocalHttp: capabilities.hasLocalHttp,
  });

  // Stage 5: Adapter call
  const adapterEnd = logStage(logger, "adapter");
  logger.info("Calling adapter", {
    model: decision.model,
    temperature: compiled.decoding.temperature,
    maxTokens: compiled.decoding.maxTokens,
  });

  const adapterResult = await decision.adapter({
    system: compiled.system,
    user: compiled.user,
    maxTokens: compiled.decoding.maxTokens,
    temperature: compiled.decoding.temperature,
  });

  if (!adapterResult.ok) {
    const { error } = adapterResult;
    adapterEnd({ success: false, errorKind: error.kind });
    logger.error("Adapter call failed", error, {
      errorKind: error.kind,
      errorDetail: error.kind === "NETWORK_ERROR" ? error.body : error.detail,
    });

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
      { status, headers: jsonHeaders },
    );
  }

  const { text } = adapterResult.value;
  adapterEnd({
    success: true,
    responseLength: text.length,
  });

  // Stage 6: Validate
  const validateEnd = logStage(logger, "validate");
  const validationResult = validateOrRepair(text);
  const validationMetrics: {
    readonly wasRepaired: boolean;
    readonly errorKind: string | null;
    readonly errorDetail: string | null;
  } = getValidationMetrics(validationResult);
  validateEnd({
    wasRepaired: validationMetrics.wasRepaired,
    errorKind: validationMetrics.errorKind,
  });

  if (validationMetrics.wasRepaired) {
    logger.warn("Response required repair", {
      errorKind: validationMetrics.errorKind,
      errorDetail: validationMetrics.errorDetail,
    });
  }

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

  logger.info("Pipeline completed successfully", {
    answerLength: result.output.answer.length,
    citationsCount: result.output.citations.length,
    wasRepaired: validationMetrics.wasRepaired,
  });

  return new Response(JSON.stringify(result, null, 2), {
    headers: jsonHeaders,
  });
}
