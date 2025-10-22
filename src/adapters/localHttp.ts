import type { Adapter, GenerateArgs } from "./types.ts";
import { LLM_BASE_URL } from "../config.ts";

export const localHttp: Adapter = async (args: GenerateArgs) => {
  if (!LLM_BASE_URL) throw new Error("LLM_BASE_URL not set");
  const prompt = `${args.system}\n\n${args.user}`;
  const res = await fetch(LLM_BASE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt, max_tokens: args.maxTokens, temperature: args.temperature })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`localHttp adapter error: ${res.status} ${body}`);
  }
  const data = await res.json();
  // Expect { text: string } or { choices: [{ text } ] }
  const text = typeof data.text === "string"
    ? data.text
    : (Array.isArray(data.choices) && data.choices[0]?.text) || JSON.stringify(data);
  return { text: String(text) };
};
