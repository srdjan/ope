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
  const result = detectDomain("What are the symptoms of diabetes and its treatment options?");
  assertEquals(result, "medical");
});

Deno.test("detectDomain - identifies code domain", () => {
  const result = detectDomain("Write a function in JavaScript to sort an array");
  assertEquals(result, "code");
});

Deno.test("detectDomain - identifies code domain from code block", () => {
  const result = detectDomain("Fix this bug:\n```javascript\nconst x = null;\n```");
  assertEquals(result, "code");
});

Deno.test("detectDomain - identifies legal domain", () => {
  const result = detectDomain("What are my legal rights in a contract dispute?");
  assertEquals(result, "legal");
});

Deno.test("detectDomain - identifies academic domain", () => {
  const result = detectDomain("What is the research methodology for a peer-reviewed study?");
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
    "Fix the null pointer exception in UserService.java line 42 where user.getName() is called"
  );
  assert(score < 0.3, `Expected score < 0.3, got ${score}`);
});

Deno.test("calculateAmbiguityScore - very short prompts score higher", () => {
  const { score: shortScore } = calculateAmbiguityScore("help");
  const { score: longScore } = calculateAmbiguityScore(
    "Help me understand how to implement authentication in a React application"
  );
  assert(shortScore > longScore, "Short prompts should score higher");
});

// Analyze Prompt Tests
Deno.test("analyzePrompt - returns complete analysis", () => {
  const analysis = analyzePrompt("What are diabetes symptoms? And also treatment options?");

  assertEquals(analysis.detectedDomain, "medical");
  assertEquals(analysis.isCompoundQuestion, true);
  assert(analysis.ambiguityScore >= 0, "Ambiguity score should be >= 0");
  assert(analysis.ambiguityScore <= 1, "Ambiguity score should be <= 1");
});

Deno.test("analyzePrompt - provides examples for detected domain", () => {
  const analysis = analyzePrompt("Write a JavaScript function to sort an array");

  assertEquals(analysis.detectedDomain, "code");
  assert(analysis.suggestedExamples.length > 0, "Should have suggested examples for code domain");
});

// Enhance Prompt Tests
Deno.test("enhancePrompt - mode none returns original", () => {
  const result = enhancePrompt("fix it", "none");

  assertEquals(result.originalPrompt, "fix it");
  assertEquals(result.enhancedPrompt, "fix it");
  assertEquals(result.enhancementsApplied.length, 0);
});

Deno.test("enhancePrompt - structures compound questions", () => {
  const result = enhancePrompt("What is React and how does it work and what are hooks?", "rules");

  assert(
    result.enhancementsApplied.includes("structured_compound_question"),
    "Should apply compound question structuring"
  );
  assert(
    result.enhancedPrompt.includes("1.") || result.enhancedPrompt.includes("2."),
    "Enhanced prompt should have numbered items"
  );
});

Deno.test("enhancePrompt - detects domain and adds to enhancements", () => {
  const result = enhancePrompt("What are the symptoms of diabetes?", "rules");

  assert(
    result.enhancementsApplied.some((e) => e.startsWith("domain_detected:")),
    "Should detect and record domain"
  );
  assertEquals(result.analysis.detectedDomain, "medical");
});

Deno.test("enhancePrompt - adds clarity note for very vague prompts", () => {
  const result = enhancePrompt("fix it", "rules");

  assert(
    result.enhancementsApplied.includes("clarity_improvement"),
    "Should add clarity improvement"
  );
  assert(
    result.enhancedPrompt.includes("[Note:"),
    "Enhanced prompt should include clarification note"
  );
});

Deno.test("enhancePrompt - suggests examples for detected domain", () => {
  const result = enhancePrompt("Write a function in JavaScript", "rules");

  assert(
    result.enhancementsApplied.includes("examples_suggested"),
    "Should suggest examples"
  );
  assert(
    result.analysis.suggestedExamples.length > 0,
    "Should have suggested examples"
  );
});

Deno.test("enhancePrompt - clear prompt has minimal enhancements", () => {
  const result = enhancePrompt("What is the capital of France?", "rules");

  // Should not have clarity improvement or compound structuring
  assert(
    !result.enhancementsApplied.includes("clarity_improvement"),
    "Clear prompt should not need clarity improvement"
  );
  assert(
    !result.enhancementsApplied.includes("structured_compound_question"),
    "Single question should not be structured"
  );
});
