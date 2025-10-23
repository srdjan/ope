import type {
  Adapter,
  AdapterError,
  GenerateArgs,
  GenerateResult,
} from "./types.ts";
import { ok, type Result } from "../lib/result.ts";
import { logInfo } from "../lib/logger.ts";

export const localEcho: Adapter = (
  args: GenerateArgs,
): Promise<Result<GenerateResult, AdapterError>> => {
  logInfo("localEcho adapter called", {
    adapter: "localEcho",
    systemLength: args.system.length,
    userLength: args.user.length,
    maxTokens: args.maxTokens,
    temperature: args.temperature,
  });

  const text = [
    "ECHO-MODE:",
    "SYSTEM => " + args.system.replaceAll("\n", " ").slice(0, 160),
    "USER   => " + args.user.replaceAll("\n", " ").slice(0, 320),
  ].join("\n");

  logInfo("localEcho response generated", {
    adapter: "localEcho",
    responseLength: text.length,
  });

  return Promise.resolve(ok({ text }));
};
