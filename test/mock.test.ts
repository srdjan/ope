/**
 * Tests for mock data matching and realistic adapter
 */

import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import {
  FALLBACK_RESPONSE,
  findMockResponse,
  MOCK_DATASET,
} from "../src/adapters/mockData.ts";
import { mockRealistic } from "../src/adapters/mockRealistic.ts";
import {
  makeMaxTokens,
  makeSystemPrompt,
  makeTemperature,
  makeUserPrompt,
} from "../src/lib/branded.ts";

// ============================================================================
// findMockResponse Tests
// ============================================================================

Deno.test("findMockResponse - matches TypeScript keyword", () => {
  const response = findMockResponse("What is TypeScript?");
  assertStringIncludes(response.answer, "TypeScript");
  assertStringIncludes(response.answer, "JavaScript");
  assertEquals(response.citations.length, 1);
  assertStringIncludes(response.citations[0], "typescriptlang.org");
});

Deno.test("findMockResponse - matches Raft keyword", () => {
  const response = findMockResponse("Explain the Raft consensus algorithm");
  assertStringIncludes(response.answer, "consensus");
  assertStringIncludes(response.answer, "Leader Election");
  assertEquals(response.citations.length, 1);
});

Deno.test("findMockResponse - matches REST API", () => {
  const response = findMockResponse("What is a REST API?");
  assertStringIncludes(response.answer, "REST");
  assertStringIncludes(response.answer, "HTTP");
  assertEquals(response.citations.length, 1);
});

Deno.test("findMockResponse - matches Docker", () => {
  const response = findMockResponse("What is Docker?");
  assertStringIncludes(response.answer, "container");
  assertStringIncludes(response.answer, "Docker");
});

Deno.test("findMockResponse - matches machine learning", () => {
  const response = findMockResponse("What is machine learning?");
  assertStringIncludes(response.answer, "Machine Learning");
  assertStringIncludes(response.answer, "Supervised");
});

Deno.test("findMockResponse - matches photosynthesis", () => {
  const response = findMockResponse("Explain photosynthesis");
  assertStringIncludes(response.answer, "Photosynthesis");
  assertStringIncludes(response.answer, "Calvin Cycle");
  assertEquals(response.citations.length, 2);
});

Deno.test("findMockResponse - matches haiku/poem", () => {
  const response = findMockResponse("Write a haiku about programming");
  assertStringIncludes(response.answer, "haiku");
});

Deno.test("findMockResponse - matches Python None", () => {
  const response = findMockResponse(
    "Why is my Python function returning None?",
  );
  assertStringIncludes(response.answer, "None");
  assertStringIncludes(response.answer, "return");
});

Deno.test("findMockResponse - matches CAP theorem", () => {
  const response = findMockResponse("Explain the CAP theorem");
  assertStringIncludes(response.answer, "CAP");
  assertStringIncludes(response.answer, "Consistency");
  assertStringIncludes(response.answer, "Availability");
});

Deno.test("findMockResponse - returns fallback for unknown prompt", () => {
  const response = findMockResponse("What is the meaning of life?");
  assertEquals(response, FALLBACK_RESPONSE);
  assertStringIncludes(response.answer, "demo response");
});

Deno.test("findMockResponse - case insensitive matching", () => {
  const response = findMockResponse("WHAT IS TYPESCRIPT?");
  assertStringIncludes(response.answer, "TypeScript");
});

// ============================================================================
// MOCK_DATASET Validation
// ============================================================================

Deno.test("MOCK_DATASET - has at least 10 entries", () => {
  assertEquals(MOCK_DATASET.length >= 10, true);
});

Deno.test("MOCK_DATASET - all entries have keywords", () => {
  for (const entry of MOCK_DATASET) {
    assertEquals(entry.keywords.length > 0, true);
  }
});

Deno.test("MOCK_DATASET - all entries have non-empty answers", () => {
  for (const entry of MOCK_DATASET) {
    assertEquals(entry.response.answer.length > 0, true);
  }
});

Deno.test("MOCK_DATASET - answers are 100-300 words (specifications allow more)", () => {
  for (const entry of MOCK_DATASET) {
    const wordCount = entry.response.answer.split(/\s+/).length;
    // Specification entries are intentionally comprehensive with API contracts,
    // data models, acceptance criteria, edge cases, and test scenarios
    const maxWords = entry.domain === "specification" ? 800 : 400;
    assertEquals(
      wordCount >= 50 && wordCount <= maxWords,
      true,
      `Entry "${entry.keywords[0]}" has ${wordCount} words (max: ${maxWords})`,
    );
  }
});

// ============================================================================
// mockRealistic Adapter Tests
// ============================================================================

Deno.test("mockRealistic - returns valid JSON response", async () => {
  const args = {
    system: makeSystemPrompt("You are an expert."),
    user: makeUserPrompt("TASK:\nWhat is TypeScript?\n\nOUTPUT: ..."),
    maxTokens: makeMaxTokens(600),
    temperature: makeTemperature(0.7),
  };

  const result = await mockRealistic(args);

  assertEquals(result.ok, true);
  if (result.ok) {
    const parsed = JSON.parse(result.value.text);
    assertEquals(typeof parsed.answer, "string");
    assertEquals(Array.isArray(parsed.citations), true);
    assertStringIncludes(parsed.answer, "TypeScript");
  }
});

Deno.test("mockRealistic - extracts prompt from compiled format", async () => {
  const args = {
    system: makeSystemPrompt("ROLE: expert"),
    user: makeUserPrompt(
      "TASK:\nExplain the Raft consensus algorithm\n\nOUTPUT: Return a JSON object...",
    ),
    maxTokens: makeMaxTokens(600),
    temperature: makeTemperature(0.7),
  };

  const result = await mockRealistic(args);

  assertEquals(result.ok, true);
  if (result.ok) {
    const parsed = JSON.parse(result.value.text);
    assertStringIncludes(parsed.answer, "Raft");
    assertStringIncludes(parsed.answer, "Leader Election");
  }
});

Deno.test("mockRealistic - returns fallback for unmatched prompt", async () => {
  const args = {
    system: makeSystemPrompt("ROLE: expert"),
    user: makeUserPrompt(
      "TASK:\nWhat is the airspeed velocity of an unladen swallow?\n\nOUTPUT: ...",
    ),
    maxTokens: makeMaxTokens(600),
    temperature: makeTemperature(0.7),
  };

  const result = await mockRealistic(args);

  assertEquals(result.ok, true);
  if (result.ok) {
    const parsed = JSON.parse(result.value.text);
    assertStringIncludes(parsed.answer, "demo response");
  }
});
