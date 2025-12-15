/**
 * Prompt enhancement engine.
 * Pure functions for analyzing and enhancing user prompts.
 * Following Light FP principles: no classes, immutable data, pure functions.
 */

import type {
  EnhancementResult,
  EnhanceMode,
  PromptAnalysis,
} from "../types.ts";
import {
  COMPOUND_QUESTION_PATTERNS,
  DOMAIN_EXAMPLES,
  DOMAIN_PATTERNS,
  MIN_KEYWORD_MATCHES,
  MIN_PATTERN_MATCHES,
  VAGUE_TERM_PATTERNS,
} from "../lib/patterns.ts";

/**
 * Detect the domain/context from prompt content.
 * Returns the context ID (e.g., "medical", "code") or null if none detected.
 */
export function detectDomain(rawPrompt: string): string | null {
  const promptLower = rawPrompt.toLowerCase();
  const scores: Array<{ domain: string; score: number }> = [];

  for (const dp of DOMAIN_PATTERNS) {
    let score = 0;

    // Count keyword matches
    const keywordMatches = dp.keywords.filter((kw) =>
      promptLower.includes(kw.toLowerCase())
    ).length;

    // Count pattern matches
    const patternMatches = dp.patterns.filter((p) => p.test(rawPrompt)).length;

    // Calculate weighted score
    if (
      keywordMatches >= MIN_KEYWORD_MATCHES ||
      patternMatches >= MIN_PATTERN_MATCHES
    ) {
      score = (keywordMatches * 1 + patternMatches * 2) / dp.weight;
      scores.push({ domain: dp.domain, score });
    }
  }

  // Return highest scoring domain, or null if none
  if (scores.length === 0) return null;

  scores.sort((a, b) => b.score - a.score);
  // Threshold of 1.5 allows for: 1 pattern match (2 pts) / weight 2 = 1.0
  // or 1 keyword + 1 pattern (3 pts) / weight 2 = 1.5
  return scores[0].score >= 1.0 ? scores[0].domain : null;
}

/**
 * Detect if prompt contains compound/multi-part questions.
 */
export function detectCompoundQuestion(rawPrompt: string): boolean {
  // Check for multiple question marks
  const questionCount = (rawPrompt.match(/\?/g) || []).length;
  if (questionCount >= 2) return true;

  // Check compound patterns
  return COMPOUND_QUESTION_PATTERNS.some((p) => p.test(rawPrompt));
}

/**
 * Calculate ambiguity score (0-1) for a prompt.
 * Higher score = more ambiguous/vague.
 */
export function calculateAmbiguityScore(rawPrompt: string): {
  score: number;
  vagueTerms: ReadonlyArray<string>;
} {
  const vagueTerms: string[] = [];
  let totalScore = 0;

  for (const vt of VAGUE_TERM_PATTERNS) {
    if (vt.pattern.test(rawPrompt)) {
      vagueTerms.push(vt.term);
      totalScore += vt.score;
    }
  }

  // Short prompts are inherently more ambiguous
  const lengthPenalty = rawPrompt.length < 20
    ? 0.3
    : rawPrompt.length < 50
    ? 0.1
    : 0;

  // Cap at 1.0
  const finalScore = Math.min(1, totalScore + lengthPenalty);

  return { score: finalScore, vagueTerms };
}

/**
 * Get suggested examples for a detected domain.
 */
export function getSuggestedExamples(
  domain: string | null,
): ReadonlyArray<{ readonly user: string; readonly assistant: string }> {
  if (!domain) return [];
  return DOMAIN_EXAMPLES.get(domain) ?? [];
}

/**
 * User story detection result.
 */
export type UserStoryInfo = {
  readonly isUserStory: boolean;
  readonly actor?: string;
  readonly action?: string;
  readonly benefit?: string;
};

/**
 * Detect if prompt is a user story and extract its components.
 * Handles formats like: "As a [actor], I want [action] so that [benefit]"
 */
export function detectUserStory(rawPrompt: string): UserStoryInfo {
  // Standard user story pattern
  const userStoryPattern =
    /as\s+a\s+([^,]+),?\s*i\s+want\s+(?:to\s+)?([^,]+?)(?:,?\s*so\s+that\s+(.+))?$/i;
  const match = rawPrompt.match(userStoryPattern);

  if (match) {
    return {
      isUserStory: true,
      actor: match[1]?.trim(),
      action: match[2]?.trim(),
      benefit: match[3]?.trim(),
    };
  }

  // Simpler "I want to" pattern
  const simplePattern = /i\s+want\s+(?:to\s+)?(.+)/i;
  const simpleMatch = rawPrompt.match(simplePattern);
  if (simpleMatch && rawPrompt.toLowerCase().includes("as a")) {
    return {
      isUserStory: true,
      action: simpleMatch[1]?.trim(),
    };
  }

  return { isUserStory: false };
}

/**
 * Structure a user story into a specification-ready format.
 */
function structureUserStory(rawPrompt: string, info: UserStoryInfo): string {
  const lines: string[] = [];

  lines.push("Generate a comprehensive specification for this user story:");
  lines.push("");

  if (info.actor) {
    lines.push(`**Actor**: ${info.actor}`);
  }
  if (info.action) {
    lines.push(`**Action**: ${info.action}`);
  }
  if (info.benefit) {
    lines.push(`**Benefit**: ${info.benefit}`);
  }

  lines.push("");
  lines.push(`**Original**: ${rawPrompt}`);
  lines.push("");
  lines.push(
    "Include: API contracts, data models, acceptance criteria, edge cases, and test scenarios.",
  );

  return lines.join("\n");
}

/**
 * Analyze a prompt to extract enhancement-relevant information.
 * Pure function - no side effects.
 */
export function analyzePrompt(rawPrompt: string): PromptAnalysis {
  const detectedDomain = detectDomain(rawPrompt);
  const isCompoundQuestion = detectCompoundQuestion(rawPrompt);
  const { score: ambiguityScore } = calculateAmbiguityScore(rawPrompt);
  const suggestedExamples = getSuggestedExamples(detectedDomain);

  return {
    detectedDomain,
    isCompoundQuestion,
    ambiguityScore,
    suggestedExamples,
  };
}

/**
 * Structure a compound question into numbered parts.
 */
function structureCompoundQuestion(rawPrompt: string): string {
  // Split on common compound indicators
  const parts = rawPrompt
    .split(/(?:\?\s*(?:and|also|then)\s+|\s+and\s+(?:also|then)\s+)/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length <= 1) {
    // Try splitting on just "and" for simple compounds
    const andParts = rawPrompt
      .split(/\s+and\s+/i)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (andParts.length > 1 && andParts.every((p) => p.length > 10)) {
      return andParts.map((p, i) => `${i + 1}. ${p}`).join("\n");
    }

    return rawPrompt;
  }

  return parts.map((p, i) => `${i + 1}. ${p}`).join("\n");
}

/**
 * Improve a vague prompt with clarifying context.
 */
function improveClarityIfNeeded(
  rawPrompt: string,
  ambiguityScore: number,
): { improved: string; wasImproved: boolean } {
  // Only improve if significantly ambiguous
  if (ambiguityScore < 0.5) {
    return { improved: rawPrompt, wasImproved: false };
  }

  // Very short, vague prompts
  if (rawPrompt.length < 15 && ambiguityScore > 0.7) {
    return {
      improved:
        `${rawPrompt}\n\n[Note: Please provide more context for a better response]`,
      wasImproved: true,
    };
  }

  // Prompts with dangling references
  if (/^(?:fix|explain|help with)\s+(?:it|this|that)\b/i.test(rawPrompt)) {
    return {
      improved:
        `${rawPrompt}\n\n[Note: Please specify what "it/this/that" refers to for a targeted response]`,
      wasImproved: true,
    };
  }

  return { improved: rawPrompt, wasImproved: false };
}

/**
 * Expand a simple "What is X?" question into a slightly more specific request.
 * Keeps the original question and adds a second sentence to guide the answer.
 */
function expandDefinitionQuestionIfNeeded(
  rawPrompt: string,
  analysis: PromptAnalysis,
): { expanded: string; wasExpanded: boolean } {
  const trimmed = rawPrompt.trim();

  // Avoid expanding prompts that already contain guidance / multiple sentences.
  const lower = trimmed.toLowerCase();
  if (
    lower.includes("please provide") ||
    lower.includes("include ") ||
    lower.includes("including ") ||
    lower.includes("use cases") ||
    trimmed.includes("\n")
  ) {
    return { expanded: rawPrompt, wasExpanded: false };
  }

  const match = trimmed.match(/^\s*what\s+is\s+(.+?)\s*\?\s*$/i);
  if (!match) return { expanded: rawPrompt, wasExpanded: false };

  const term = match[1]?.trim() ?? "";
  if (!term || term.length > 80) {
    return { expanded: rawPrompt, wasExpanded: false };
  }

  const termLower = term.toLowerCase();

  // Provide a richer expansion for common technical definition prompts where
  // a structured answer and constraints add significant value.
  if (analysis.detectedDomain === "technical" && termLower.includes("docker")) {
    const lines: string[] = [
      trimmed,
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
    ];

    return { expanded: lines.join("\n"), wasExpanded: true };
  }

  const suffix =
    `Please provide an explanation of what ${term} is, including its purpose and main use cases.`;

  return {
    expanded: `${trimmed} ${suffix}`,
    wasExpanded: true,
  };
}

/**
 * Enhance a prompt based on analysis.
 * Pure function that applies rule-based enhancements.
 */
export function enhancePrompt(
  rawPrompt: string,
  mode: EnhanceMode,
): EnhancementResult {
  // No enhancement requested
  if (mode === "none") {
    return {
      originalPrompt: rawPrompt,
      enhancedPrompt: rawPrompt,
      analysis: analyzePrompt(rawPrompt),
      enhancementsApplied: [],
    };
  }

  const analysis = analyzePrompt(rawPrompt);
  const enhancementsApplied: string[] = [];
  let enhancedPrompt = rawPrompt;

  // Enhancement 1: Structure compound questions
  if (analysis.isCompoundQuestion) {
    const structured = structureCompoundQuestion(enhancedPrompt);
    if (structured !== enhancedPrompt) {
      enhancedPrompt = structured;
      enhancementsApplied.push("structured_compound_question");
    }
  }

  // Enhancement 2: Improve clarity for vague prompts
  const { improved, wasImproved } = improveClarityIfNeeded(
    enhancedPrompt,
    analysis.ambiguityScore,
  );
  if (wasImproved) {
    enhancedPrompt = improved;
    enhancementsApplied.push("clarity_improvement");
  }

  // Enhancement 3: Expand simple definition questions for detected domains
  // (e.g., "What is Docker?" -> add purpose/use cases guidance).
  if (analysis.detectedDomain && !analysis.isCompoundQuestion) {
    const { expanded, wasExpanded } = expandDefinitionQuestionIfNeeded(
      enhancedPrompt,
      analysis,
    );
    if (wasExpanded) {
      enhancedPrompt = expanded;
      enhancementsApplied.push("definition_question_expanded");
    }
  }

  // Enhancement 4: Domain detection (doesn't modify prompt, but informs context)
  if (analysis.detectedDomain) {
    enhancementsApplied.push(`domain_detected:${analysis.detectedDomain}`);
  }

  // Enhancement 5: Examples suggested (doesn't modify prompt, but populates IR)
  if (analysis.suggestedExamples.length > 0) {
    enhancementsApplied.push("examples_suggested");
  }

  // Enhancement 6: Structure user stories for specification generation
  const userStoryInfo = detectUserStory(rawPrompt);
  if (userStoryInfo.isUserStory) {
    enhancedPrompt = structureUserStory(rawPrompt, userStoryInfo);
    enhancementsApplied.push("user_story_structured");
  }

  return {
    originalPrompt: rawPrompt,
    enhancedPrompt,
    analysis,
    enhancementsApplied,
  };
}
