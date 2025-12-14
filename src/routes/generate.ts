import type { EnhanceMode, FinalResponse, GenerateRequest } from "../types.ts";
import { analyze } from "../engine/analyze.ts";
import { synthesize } from "../engine/synthesize.ts";
import { compileIR } from "../engine/compile.ts";
import { route } from "../engine/route.ts";
import { enhancePrompt } from "../engine/enhance.ts";
import { getValidationMetrics, validateOrRepair } from "../engine/validate.ts";
import { config as envConfig, type ConfigPort } from "../config.ts";
import type { ContextPort } from "../ports/context.ts";
import { getContextPort } from "../contextConfig.ts";
import { makePromptText } from "../lib/branded.ts";
import { createRequestLogger, logStage } from "../lib/logger.ts";
import {
  createValidationError,
  JSON_HEADERS,
  mapAdapterErrorToHttpResponse,
} from "../lib/httpErrors.ts";
import type { EnhancementResult } from "../types.ts";

export async function handleGenerate(
  body: unknown,
  requestId: string,
  cfg: ConfigPort = envConfig,
  ctxPort?: ContextPort,
): Promise<Response> {
  const logger = createRequestLogger(requestId);
  logger.info("Pipeline starting");
  // Validate and parse input
  if (
    !body || typeof body !== "object" || !("rawPrompt" in body) ||
    typeof (body as { rawPrompt: unknown }).rawPrompt !== "string" ||
    (body as { rawPrompt: string }).rawPrompt.trim().length === 0
  ) {
    logger.error("Invalid request: missing or empty rawPrompt");
    return createValidationError("rawPrompt is required");
  }

  const rawBody = body as {
    rawPrompt: string;
    taskType?: "qa" | "extract" | "summarize";
    targetHint?: "local" | "cloud";
    context?: string;
    enhance?: EnhanceMode;
  };

  const taskType =
    rawBody.taskType === "qa" || rawBody.taskType === "extract" ||
      rawBody.taskType === "summarize"
      ? rawBody.taskType
      : undefined;

  const targetHint =
    rawBody.targetHint === "local" || rawBody.targetHint === "cloud"
      ? rawBody.targetHint
      : undefined;

  const enhance = rawBody.enhance === "rules" || rawBody.enhance === "none"
    ? rawBody.enhance
    : undefined;

  const context =
    typeof rawBody.context === "string" && rawBody.context.trim().length > 0
      ? rawBody.context.trim()
      : undefined;

  // Create properly typed request with branded types
  const request: GenerateRequest = {
    rawPrompt: makePromptText(rawBody.rawPrompt),
    taskType,
    targetHint,
    context,
    enhance,
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
          detail:
            `Context '${request.context}' not found. Available contexts: ${
              port.listContexts().join(", ")
            }`,
        }),
        {
          status: 400,
          headers: JSON_HEADERS,
        },
      );
    }

    contextInstr = ctx.instruction;
    logger.info("Context applied", {
      contextId: ctx.id,
      contextName: ctx.name,
    });
  }

  // Stage 0: Enhance (NEW - runs before analyze)
  const enhanceEnd = logStage(logger, "enhance");
  const enhanceMode = request.enhance ?? "rules"; // Default to rules-based enhancement
  const baseEnhancement = enhancePrompt(request.rawPrompt, enhanceMode);
  const enhancement = ensureDemoEnhancedPromptAlways(baseEnhancement, cfg);
  enhanceEnd({
    mode: enhanceMode,
    detectedDomain: enhancement.analysis.detectedDomain,
    enhancementsApplied: enhancement.enhancementsApplied.length,
    ambiguityScore: enhancement.analysis.ambiguityScore,
  });

  // Auto-apply detected domain as context if none specified
  let effectiveContext = request.context;
  if (!effectiveContext && enhancement.analysis.detectedDomain) {
    // Get context port (lazy load if not injected)
    const port = ctxPort ?? await getContextPort();
    const detectedCtx = port.getContext(enhancement.analysis.detectedDomain);
    if (detectedCtx) {
      effectiveContext = detectedCtx.id;
      contextInstr = detectedCtx.instruction;
      logger.info("Auto-detected context applied", {
        contextId: detectedCtx.id,
        contextName: detectedCtx.name,
      });
    }
  }

  // Stage 1: Analyze (with enhanced prompt analysis)
  const analyzeEnd = logStage(logger, "analyze");
  const analysis = analyze(request, enhancement.analysis);
  analyzeEnd({
    needsJson: analysis.needsJson,
    needsCitations: analysis.needsCitations,
    maxWords: analysis.maxWords,
  });

  // Stage 2: Synthesize (with context and suggested examples from enhancement)
  // Use baseEnhancement.enhancedPrompt (actual enhancements) not the demo-wrapped version
  const synthesizeEnd = logStage(logger, "synthesize");
  const ir = synthesize(
    baseEnhancement.enhancedPrompt,
    analysis,
    contextInstr,
    enhancement.analysis.suggestedExamples,
  );
  // Placeholder for future Ax/DSPy optimization:
  const ir2 = ir;
  synthesizeEnd({
    role: ir2.role,
    constraintsCount: ir2.constraints.length,
    styleCount: ir2.style.length,
    examplesCount: ir2.examples.length,
  });

  // Stage 3: Compile (with context and enhanced prompt)
  // Use baseEnhancement.enhancedPrompt to avoid double "TASK:" prefix
  const compileEnd = logStage(logger, "compile");
  const compiled = compileIR(ir2, baseEnhancement.enhancedPrompt, contextInstr);
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
    isMockMode: cfg.isMockMode(),
  };
  const decision = route(capabilities, request.targetHint);
  routeEnd({
    model: decision.model,
    targetHint: request.targetHint,
    hasCloud: capabilities.hasCloud,
    hasLocalHttp: capabilities.hasLocalHttp,
    isMockMode: capabilities.isMockMode,
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

    return mapAdapterErrorToHttpResponse(error);
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

  // Build result with optional enhancement metadata
  // Only include enhancement when enhancements were actually applied
  const hasEnhancements = enhancement.enhancementsApplied.length > 0;

  const result: FinalResponse = {
    output: validationResult.value,
    meta: {
      model: decision.model,
      prompt: enhancement.enhancedPrompt, // The actual prompt (primary view)
      ir: ir2,
      signature: { system: compiled.system, user: compiled.user }, // DSPy format (secondary view)
      decoding: compiled.decoding,
      validation: validationMetrics,
      ...(hasEnhancements ? { enhancement } : {}),
    },
  };

  logger.info("Pipeline completed successfully", {
    answerLength: result.output.answer.length,
    citationsCount: result.output.citations.length,
    wasRepaired: validationMetrics.wasRepaired,
    enhancementsApplied: enhancement.enhancementsApplied.length,
  });

  return new Response(JSON.stringify(result, null, 2), {
    headers: JSON_HEADERS,
  });
}

function ensureDemoEnhancedPromptAlways(
  enhancement: EnhancementResult,
  cfg: ConfigPort,
): EnhancementResult {
  const envFlag = Deno.env.get("OPE_ALWAYS_ENHANCE_PROMPT");
  const alwaysEnhance = envFlag === "true"
    ? true
    : envFlag === "false"
    ? false
    : cfg.isMockMode();

  if (!alwaysEnhance) return enhancement;

  const enhancedPrompt = formatEnhancedPromptDisplay(enhancement);
  const alreadyTagged = enhancement.enhancementsApplied.includes(
    "display_formatted",
  );

  return {
    ...enhancement,
    enhancedPrompt,
    enhancementsApplied: alreadyTagged
      ? enhancement.enhancementsApplied
      : [...enhancement.enhancementsApplied, "display_formatted"],
  };
}

/**
 * Format the enhanced prompt for display, showing what enhancements were applied.
 */
function formatEnhancedPromptDisplay(enhancement: EnhancementResult): string {
  const { analysis, enhancedPrompt, enhancementsApplied } = enhancement;
  const lines: string[] = [];

  // Start with the enhanced prompt text
  lines.push(normalizePromptWhitespace(enhancedPrompt));

  // Build enhancements section if any were applied
  const enhancements: string[] = [];

  if (analysis.detectedDomain) {
    const domainNames: Record<string, string> = {
      code: "Software Development",
      medical: "Medical/Health",
      legal: "Legal",
      academic: "Academic/Research",
      business: "Business",
      educational: "Educational",
      creative: "Creative Writing",
      technical: "Technical Documentation",
    };
    const domainName = domainNames[analysis.detectedDomain] ??
      analysis.detectedDomain;
    enhancements.push(`Domain: ${domainName}`);
  }

  if (enhancementsApplied.includes("structured_compound_question")) {
    enhancements.push("Structured multi-part question");
  }

  if (enhancementsApplied.includes("clarity_improvement")) {
    enhancements.push("Clarity improved");
  }

  if (analysis.suggestedExamples.length > 0) {
    enhancements.push(
      `${analysis.suggestedExamples.length} few-shot example(s) added`,
    );
  }

  // Add enhancements section if any
  if (enhancements.length > 0) {
    lines.push("");
    lines.push("─── Enhancements ───");
    enhancements.forEach((e) => lines.push(`• ${e}`));
  }

  return lines.join("\n");
}

function normalizePromptWhitespace(prompt: string): string {
  return prompt
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .trim()
    .replace(/\n{3,}/g, "\n\n");
}
