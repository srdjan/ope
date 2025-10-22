import type { Adapter, GenerateArgs } from "./types.ts";

export const localEcho: Adapter = async (args: GenerateArgs) => {
  const text = [
    "ECHO-MODE:",
    "SYSTEM => " + args.system.replaceAll("\n", " ").slice(0, 160),
    "USER   => " + args.user.replaceAll("\n", " ").slice(0, 320)
  ].join("\n");
  return { text };
};
