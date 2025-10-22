import { PORT } from "./config.ts";
import { handleGenerate } from "./routes/generate.ts";

console.log(`[OPE] starting server on :${PORT}`);

Deno.serve({ port: PORT }, async (req) => {
  const url = new URL(req.url);
  if (req.method === "POST" && url.pathname === "/v1/generate") {
    try {
      const body = await req.json();
      return await handleGenerate(body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ error: msg }), { status: 500 });
    }
  }
  if (req.method === "GET" && url.pathname === "/health") {
    return new Response("ok");
  }
  return new Response("Not Found", { status: 404 });
});
