# Feature Gap: Actual Prompt Enhancement Not Implemented

## Current State

The OPE (Online Prompt Enhancer) system currently **does NOT enhance the user's original prompt text**. Instead, it only:

1. ✅ Adds structured system instructions (role, objective, constraints, style, steps)
2. ✅ Wraps the original prompt with "TASK:" label
3. ✅ Adds output format specifications (JSON schema)
4. ❌ **Does NOT improve, clarify, or enhance the actual user prompt content**

### Example

**Input:** "What is TypeScript?"

**Current Output:**
```
ROLE: precise expert
OBJECTIVE: Answer the user's request accurately and concisely.
CONSTRAINTS: json-only; cite-or-say-unknown; 120-160-words
STYLE: succinct; use table only if clearly useful
STEPS: analyze -> answer

TASK:
What is TypeScript?  ← UNCHANGED!

OUTPUT: Return a JSON object with fields:
- answer: string
- citations: string[] (URLs or source identifiers; use [] or ['unknown'] if none).
```

**Expected Output (with actual enhancement):**
```
ROLE: precise expert in programming languages and web development
OBJECTIVE: Answer the user's request accurately and concisely.
CONSTRAINTS: json-only; cite-or-say-unknown; 120-160-words
STYLE: succinct; use table only if clearly useful
STEPS: analyze -> answer

TASK:
Explain what TypeScript is, including:
- Its relationship to JavaScript
- Key features (static typing, compile-time checking, IDE support)
- Main use cases and benefits
- How it differs from plain JavaScript

Provide a clear, structured explanation suitable for someone familiar with JavaScript but new to TypeScript.

EXAMPLES:
Example 1: "TypeScript is a superset of JavaScript that adds static typing..."
Example 2: "Key benefits include catching errors at compile time rather than runtime..."

OUTPUT: Return a JSON object with fields:
- answer: string (structured explanation with examples)
- citations: string[] (official TypeScript docs, reputable sources)
```

---

## Evidence in Codebase

### 1. Unused Parameter in `synthesize()`
**File:** [src/engine/synthesize.ts:12](src/engine/synthesize.ts#L12)

```typescript
export function synthesize(
  _rawPrompt: string,  // ← Prefixed with _ = intentionally unused
  a: AnalysisReport,
  contextInstr?: ContextInstruction,
): PromptIR {
```

The raw prompt is passed but never analyzed or used to enhance the IR.

### 2. Direct Pass-Through in `compileIR()`
**File:** [src/engine/compile.ts:35-42](src/engine/compile.ts#L35-L42)

```typescript
let userText = [
  "TASK:",
  rawPrompt,  // ← Original prompt inserted verbatim, no enhancement
  "",
  "OUTPUT: Return a JSON object with fields:",
  "- answer: string",
  "- citations: string[] (URLs or source identifiers; use [] or ['unknown'] if none).",
].join("\n");
```

### 3. Empty Examples Array
**File:** [src/engine/synthesize.ts:50](src/engine/synthesize.ts#L50)

```typescript
return {
  role,
  objective,
  constraints,
  style,
  steps,
  outputSchema: { answer: "string", citations: "string[]" },
  examples: [],  // ← Always empty, never populated
};
```

The IR has an `examples` field but it's never used.

### 4. Placeholder for Future Optimization
**File:** [src/routes/generate.ts:94-95](src/routes/generate.ts#L94-L95)

```typescript
// Placeholder for future Ax/DSPy optimization:
const ir2 = ir;
```

This comment explicitly acknowledges that prompt optimization is planned but not implemented.

---

## Impact

### What Users Get
- Structured formatting around their prompt
- System instructions for LLM behavior
- Output schema requirements
- Consistent prompt template

### What Users Don't Get
- ❌ Clarified ambiguous prompts
- ❌ Added context and details
- ❌ Few-shot examples
- ❌ Edge case handling
- ❌ Better phrasing for LLM comprehension
- ❌ Domain-specific enhancements
- ❌ Decomposition of complex queries

---

## Recommendations for Implementation

### Phase 1: Basic Prompt Enhancement (Quick Win)

**Goal:** Add simple rule-based enhancements to the raw prompt text.

#### Implementation Approach

1. **Create new file:** `src/engine/enhance.ts`

```typescript
/**
 * Enhance raw prompt with additional details, clarifications, and structure
 */
export function enhancePrompt(
  rawPrompt: string,
  analysis: AnalysisReport,
  taskType?: TaskType,
): string {
  // 1. Add clarifying questions/details based on prompt analysis
  // 2. Suggest examples if appropriate
  // 3. Structure multi-part questions
  // 4. Add relevant context based on taskType
  return enhancedPrompt;
}
```

2. **Integration point:** Update `synthesize()` to use the raw prompt

```typescript
export function synthesize(
  rawPrompt: string,  // Remove underscore
  a: AnalysisReport,
  contextInstr?: ContextInstruction,
): PromptIR {
  // Analyze prompt content here
  const promptAnalysis = analyzePromptContent(rawPrompt);

  // Generate examples based on task type
  const examples = generateExamples(rawPrompt, a.taskType);

  return {
    role: enhanceRole(promptAnalysis),
    objective: enhanceObjective(rawPrompt, a),
    constraints,
    style,
    steps,
    outputSchema,
    examples,  // Now populated!
  };
}
```

3. **Update compilation:** Use enhanced content

```typescript
export function compileIR(
  ir: PromptIR,
  rawPrompt: string,
  contextInstr?: ContextInstruction,
): CompiledPrompt {
  // Enhance the raw prompt before inserting
  const enhancedPrompt = buildEnhancedPrompt(rawPrompt, ir);

  let userText = [
    "TASK:",
    enhancedPrompt,  // ← Now actually enhanced
    "",
    ...(ir.examples.length > 0 ? formatExamples(ir.examples) : []),
    "",
    "OUTPUT: Return a JSON object with fields:",
    "- answer: string",
    "- citations: string[] (URLs or source identifiers; use [] or ['unknown'] if none).",
  ].join("\n");

  // ... rest of compilation
}
```

#### Enhancement Strategies (Rule-Based)

**A. Clarification Addition**
```typescript
// Input: "What is X?"
// Output: "What is X? Please explain:
//          - Its definition and key concepts
//          - Main use cases
//          - How it relates to similar concepts"
```

**B. Context Injection**
```typescript
// Input: "Explain Raft consensus"
// Output: "Explain the Raft consensus algorithm in distributed systems.
//          Include:
//          - The problem it solves
//          - Key components (leader election, log replication, safety)
//          - How it compares to Paxos"
```

**C. Example Generation**
```typescript
// For taskType="extract":
// Add: "Example: If the text mentions 'John Doe worked at Acme Corp',
//       extract: {company: 'Acme Corp', person: 'John Doe'}"
```

**D. Decomposition**
```typescript
// Input: "Compare A and B"
// Output: "Compare A and B:
//          1. First, describe A's key characteristics
//          2. Then, describe B's key characteristics
//          3. Finally, highlight similarities and differences"
```

---

### Phase 2: LLM-Based Enhancement (Future)

**Goal:** Use an LLM to intelligently enhance the prompt.

#### Approach: Meta-Prompting

```typescript
async function enhanceWithLLM(
  rawPrompt: string,
  analysis: AnalysisReport,
  adapter: Adapter,
): Promise<string> {
  const metaPrompt = `You are a prompt engineering expert. Enhance this prompt to get better LLM responses:

Original: "${rawPrompt}"

Task type: ${analysis.taskType}
Constraints: ${analysis.constraints.join(", ")}

Enhance by:
1. Adding clarifying details
2. Providing relevant examples
3. Structuring multi-part questions
4. Adding context where needed

Return ONLY the enhanced prompt text, no explanation.`;

  const result = await adapter({
    system: makeSystemPrompt("You are a prompt engineering expert."),
    user: makeUserPrompt(metaPrompt),
    temperature: makeTemperature(0.3),
    maxTokens: makeMaxTokens(800),
  });

  return result.ok ? result.value.text : rawPrompt; // Fallback to original
}
```

#### Implementation

1. Add optional `enhancementMode` parameter to GenerateRequest:
   ```typescript
   type GenerateRequest = {
     readonly rawPrompt: PromptText;
     readonly taskType?: TaskType;
     readonly targetHint?: "local" | "cloud";
     readonly context?: string;
     readonly enhancementMode?: "none" | "rules" | "llm"; // NEW
   };
   ```

2. Update pipeline in `handleGenerate()`:
   ```typescript
   // After analyze stage
   const analysis = analyze(request);

   // NEW: Enhancement stage (conditionally)
   let enhancedPrompt = request.rawPrompt;
   if (request.enhancementMode === "rules") {
     enhancedPrompt = enhancePromptRules(request.rawPrompt, analysis);
   } else if (request.enhancementMode === "llm") {
     enhancedPrompt = await enhancePromptLLM(request.rawPrompt, analysis, adapter);
   }

   // Continue with synthesize using enhanced prompt
   const ir = synthesize(enhancedPrompt, analysis, contextInstr);
   ```

---

### Phase 3: Ax/DSPy Integration (Advanced)

**Goal:** Use prompt optimization frameworks for data-driven enhancement.

The placeholder at [src/routes/generate.ts:94-95](src/routes/generate.ts#L94-L95) suggests this was planned:

```typescript
// Placeholder for future Ax/DSPy optimization:
const ir2 = ir;
```

#### Approach

1. **Collect training data**: Log successful prompts and their outcomes
2. **Define optimization metric**: Response quality, citation accuracy, etc.
3. **Use Ax/DSPy to optimize**: Automatically discover better prompt patterns
4. **Apply learned transformations**: Use optimized templates

**Reference:**
- [DSPy Documentation](https://dspy-docs.vercel.app/)
- [Ax Platform](https://ax.dev/)

---

## Testing Strategy

### Unit Tests for Enhancement

```typescript
// test/enhance.test.ts
Deno.test("enhancePrompt - adds clarifying details", () => {
  const input = "What is TypeScript?";
  const enhanced = enhancePrompt(input, analysis, "qa");

  assert(enhanced.length > input.length);
  assert(enhanced.includes("JavaScript"));
  assert(enhanced.includes("static typing") || enhanced.includes("type system"));
});

Deno.test("enhancePrompt - preserves original meaning", () => {
  const input = "Explain quantum entanglement";
  const enhanced = enhancePrompt(input, analysis, "qa");

  assert(enhanced.includes("quantum entanglement"));
  assert(!enhanced.includes("relativity")); // Don't add unrelated concepts
});

Deno.test("enhancePrompt - generates examples for extract tasks", () => {
  const input = "Extract company names from text";
  const enhanced = enhancePrompt(input, analysis, "extract");

  assert(enhanced.includes("Example") || enhanced.includes("example"));
});
```

### Integration Tests

```typescript
Deno.test("Generate with enhancement - produces better output", async () => {
  const response = await handleGenerate({
    rawPrompt: "What is REST?",
    taskType: "qa",
    enhancementMode: "rules",
  }, "test-id");

  const result = await response.json();

  // Enhanced prompt should be longer and more detailed
  assert(result.meta.compiled.user.length > 200);
  assert(result.meta.compiled.user.includes("REST") || result.meta.compiled.user.includes("RESTful"));
});
```

---

## Priority & Effort Estimation

| Phase | Priority | Effort | Value | Risk |
|-------|----------|--------|-------|------|
| **Phase 1: Rule-Based** | ⭐⭐⭐ High | Medium (2-3 days) | High | Low |
| **Phase 2: LLM-Based** | ⭐⭐ Medium | Medium (2-3 days) | Very High | Medium (depends on LLM quality) |
| **Phase 3: Ax/DSPy** | ⭐ Low | High (1-2 weeks) | Very High | High (requires training data) |

### Recommended Approach

**Start with Phase 1 (Rule-Based Enhancement):**
- Immediate value with low risk
- No additional LLM calls required
- Predictable, testable behavior
- Can be enhanced iteratively

**Example Implementation Timeline:**
- Day 1: Implement `enhancePrompt()` with basic clarification rules
- Day 2: Add task-type-specific enhancements (qa, extract, summarize)
- Day 3: Integration, testing, and refinement
- Day 4: Add example generation
- Day 5: Polish and documentation

---

## Breaking Changes

### API Changes (Backward Compatible)

Add optional field to GenerateRequest:
```typescript
type GenerateRequest = {
  readonly rawPrompt: PromptText;
  readonly taskType?: "qa" | "extract" | "summarize";
  readonly targetHint?: "local" | "cloud";
  readonly context?: string;
  readonly enhancementMode?: "none" | "rules" | "llm"; // NEW - defaults to "rules"
};
```

**Default behavior:** If not specified, use `"rules"` for backward compatibility enhancement.

Set to `"none"` for exact current behavior (no enhancement).

### Response Changes

No breaking changes to response structure. Enhanced prompts will appear in existing fields:
- `meta.compiled.user` - Will contain enhanced user prompt
- `meta.ir` - May contain populated `examples` array

---

## Related Files to Modify

1. **Create new:**
   - `src/engine/enhance.ts` - Prompt enhancement logic
   - `test/enhance.test.ts` - Unit tests

2. **Modify existing:**
   - `src/engine/synthesize.ts` - Use rawPrompt parameter, populate examples
   - `src/engine/compile.ts` - Integrate enhanced prompt text
   - `src/routes/generate.ts` - Add enhancement stage to pipeline
   - `src/types.ts` - Add EnhancementMode type, update GenerateRequest
   - `test/smoke.test.ts` - Add tests for enhanced prompts

3. **Documentation:**
   - `README.md` - Update to explain enhancement feature
   - `USER_GUIDE.md` - Add examples of enhanced vs non-enhanced prompts
   - `CLAUDE.md` - Update architecture description

---

## Success Metrics

### How to Measure if Enhancement Works

1. **Length Increase**: Enhanced prompts should be 2-4x longer than original
2. **Detail Addition**: Enhanced prompts should include clarifying details
3. **Example Inclusion**: Extract/summarize tasks should have examples
4. **Quality Preservation**: Enhanced prompts shouldn't add incorrect assumptions
5. **User Feedback**: Users should report better LLM responses with enhanced prompts

### Example Success Criteria

| Metric | Target |
|--------|--------|
| Average prompt length increase | 2-4x |
| Examples generated for extract tasks | 80%+ |
| User-reported improvement in LLM responses | 60%+ |
| Enhancement time overhead | < 100ms |

---

## Conclusion

The OPE system has a well-architected pipeline but is missing its core value proposition: **actual prompt enhancement**. The current implementation only adds structure and formatting.

**Recommended Action:** Implement Phase 1 (Rule-Based Enhancement) to deliver immediate value with minimal risk. This can be completed in a sprint and will make OPE genuinely useful for improving prompt quality, not just prompt structure.

**Next Steps:**
1. Review and approve this feature gap document
2. Create implementation plan for Phase 1
3. Set up tracking for enhancement quality metrics
4. Begin implementation with `src/engine/enhance.ts`
