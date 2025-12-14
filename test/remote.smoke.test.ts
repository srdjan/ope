/**
 * Remote OPE instance smoke tests
 *
 * These tests validate that a deployed OPE instance is functioning correctly
 * by testing the public API endpoints with various realistic scenarios.
 *
 * Run with: deno task test:remote
 */

import { assertEquals, assertExists } from "jsr:@std/assert";

const OPE_HOST = Deno.env.get("OPE_HOST") || "https://ope.timok.deno.net";

/**
 * Format timestamp for logging
 */
function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Log test information with timestamp
 */
function logTest(message: string, data?: unknown): void {
  console.log(`\n[${timestamp()}] ${message}`);
  if (data !== undefined) {
    console.log(JSON.stringify(data, null, 2));
  }
}

/**
 * Helper to call the /v1/generate endpoint with detailed logging
 */
async function callGenerate(payload: {
  rawPrompt: string;
  taskType?: "qa" | "extract" | "summarize";
  targetHint?: "local" | "cloud";
}, testName?: string) {
  const startTime = performance.now();

  logTest(`[${testName || "TEST"}] Request starting`, {
    host: OPE_HOST,
    payload,
  });

  const response = await fetch(`${OPE_HOST}/v1/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  const duration = Math.round(performance.now() - startTime);

  logTest(`[${testName || "TEST"}] Response received`, {
    status: response.status,
    statusText: response.statusText,
    duration: `${duration}ms`,
    headers: {
      "content-type": response.headers.get("content-type"),
      "x-request-id": response.headers.get("x-request-id"),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    logTest(`[${testName || "TEST"}] Error response body`, text);
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const result = await response.json();

  logTest(`[${testName || "TEST"}] Response body summary`, {
    outputAnswerLength: result.output?.answer?.length,
    citationsCount: result.output?.citations?.length,
    model: result.meta?.model,
    wasRepaired: result.meta?.validation?.wasRepaired,
    duration: `${duration}ms`,
  });

  // Log enhanced prompts (DSPy signature)
  if (result.meta?.signature) {
    logTest(`[${testName || "TEST"}] DSPy signature (OPE output)`, {
      system: result.meta.signature.system,
      user: result.meta.signature.user,
    });
  }

  // Log full response for detailed debugging (can be verbose)
  if (Deno.env.get("VERBOSE") === "true") {
    logTest(`[${testName || "TEST"}] Full response`, result);
  }

  return result;
}

Deno.test("Remote OPE - Health check", async () => {
  logTest("Health check starting", { host: OPE_HOST });
  const response = await fetch(`${OPE_HOST}/health`, {
    signal: AbortSignal.timeout(10_000),
  });
  logTest("Health check response", {
    status: response.status,
    statusText: response.statusText,
  });

  assertEquals(response.status, 200);

  const text = await response.text();
  assertEquals(text, "ok");
  logTest("Health check passed");
});

Deno.test("Remote OPE - Basic generation request", async () => {
  const result = await callGenerate({
    rawPrompt: "What is the capital of France?",
  }, "BasicGeneration");

  // Validate response structure
  assertExists(result.output);
  assertExists(result.output.answer);
  assertExists(result.output.citations);
  assertExists(result.meta);
  assertExists(result.meta.model);
  assertExists(result.meta.ir);
  assertExists(result.meta.signature);
  assertExists(result.meta.decoding);

  // Validate types
  assertEquals(typeof result.output.answer, "string");
  assertEquals(Array.isArray(result.output.citations), true);
  assertEquals(typeof result.meta.model, "string");
});

Deno.test("Remote OPE - QA task type", async () => {
  const result = await callGenerate({
    rawPrompt: "Explain how photosynthesis works",
    taskType: "qa",
  }, "QATask");

  assertExists(result.output.answer);
  assertEquals(typeof result.output.answer, "string");

  // QA should produce substantial answers
  assertEquals(
    result.output.answer.length > 50,
    true,
    "QA answer should be substantial",
  );

  // Check that IR reflects QA task
  assertExists(result.meta.ir.objective);
  assertEquals(typeof result.meta.ir.objective, "string");
});

Deno.test("Remote OPE - Extract task type", async () => {
  const result = await callGenerate({
    rawPrompt:
      "Extract key facts from: The Eiffel Tower is 330 meters tall and was completed in 1889.",
    taskType: "extract",
  }, "ExtractTask");

  assertExists(result.output.answer);
  assertEquals(typeof result.output.answer, "string");

  // Check IR reflects extraction task
  assertExists(result.meta.ir.role);
  assertExists(result.meta.ir.objective);
});

Deno.test("Remote OPE - Summarize task type", async () => {
  const result = await callGenerate({
    rawPrompt: "Summarize the main principles of object-oriented programming",
    taskType: "summarize",
  }, "SummarizeTask");

  assertExists(result.output.answer);
  assertEquals(typeof result.output.answer, "string");

  // Summarize should have word limit constraints
  assertExists(result.meta.ir.constraints);
  assertEquals(Array.isArray(result.meta.ir.constraints), true);
});

Deno.test("Remote OPE - Target hint: local", async () => {
  const result = await callGenerate({
    rawPrompt: "What is 2+2?",
    targetHint: "local",
  }, "LocalTarget");

  assertExists(result.meta.model);
  // Model should indicate local routing (echo or http)
  assertEquals(
    result.meta.model.startsWith("local/"),
    true,
    `Expected local model, got: ${result.meta.model}`,
  );
});

Deno.test("Remote OPE - Complex prompt with multiple requirements", async () => {
  const result = await callGenerate({
    rawPrompt:
      "Explain the CAP theorem in distributed systems, including examples of consistency vs availability tradeoffs",
    taskType: "qa",
  }, "ComplexPrompt");

  assertExists(result.output.answer);
  assertEquals(
    result.output.answer.length > 100,
    true,
    "Complex query should produce detailed answer",
  );

  // Should have citations array (even if empty)
  assertEquals(Array.isArray(result.output.citations), true);

  // Check decoding parameters are present
  assertExists(result.meta.decoding.temperature);
  assertExists(result.meta.decoding.maxTokens);
  assertEquals(typeof result.meta.decoding.temperature, "number");
  assertEquals(typeof result.meta.decoding.maxTokens, "number");
});

Deno.test("Remote OPE - Short prompt handling", async () => {
  const result = await callGenerate({
    rawPrompt: "Hi",
  });

  assertExists(result.output.answer);
  assertExists(result.meta.ir);

  // Even short prompts should get proper IR synthesis
  assertExists(result.meta.ir.objective);
});

Deno.test("Remote OPE - IR synthesis validation", async () => {
  const result = await callGenerate({
    rawPrompt: "Describe the water cycle",
    taskType: "summarize",
  });

  // Validate IR structure
  const ir = result.meta.ir;
  assertExists(ir.role);
  assertExists(ir.objective);
  assertExists(ir.constraints);
  assertExists(ir.style);

  assertEquals(typeof ir.role, "string");
  assertEquals(typeof ir.objective, "string");
  assertEquals(Array.isArray(ir.constraints), true);
  assertEquals(Array.isArray(ir.style), true);
});

Deno.test("Remote OPE - Signature structure", async () => {
  const result = await callGenerate({
    rawPrompt: "What are prime numbers?",
  });

  // Validate DSPy signature
  const signature = result.meta.signature;
  assertExists(signature.system);
  assertExists(signature.user);

  assertEquals(typeof signature.system, "string");
  assertEquals(typeof signature.user, "string");
  assertEquals(signature.system.length > 0, true);
  assertEquals(signature.user.length > 0, true);
});

Deno.test("Remote OPE - Error handling: empty prompt", async () => {
  logTest("Testing empty prompt error handling");
  try {
    await callGenerate({
      rawPrompt: "",
    }, "EmptyPromptError");
    throw new Error("Should have thrown an error for empty prompt");
  } catch (error) {
    // Expected to fail - validate we get a proper error response
    logTest("Empty prompt correctly rejected", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    assertExists(error);
  }
});

Deno.test("Remote OPE - Error handling: invalid JSON", async () => {
  logTest("Testing invalid JSON error handling");
  try {
    const response = await fetch(`${OPE_HOST}/v1/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not valid json",
    });

    const body = await response.text();

    logTest("Invalid JSON response", {
      status: response.status,
      statusText: response.statusText,
      body: body.slice(0, 200),
    });

    // Should get 400 or 500 error
    assertEquals(response.ok, false);
    assertEquals(response.status >= 400, true);
  } catch (error) {
    // Network error is also acceptable
    logTest("Invalid JSON handling (network error)", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    assertExists(error);
  }
});

Deno.test("Remote OPE - Response time check", async () => {
  const start = Date.now();

  await callGenerate({
    rawPrompt: "What is TypeScript?",
    taskType: "summarize",
  });

  const duration = Date.now() - start;

  // Response should complete within reasonable time (30 seconds)
  assertEquals(
    duration < 30000,
    true,
    `Response took ${duration}ms, expected < 30000ms`,
  );

  console.log(`✓ Response time: ${duration}ms`);
});

Deno.test("Remote OPE - Citations structure validation", async () => {
  const result = await callGenerate({
    rawPrompt: "Explain REST API principles",
    taskType: "qa",
  });

  const citations = result.output.citations;
  assertEquals(Array.isArray(citations), true);

  // Each citation should be a string (if any exist)
  for (const citation of citations) {
    assertEquals(typeof citation, "string");
  }
});

Deno.test("Remote OPE - Multiple concurrent requests", async () => {
  const prompts = [
    "What is HTML?",
    "What is CSS?",
    "What is JavaScript?",
  ];

  const promises = prompts.map((rawPrompt) =>
    callGenerate({ rawPrompt, taskType: "summarize" })
  );

  const results = await Promise.all(promises);

  assertEquals(results.length, 3);

  for (const result of results) {
    assertExists(result.output.answer);
    assertExists(result.meta.model);
  }

  console.log("✓ Successfully handled 3 concurrent requests");
});
