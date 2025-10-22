import type {
  Adapter,
  AdapterError,
  GenerateArgs,
  GenerateResult,
} from "./types.ts";
import { ok, type Result } from "../lib/result.ts";

export const localEcho: Adapter = (
  args: GenerateArgs,
): Promise<Result<GenerateResult, AdapterError>> => {
  const text = [
    "ECHO-MODE:",
    "SYSTEM => " + args.system.replaceAll("\n", " ").slice(0, 160),
    "USER   => " + args.user.replaceAll("\n", " ").slice(0, 320),
  ].join("\n");
  return Promise.resolve(ok({ text }));
};
