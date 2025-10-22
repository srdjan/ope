import { localEcho } from "../adapters/localEcho.ts";
import { localHttp } from "../adapters/localHttp.ts";
import { openaiStyle } from "../adapters/openaiStyle.ts";
import type { Adapter } from "../adapters/types.ts";
import type { AvailableCapabilities } from "../types.ts";

export type RouteDecision = {
  readonly model: string;
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
      return { model: "local/http", adapter: localHttp };
    }
    return { model: "local/echo", adapter: localEcho };
  }
  if (capabilities.hasCloud) {
    return { model: "cloud/openai-style", adapter: openaiStyle };
  }
  if (capabilities.hasLocalHttp) {
    return { model: "local/http", adapter: localHttp };
  }
  return { model: "local/echo", adapter: localEcho };
}
