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
const res = await fetch(`${host}/v1/generate`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
});
const text = await res.text();
console.log(text);
if (!res.ok) Deno.exit(1);
