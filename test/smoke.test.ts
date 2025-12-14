import { handleGenerate } from "../src/routes/generate.ts";

Deno.test("generate with echo adapter (no env)", async () => {
  const requestId = crypto.randomUUID();
  const res = await handleGenerate({
    rawPrompt: "Explain Raft in short",
    taskType: "summarize",
    targetHint: "local",
  }, requestId);
  if (res.status !== 200) throw new Error(`Bad status: ${res.status}`);
  const json = await res.json();
  if (!json?.output?.answer) throw new Error("Missing answer");
  if (!json?.meta?.model) throw new Error("Missing model");
  if (typeof json?.meta?.prompt !== "string" || !json.meta.prompt.length) {
    throw new Error("Missing meta.prompt (enhanced prompt text)");
  }
  if (
    typeof json?.meta?.signature?.system !== "string" ||
    typeof json?.meta?.signature?.user !== "string"
  ) {
    throw new Error("Missing meta.signature (DSPy signature)");
  }
});
