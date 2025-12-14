/**
 * Usage:
 *   deno run --allow-net --allow-env scripts/call.ts '{"rawPrompt":"Explain Raft", "taskType":"summarize","targetHint":"local"}'
 */
const arg = Deno.args[0];
if (!arg) {
  console.error("Provide JSON payload as first arg.");
  Deno.exit(1);
}
const payload = JSON.parse(arg);
const host = Deno.env.get("OPE_HOST") ?? "http://127.0.0.1:8787";

console.log("=== REQUEST INPUT ===");
if (typeof payload.rawPrompt === "string") {
  console.log(payload.rawPrompt);
} else {
  console.log("(rawPrompt missing or not a string)", payload.rawPrompt);
}
console.log();

const res = await fetch(`${host}/v1/generate`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
});
const text = await res.text();

let parsed: unknown;
try {
  parsed = JSON.parse(text);
} catch {
  parsed = null;
}

console.log("=== RESPONSE ENHANCED PROMPT ===");
const compiled = (parsed as {
  meta?: { compiled?: { system?: string; user?: string } };
})?.meta?.compiled;
if (
  compiled && typeof compiled.system === "string" &&
  typeof compiled.user === "string"
) {
  console.log("--- SYSTEM PROMPT ---");
  console.log(compiled.system);
  console.log();
  console.log("--- USER PROMPT ---");
  console.log(compiled.user);
} else {
  console.log("Compiled prompt not available in response metadata.");
}
console.log();

console.log("=== RAW RESPONSE ===");
console.log(text);
if (!res.ok) Deno.exit(1);
