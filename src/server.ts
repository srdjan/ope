import { PORT } from "./config.ts";
import { handleGenerate } from "./routes/generate.ts";
import { createRequestLogger, logError, logInfo } from "./lib/logger.ts";
import { JSON_HEADERS } from "./lib/httpErrors.ts";

const isDeploy = Boolean(Deno.env.get("DENO_DEPLOYMENT_ID"));

const indexUrl = new URL("../ui/public/index.html", import.meta.url);
const shouldCacheIndex = isDeploy;
let cachedIndexHtml: string | null = null;

const readIndexHtml = async (): Promise<string> => {
  if (shouldCacheIndex && cachedIndexHtml) {
    return cachedIndexHtml;
  }

  const html = await Deno.readTextFile(indexUrl);
  if (shouldCacheIndex) {
    cachedIndexHtml = html;
  }

  return html;
};

const serveIndex = async (
  logger: ReturnType<typeof createRequestLogger>,
): Promise<Response> => {
  try {
    const html = await readIndexHtml();
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  } catch (err) {
    logError("Unable to serve OPE UI", err);
    logger.error("Failed to load index.html", err);
    return new Response("Internal Server Error", { status: 500 });
  }
};

logInfo("Server starting", {
  port: PORT,
  env: isDeploy ? "production" : "development",
});

const handler = async (req: Request): Promise<Response> => {
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
        // Check if this is a JSON parse error
        if (err instanceof SyntaxError && err.message.includes("JSON")) {
          logger.error("Invalid JSON in request body", err);
          response = new Response(
            JSON.stringify({
              error: "Invalid JSON in request body",
              detail: err.message,
            }),
            {
              status: 400,
              headers: JSON_HEADERS,
            },
          );
        } else {
          // Other errors (e.g., from handleGenerate)
          logger.error("Failed to generate response", err);
          const msg = err instanceof Error ? err.message : String(err);
          response = new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: JSON_HEADERS,
          });
        }
      }
    } else if (method === "GET" && path === "/") {
      response = await serveIndex(logger);
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

    const headers = new Headers(JSON_HEADERS);
    headers.set("x-request-id", requestId);
    return new Response(
      JSON.stringify({ error: "Internal server error", requestId }),
      {
        status: 500,
        headers,
      },
    );
  }
};

if (isDeploy) {
  Deno.serve(handler);
} else {
  Deno.serve({ port: PORT }, handler);
}
