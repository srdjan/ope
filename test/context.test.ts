/**
 * Context system tests
 *
 * Tests context loading, validation, and application in pipeline
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import { parseContextsMarkdown } from "../src/lib/contextParser.ts";
import {
  type ContextDefinition,
  makeTestContextPort,
  validateContextInstruction,
} from "../src/ports/context.ts";
import { handleGenerate } from "../src/routes/generate.ts";
import { makeTestConfig } from "../src/ports/config.ts";

Deno.test("Context Parser - Parse valid YAML context", () => {
  const markdown = `
# Test Context

\`\`\`yaml
id: test
name: Test Context
description: For testing
instruction:
  roleSuffix: as tester
  additionalConstraints:
    - test constraint 1
    - test constraint 2
  temperatureOverride: 0.5
\`\`\`
`;

  const result = parseContextsMarkdown(markdown);
  assertEquals(result.ok, true);

  if (result.ok) {
    assertEquals(result.value.length, 1);
    assertEquals(result.value[0]!.id, "test");
    assertEquals(result.value[0]!.name, "Test Context");
    assertEquals(result.value[0]!.instruction.roleSuffix, "as tester");
    assertEquals(result.value[0]!.instruction.temperatureOverride, 0.5);
  }
});

Deno.test("Context Parser - Parse multiline strings", () => {
  const markdown = `
\`\`\`yaml
id: test
name: Test
description: Test
instruction:
  systemSuffix: |
    Line 1
    Line 2
  userPrefix: |
    Prefix line 1
    Prefix line 2
\`\`\`
`;

  const result = parseContextsMarkdown(markdown);
  assertEquals(result.ok, true);

  if (result.ok) {
    const ctx = result.value[0]!;
    assertEquals(ctx.instruction.systemSuffix, "Line 1\nLine 2");
    assertEquals(ctx.instruction.userPrefix, "Prefix line 1\nPrefix line 2");
  }
});

Deno.test("Context Validation - Valid temperature", () => {
  const valid = validateContextInstruction({
    temperatureOverride: 0.8,
  });
  assertEquals(valid, null);
});

Deno.test("Context Validation - Invalid temperature", () => {
  const invalid = validateContextInstruction({
    temperatureOverride: 3.0,
  });
  assertExists(invalid);
  assertEquals(invalid!.kind, "INVALID_TEMPERATURE");
});

Deno.test("Context Validation - Invalid maxTokens", () => {
  const invalid = validateContextInstruction({
    maxTokensOverride: -100,
  });
  assertExists(invalid);
  assertEquals(invalid!.kind, "INVALID_MAX_TOKENS");
});

Deno.test("Context Validation - Text too long", () => {
  const longText = "a".repeat(260_000);
  const invalid = validateContextInstruction({
    roleSuffix: longText,
  });
  assertExists(invalid);
  assertEquals(invalid!.kind, "TEXT_TOO_LONG");
});

Deno.test("Context Port - Get context by ID", () => {
  const contexts: ContextDefinition[] = [
    {
      id: "medical",
      name: "Medical",
      description: "Medical context",
      instruction: { roleSuffix: "in medical field" },
    },
    {
      id: "legal",
      name: "Legal",
      description: "Legal context",
      instruction: { roleSuffix: "in legal matters" },
    },
  ];

  const port = makeTestContextPort(contexts);
  const medical = port.getContext("medical");
  assertExists(medical);
  assertEquals(medical!.id, "medical");
  assertEquals(medical!.instruction.roleSuffix, "in medical field");
});

Deno.test("Context Port - Unknown context returns null", () => {
  const port = makeTestContextPort([]);
  const result = port.getContext("unknown");
  assertEquals(result, null);
});

Deno.test("Context Port - List contexts", () => {
  const contexts: ContextDefinition[] = [
    {
      id: "medical",
      name: "Medical",
      description: "Medical context",
      instruction: {},
    },
    {
      id: "legal",
      name: "Legal",
      description: "Legal context",
      instruction: {},
    },
  ];

  const port = makeTestContextPort(contexts);
  const list = port.listContexts();
  assertEquals(list.length, 2);
  assertEquals(list.includes("medical"), true);
  assertEquals(list.includes("legal"), true);
});

Deno.test("Integration - Generate with medical context", async () => {
  const testContexts: ContextDefinition[] = [
    {
      id: "medical",
      name: "Medical",
      description: "Medical context",
      instruction: {
        roleSuffix: "in medical field",
        additionalConstraints: ["include medical disclaimer"],
        systemSuffix: "IMPORTANT: This is not medical advice.",
      },
    },
  ];

  const testConfig = makeTestConfig({});
  const testContextPort = makeTestContextPort(testContexts);

  const response = await handleGenerate(
    {
      rawPrompt: "What is diabetes?",
      taskType: "qa",
      context: "medical",
    },
    "test-request-id",
    testConfig,
    testContextPort,
  );

  assertEquals(response.status, 200);

  const result = await response.json();
  assertExists(result.output);
  assertExists(result.meta);
  assertExists(result.meta.ir);

  // Verify context was applied
  assertEquals(result.meta.ir.role.includes("medical field"), true);
  assertEquals(
    result.meta.ir.constraints.includes("include medical disclaimer"),
    true,
  );
  assertEquals(
    result.meta.signature.system.includes("This is not medical advice"),
    true,
  );
});

Deno.test("Integration - Unknown context returns 400", async () => {
  const testConfig = makeTestConfig({});
  const testContextPort = makeTestContextPort([]);

  const response = await handleGenerate(
    {
      rawPrompt: "What is diabetes?",
      context: "unknown-context",
    },
    "test-request-id",
    testConfig,
    testContextPort,
  );

  assertEquals(response.status, 400);

  const result = await response.json();
  assertEquals(result.error, "Unknown context");
  assertEquals(typeof result.detail, "string");
});

Deno.test("Integration - Context overrides temperature", async () => {
  const testContexts: ContextDefinition[] = [
    {
      id: "creative",
      name: "Creative",
      description: "Creative writing",
      instruction: {
        temperatureOverride: 0.9,
        maxTokensOverride: 1000,
      },
    },
  ];

  const testConfig = makeTestConfig({});
  const testContextPort = makeTestContextPort(testContexts);

  const response = await handleGenerate(
    {
      rawPrompt: "Write a story",
      context: "creative",
    },
    "test-request-id",
    testConfig,
    testContextPort,
  );

  assertEquals(response.status, 200);

  const result = await response.json();
  assertEquals(result.meta.decoding.temperature, 0.9);
  assertEquals(result.meta.decoding.maxTokens, 1000);
});
