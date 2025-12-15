/**
 * Enhancement engine tests
 *
 * Tests domain detection, compound question detection, ambiguity scoring,
 * and prompt enhancement.
 */

import { assert, assertEquals } from "jsr:@std/assert";
import {
  analyzePrompt,
  calculateAmbiguityScore,
  detectCompoundQuestion,
  detectDomain,
  enhancePrompt,
} from "../src/engine/enhance.ts";

// Domain Detection Tests
Deno.test("detectDomain - identifies medical domain", () => {
  const result = detectDomain(
    "What are the symptoms of diabetes and its treatment options?",
  );
  assertEquals(result, "medical");
});

Deno.test("detectDomain - identifies code domain", () => {
  const result = detectDomain(
    "Write a function in JavaScript to sort an array",
  );
  assertEquals(result, "code");
});

Deno.test("detectDomain - identifies code domain from code block", () => {
  const result = detectDomain(
    "Fix this bug:\n```javascript\nconst x = null;\n```",
  );
  assertEquals(result, "code");
});

Deno.test("detectDomain - identifies legal domain", () => {
  const result = detectDomain(
    "What are my legal rights in a contract dispute?",
  );
  assertEquals(result, "legal");
});

Deno.test("detectDomain - identifies academic domain", () => {
  const result = detectDomain(
    "What is the research methodology for a peer-reviewed study?",
  );
  assertEquals(result, "academic");
});

Deno.test("detectDomain - returns null for generic prompt", () => {
  const result = detectDomain("What is the capital of France?");
  assertEquals(result, null);
});

// Compound Question Detection Tests
Deno.test("detectCompoundQuestion - detects multiple question marks", () => {
  const result = detectCompoundQuestion("What is X? What is Y?");
  assertEquals(result, true);
});

Deno.test("detectCompoundQuestion - detects 'and also' pattern", () => {
  const result = detectCompoundQuestion("Explain X and also explain Y");
  assertEquals(result, true);
});

Deno.test("detectCompoundQuestion - simple question returns false", () => {
  const result = detectCompoundQuestion("What is the capital of France?");
  assertEquals(result, false);
});

Deno.test("detectCompoundQuestion - detects numbered items", () => {
  const result = detectCompoundQuestion("1. First question 2. Second question");
  assertEquals(result, true);
});

// Ambiguity Score Tests
Deno.test("calculateAmbiguityScore - vague 'fix it' scores high", () => {
  const { score, vagueTerms } = calculateAmbiguityScore("fix it");
  assert(score >= 0.7, `Expected score >= 0.7, got ${score}`);
  assert(vagueTerms.includes("it"), "Expected 'it' in vague terms");
});

Deno.test("calculateAmbiguityScore - specific prompt scores low", () => {
  const { score } = calculateAmbiguityScore(
    "Fix the null pointer exception in UserService.java line 42 where user.getName() is called",
  );
  assert(score < 0.3, `Expected score < 0.3, got ${score}`);
});

Deno.test("calculateAmbiguityScore - very short prompts score higher", () => {
  const { score: shortScore } = calculateAmbiguityScore("help");
  const { score: longScore } = calculateAmbiguityScore(
    "Help me understand how to implement authentication in a React application",
  );
  assert(shortScore > longScore, "Short prompts should score higher");
});

// Analyze Prompt Tests
Deno.test("analyzePrompt - returns complete analysis", () => {
  const analysis = analyzePrompt(
    "What are diabetes symptoms? And also treatment options?",
  );

  assertEquals(analysis.detectedDomain, "medical");
  assertEquals(analysis.isCompoundQuestion, true);
  assert(analysis.ambiguityScore >= 0, "Ambiguity score should be >= 0");
  assert(analysis.ambiguityScore <= 1, "Ambiguity score should be <= 1");
});

Deno.test("analyzePrompt - provides examples for detected domain", () => {
  const analysis = analyzePrompt(
    "Write a JavaScript function to sort an array",
  );

  assertEquals(analysis.detectedDomain, "code");
  assert(
    analysis.suggestedExamples.length > 0,
    "Should have suggested examples for code domain",
  );
});

// Enhance Prompt Tests
Deno.test("enhancePrompt - mode none returns original", () => {
  const result = enhancePrompt("fix it", "none");

  assertEquals(result.originalPrompt, "fix it");
  assertEquals(result.enhancedPrompt, "fix it");
  assertEquals(result.enhancementsApplied.length, 0);
});

Deno.test("enhancePrompt - structures compound questions", () => {
  const result = enhancePrompt(
    "What is React and how does it work and what are hooks?",
    "rules",
  );

  assert(
    result.enhancementsApplied.includes("structured_compound_question"),
    "Should apply compound question structuring",
  );
  assert(
    result.enhancedPrompt.includes("1.") ||
      result.enhancedPrompt.includes("2."),
    "Enhanced prompt should have numbered items",
  );
});

Deno.test("enhancePrompt - detects domain and adds to enhancements", () => {
  const result = enhancePrompt("What are the symptoms of diabetes?", "rules");

  assert(
    result.enhancementsApplied.some((e) => e.startsWith("domain_detected:")),
    "Should detect and record domain",
  );
  assertEquals(result.analysis.detectedDomain, "medical");
});

Deno.test("enhancePrompt - adds clarity note for very vague prompts", () => {
  const result = enhancePrompt("fix it", "rules");

  assert(
    result.enhancementsApplied.includes("clarity_improvement"),
    "Should add clarity improvement",
  );
  assert(
    result.enhancedPrompt.includes("[Note:"),
    "Enhanced prompt should include clarification note",
  );
});

Deno.test("enhancePrompt - expands simple definition questions for detected domains", () => {
  const result = enhancePrompt("What is Docker?", "rules");

  assert(
    result.enhancementsApplied.includes("definition_question_expanded"),
    "Should expand a simple definition question",
  );
  const expectedEnhancedPrompt = [
    "What is Docker?",
    "",
    "You are writing for a junior software engineer (0–2 years of experience) who knows basic Linux/CLI and Git but is new to containers.",
    "",
    "## Goal",
    "Help the reader understand Docker well enough to decide when to use it, and to run a simple containerized app locally.",
    "",
    "## Success Criteria",
    "- The reader can explain images vs. containers in their own words.",
    "- The reader can build and run a container locally using the provided commands.",
    "- The reader can name at least 2 scenarios where Docker is a good fit and 2 where it is not.",
    "",
    "## Instructions",
    "1. Provide a one-sentence definition of Docker.",
    "2. Explain the mental model: images vs. containers vs. registries, and where Docker Engine fits.",
    "3. Describe at least 4 common use cases, each with a concrete example.",
    "4. Compare Docker to virtual machines (VMs) and mention at least one Docker-compatible alternative (e.g., Podman) in 1–2 sentences.",
    "5. Walk through a minimal end-to-end example:",
    "   - A tiny `Dockerfile` (keep it under ~15 lines).",
    "   - `docker build` and `docker run` commands.",
    "   - What the user should see if it worked.",
    "6. End with a short checklist of pitfalls and best practices (ports, volumes, image size, secrets).",
    "",
    "## Output Constraints",
    "- Format: Markdown with headings and numbered sections matching the steps above.",
    "- Length: 600–900 words (excluding the JSON block).",
    "- Citations: include 3–5 authoritative sources as footnotes like [1], [2], [3] (prefer official Docker documentation).",
    "- Include a machine-readable summary at the end as a JSON object matching this schema:",
    "```json",
    "{",
    '  "oneSentenceDefinition": "string",',
    '  "keyConcepts": ["string"],',
    '  "useCases": ["string"],',
    '  "whenNotToUse": ["string"],',
    '  "commandsShown": ["string"]',
    "}",
    "```",
    "",
    "## Few-shot Example",
    "User: What is a container image?",
    "Assistant: A container image is an immutable template that packages an application and its dependencies so it can run consistently across environments. It is used to create containers.",
  ].join("\n");
  assertEquals(
    result.enhancedPrompt,
    expectedEnhancedPrompt,
  );
});

Deno.test("enhancePrompt - suggests examples for detected domain", () => {
  const result = enhancePrompt("Write a function in JavaScript", "rules");

  assert(
    result.enhancementsApplied.includes("examples_suggested"),
    "Should suggest examples",
  );
  assert(
    result.analysis.suggestedExamples.length > 0,
    "Should have suggested examples",
  );
});

Deno.test("enhancePrompt - clear prompt has minimal enhancements", () => {
  const result = enhancePrompt("What is the capital of France?", "rules");

  // Should not have clarity improvement or compound structuring
  assert(
    !result.enhancementsApplied.includes("clarity_improvement"),
    "Clear prompt should not need clarity improvement",
  );
  assert(
    !result.enhancementsApplied.includes("structured_compound_question"),
    "Single question should not be structured",
  );
});
