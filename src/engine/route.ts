import { localEcho } from "../adapters/localEcho.ts";
import { localHttp } from "../adapters/localHttp.ts";
import { openaiStyle } from "../adapters/openaiStyle.ts";
import type { Adapter } from "../adapters/types.ts";
import type { AvailableCapabilities } from "../types.ts";
import { makeModelId, type ModelId } from "../lib/branded.ts";

export type RouteDecision = {
  readonly model: ModelId;
  readonly adapter: Adapter;
};

/**
 * Pure function to select appropriate adapter based on capabilities and target hint.
 * No side effects - config is passed as parameter for dependency injection.
 */
export function route(
  capabilities: AvailableCapabilities,
  targetHint?: "local" | "cloud",
): RouteDecision {
  if (targetHint === "local") {
    if (capabilities.hasLocalHttp) {
      return { model: makeModelId("local/http"), adapter: localHttp };
    }
    return { model: makeModelId("local/echo"), adapter: localEcho };
  }
  if (capabilities.hasCloud) {
    return { model: makeModelId("cloud/openai-style"), adapter: openaiStyle };
  }
  if (capabilities.hasLocalHttp) {
    return { model: makeModelId("local/http"), adapter: localHttp };
  }
  return { model: makeModelId("local/echo"), adapter: localEcho };
}
