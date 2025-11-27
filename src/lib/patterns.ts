/**
 * Pattern definitions for prompt analysis and domain detection.
 * Following Light FP principles: immutable data, pure functions.
 */

/**
 * Domain detection configuration.
 * Keywords and patterns for auto-detecting context from prompts.
 */
export type DomainPattern = {
  readonly domain: string;
  readonly keywords: ReadonlyArray<string>;
  readonly patterns: ReadonlyArray<RegExp>;
  readonly weight: number; // Higher = more confidence needed
};

/**
 * Domain detection patterns aligned with contexts.md definitions.
 */
export const DOMAIN_PATTERNS: ReadonlyArray<DomainPattern> = [
  {
    domain: "medical",
    keywords: [
      "symptom",
      "diagnosis",
      "treatment",
      "medication",
      "patient",
      "doctor",
      "health",
      "disease",
      "medicine",
      "clinical",
      "therapy",
      "prescription",
      "dosage",
      "infection",
      "chronic",
      "acute",
    ],
    patterns: [
      /\b(symptom|diagnos|treatment|medication|patient)s?\b/i,
      /\b(medical|clinical|health)\s+(advice|information|condition)/i,
      /\b(side\s+effects?|drug\s+interactions?)\b/i,
    ],
    weight: 2,
  },
  {
    domain: "legal",
    keywords: [
      "law",
      "court",
      "contract",
      "liability",
      "statute",
      "legal",
      "attorney",
      "lawyer",
      "lawsuit",
      "jurisdiction",
      "regulation",
      "compliance",
      "rights",
      "lawsuit",
      "litigation",
    ],
    patterns: [
      /\b(law|legal|court|contract|statute)s?\b/i,
      /\b(sue|lawsuit|litigation|liability)\b/i,
      /\blegal\s+(advice|counsel|rights?|obligations?)\b/i,
    ],
    weight: 2,
  },
  {
    domain: "code",
    keywords: [
      "function",
      "class",
      "variable",
      "error",
      "bug",
      "api",
      "code",
      "programming",
      "javascript",
      "python",
      "typescript",
      "react",
      "database",
      "algorithm",
      "debug",
      "compile",
      "syntax",
    ],
    patterns: [
      /\b(function|class|variable|const|let|var)\b/i,
      /\b(error|bug|exception|crash)\b/i,
      /```[\w]*\n/,
      /\b(api|endpoint|rest|graphql)\b/i,
      /\b(import|export|require)\s+/i,
    ],
    weight: 1,
  },
  {
    domain: "academic",
    keywords: [
      "research",
      "study",
      "hypothesis",
      "methodology",
      "citation",
      "literature",
      "peer-reviewed",
      "thesis",
      "dissertation",
      "scholarly",
      "empirical",
      "theoretical",
    ],
    patterns: [
      /\b(research|study|hypothesis|methodology)\b/i,
      /\b(peer[- ]reviewed|scholarly|academic)\b/i,
      /\b(cite|citation|reference)s?\b/i,
      /\b(literature\s+review|meta[- ]analysis)\b/i,
    ],
    weight: 2,
  },
  {
    domain: "business",
    keywords: [
      "business",
      "market",
      "revenue",
      "profit",
      "strategy",
      "investment",
      "startup",
      "roi",
      "kpi",
      "stakeholder",
      "quarterly",
      "budget",
    ],
    patterns: [
      /\b(business|market|strategy|investment)\b/i,
      /\b(revenue|profit|roi|kpi)\b/i,
      /\b(startup|enterprise|company)\b/i,
    ],
    weight: 1,
  },
  {
    domain: "educational",
    keywords: [
      "explain",
      "teach",
      "learn",
      "understand",
      "concept",
      "example",
      "beginner",
      "tutorial",
      "fundamentals",
      "basics",
    ],
    patterns: [
      /\b(explain|teach|learn)\s+(me|how|what|why)\b/i,
      /\bfor\s+beginners?\b/i,
      /\b(step[- ]by[- ]step|tutorial)\b/i,
    ],
    weight: 0.5, // Lower weight - more generic
  },
  {
    domain: "creative",
    keywords: [
      "story",
      "poem",
      "creative",
      "fiction",
      "narrative",
      "character",
      "plot",
      "write",
      "novel",
      "short story",
    ],
    patterns: [
      /\b(write|create)\s+(a\s+)?(story|poem|fiction|narrative)\b/i,
      /\b(creative\s+writing|short\s+story)\b/i,
      /\b(character|plot|setting)\s+development\b/i,
    ],
    weight: 1,
  },
  {
    domain: "technical",
    keywords: [
      "documentation",
      "manual",
      "guide",
      "specification",
      "architecture",
      "system",
      "infrastructure",
      "deployment",
      "configuration",
    ],
    patterns: [
      /\b(documentation|technical\s+writing)\b/i,
      /\b(user\s+guide|manual|specification)\b/i,
      /\b(architecture|system\s+design)\b/i,
    ],
    weight: 1,
  },
];

/**
 * Patterns for detecting compound/multi-part questions.
 */
export const COMPOUND_QUESTION_PATTERNS: ReadonlyArray<RegExp> = [
  /\?\s*(?:and|also|then)\s+/i, // "What is X? And also Y?"
  /\band\s+(?:also|then|finally)\b/i, // "explain X and also Y"
  /\?\s*\w+.*\?/s, // Multiple question marks
  /\b(?:first|second|third|1\.|2\.|3\.)/i, // Numbered items
  /,\s*(?:and|as well as|plus|also)\s+/i, // Comma lists with conjunctions
  /\band\s+\w+.{10,}\band\s+\w+/i, // Multiple "and" connectors with content between
];

/**
 * Patterns for detecting vague/ambiguous prompts.
 */
export const VAGUE_TERM_PATTERNS: ReadonlyArray<{
  readonly pattern: RegExp;
  readonly term: string;
  readonly score: number;
}> = [
  { pattern: /^(?:explain|fix|help with)\s+it\b/i, term: "it", score: 0.8 },
  { pattern: /^(?:explain|fix|help with)\s+this\b/i, term: "this", score: 0.7 },
  { pattern: /^(?:explain|fix|help with)\s+that\b/i, term: "that", score: 0.7 },
  { pattern: /\bmake\s+it\s+(?:better|work|faster)\b/i, term: "make it better", score: 0.6 },
  { pattern: /^(?:help|assist)\s*$/i, term: "help", score: 0.9 },
  { pattern: /^(?:what|how|why)\s*\??\s*$/i, term: "incomplete question", score: 0.9 },
  { pattern: /\bsome\s+(?:things?|stuff)\b/i, term: "some things", score: 0.4 },
  { pattern: /\bfix\s+(?:the\s+)?(?:issue|problem|bug)\b/i, term: "fix the issue", score: 0.5 },
];

/**
 * Domain-specific example prompts for populating PromptIR.examples.
 */
export const DOMAIN_EXAMPLES: ReadonlyMap<
  string,
  ReadonlyArray<{ readonly user: string; readonly assistant: string }>
> = new Map([
  [
    "medical",
    [
      {
        user: "What are common cold symptoms?",
        assistant: '{"answer": "Common cold symptoms include runny or stuffy nose, sore throat, cough, congestion, slight body aches, sneezing, low-grade fever, and general malaise. Symptoms typically appear 1-3 days after exposure and last 7-10 days. Note: This is general information only. Consult a healthcare professional for medical advice.", "citations": ["unknown"]}',
      },
    ],
  ],
  [
    "code",
    [
      {
        user: "How do I reverse a string in JavaScript?",
        assistant: '{"answer": "To reverse a string in JavaScript: `str.split(\'\').reverse().join(\'\')`. This splits the string into an array of characters, reverses the array, then joins back into a string. For Unicode-safe reversal, use `[...str].reverse().join(\'\')` to properly handle multi-byte characters.", "citations": ["unknown"]}',
      },
    ],
  ],
  [
    "legal",
    [
      {
        user: "What is a contract?",
        assistant: '{"answer": "A contract is a legally binding agreement between two or more parties that creates mutual obligations enforceable by law. Key elements include: offer, acceptance, consideration, capacity, and legal purpose. Note: This is general legal information, not legal advice. Consult an attorney for specific legal matters.", "citations": ["unknown"]}',
      },
    ],
  ],
  [
    "academic",
    [
      {
        user: "What is peer review?",
        assistant: '{"answer": "Peer review is a scholarly evaluation process where experts in a field assess the quality, validity, and significance of academic work before publication. It serves as a quality control mechanism in scientific and academic publishing, helping ensure research meets methodological standards and contributes meaningfully to the field.", "citations": ["unknown"]}',
      },
    ],
  ],
]);

/**
 * Minimum keyword matches required for domain detection.
 */
export const MIN_KEYWORD_MATCHES = 2;

/**
 * Minimum pattern matches required for domain detection.
 */
export const MIN_PATTERN_MATCHES = 1;
