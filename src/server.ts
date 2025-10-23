import { PORT } from "./config.ts";
import { handleGenerate } from "./routes/generate.ts";
import { createRequestLogger, logInfo, logError } from "./lib/logger.ts";

logInfo("Server starting", { port: PORT, env: Deno.env.get("DENO_DEPLOYMENT_ID") ? "production" : "development" });

Deno.serve({ port: PORT }, async (req) => {
  const requestId = crypto.randomUUID();
  const logger = createRequestLogger(requestId);
  const startTime = performance.now();

  const url = new URL(req.url);
  const method = req.method;
  const path = url.pathname;

  logger.info("Request received", {
    method,
    path,
    userAgent: req.headers.get("user-agent"),
  });

  try {
    let response: Response;

    if (method === "POST" && path === "/v1/generate") {
      try {
        const body = await req.json();
        logger.info("Request body parsed", {
          rawPromptLength: body.rawPrompt?.length,
          taskType: body.taskType,
          targetHint: body.targetHint,
        });

        response = await handleGenerate(body, requestId);
      } catch (err) {
        logger.error("Failed to parse request body or generate response", err);
        const msg = err instanceof Error ? err.message : String(err);
        response = new Response(JSON.stringify({ error: msg }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
    } else if (method === "GET" && path === "/health") {
      response = new Response("ok");
    } else {
      logger.warn("Route not found", { method, path });
      response = new Response("Not Found", { status: 404 });
    }

    const duration = Math.round(performance.now() - startTime);
    logger.info("Request completed", {
      status: response.status,
      duration,
    });

    // Add request ID to response headers for tracing
    const headers = new Headers(response.headers);
    headers.set("x-request-id", requestId);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    logger.error("Unhandled server error", err, { duration });

    return new Response(
      JSON.stringify({ error: "Internal server error", requestId }),
      {
        status: 500,
        headers: {
          "content-type": "application/json",
          "x-request-id": requestId,
        },
      }
    );
  }
});
