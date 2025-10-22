import type { Adapter, GenerateArgs } from "./types.ts";
import { CLOUD_BASE_URL, CLOUD_API_KEY } from "../config.ts";

export const openaiStyle: Adapter = async (args: GenerateArgs) => {
  if (!CLOUD_BASE_URL || !CLOUD_API_KEY) throw new Error("Cloud env not set");
  const url = new URL("/v1/chat/completions", CLOUD_BASE_URL).toString();
  const payload = {
    model: Deno.env.get("CLOUD_MODEL") ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user }
    ],
    temperature: args.temperature,
    max_tokens: args.maxTokens
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${CLOUD_API_KEY}`
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`openaiStyle adapter error: ${res.status} ${body}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? data.choices?.[0]?.text ?? "";
  return { text: String(text) };
};
