import { hasCloud, hasLocalHttp } from "../config.ts";
import { localEcho } from "../adapters/localEcho.ts";
import { localHttp } from "../adapters/localHttp.ts";
import { openaiStyle } from "../adapters/openaiStyle.ts";
import type { Adapter } from "../adapters/types.ts";

export type RouteDecision = { model: string; adapter: Adapter };

export function route(targetHint?: "local" | "cloud"): RouteDecision {
  if (targetHint === "local") {
    if (hasLocalHttp()) return { model: "local/http", adapter: localHttp };
    return { model: "local/echo", adapter: localEcho };
  }
  if (hasCloud()) return { model: "cloud/openai-style", adapter: openaiStyle };
  if (hasLocalHttp()) return { model: "local/http", adapter: localHttp };
  return { model: "local/echo", adapter: localEcho };
}
