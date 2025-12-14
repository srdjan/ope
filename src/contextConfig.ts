/**
 * Context Configuration - Load contexts from markdown file at startup
 */

import { parseContextsFile } from "./lib/contextParser.ts";
import {
  type ContextPort,
  makeContextPort,
  validateContextInstruction,
} from "./ports/context.ts";
import { logError, logInfo, logWarn } from "./lib/logger.ts";

const CONTEXTS_FILE = "./contexts.md";

let contextPortSingleton: ContextPort | null = null;

/**
 * Load contexts from markdown file
 * Called once at startup
 */
export async function loadContexts(): Promise<ContextPort> {
  logInfo("Loading contexts", { file: CONTEXTS_FILE });

  const result = await parseContextsFile(CONTEXTS_FILE);

  if (!result.ok) {
    logError("Failed to load contexts", result.error);
    logWarn("Using empty context port (no contexts available)");
    return makeContextPort([]);
  }

  const contexts = result.value;
  logInfo("Contexts loaded", { count: contexts.length });

  // Validate all contexts
  for (const ctx of contexts) {
    const validationError = validateContextInstruction(ctx.instruction);
    if (validationError) {
      logWarn("Context validation failed", {
        contextId: ctx.id,
        error: validationError,
      });
    } else {
      logInfo("Context validated", {
        contextId: ctx.id,
        name: ctx.name,
      });
    }
  }

  return makeContextPort(contexts);
}

/**
 * Get context port singleton (lazy load)
 */
export async function getContextPort(): Promise<ContextPort> {
  if (!contextPortSingleton) {
    contextPortSingleton = await loadContexts();
  }
  return contextPortSingleton;
}
