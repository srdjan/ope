# OPE (Online Prompt Enhancer) — Demo & Showcase Guide

This guide helps you **demo** and **explain** OPE to a broad audience: product
folks, builders, and developers.

- OPE is a **prompt enhancement + routing** system: you provide a raw prompt,
  and it returns a **structured, clearer, more “model-ready”** prompt plus a
  **final system/user request** that can be sent to an LLM.
- The project is **DSPy-inspired** (it emits a DSPy-style “signature” view of
  the compiled system/user prompts) and is designed with a **future hook** for
  **Ax-style optimization** of the intermediate representation (IR).

## 1) Introduction & Purpose

### What is OPE and what problem does it solve?

Most LLM failures in real apps don’t come from “bad models” — they come from:

- Vague goals (“Explain X”) without success criteria
- Missing constraints (format, length, citations, boundaries)
- Mixed intents (compound questions) that cause partial answers
- Domain mismatch (a medical prompt answered like casual advice)

**OPE** addresses this by turning a raw prompt into a **typed Prompt IR** and
then compiling it into:

- A **system prompt** that sets role, boundaries, style, safety rules
- A **user prompt** that contains a structured task and output requirements
- A **validation step** that checks/repairs the model response into a
  predictable JSON shape

### Prompt enhancement (in plain language)

**Prompt enhancement** is the process of taking a user’s request and adding:

- Clarity (“what success looks like”)
- Structure (steps, sub-questions, required outputs)
- Guardrails (what to do when unsure, how to cite)
- Domain framing (medical/legal/code/academic tone and constraints)

The goal isn’t to “make prompts longer”; it’s to make them **more specific and
testable**.

### DSPy & Ax in the context of this demo

- **DSPy (conceptually)**: OPE uses a DSPy-like idea: represent the task as a
  **signature / specification** (role, objective, constraints, style, steps,
  schema). OPE exposes the compiled system/user message pair as a **DSPy
  Signature tab** so the audience can see the _exact contract_ sent to the
  model.
- **Ax optimization (conceptually)**: OPE has a dedicated hook in the pipeline
  for future **data-driven optimization** (e.g., tuning constraints, ordering,
  examples, or decoding parameters) using **Ax-style black-box optimization**
  guided by metrics like correctness, schema validity, or user ratings.

If you want to be fully precise in a talk: today’s demo uses **rule-based
enhancement** plus a DSPy-style signature output, and is architected to be
**Ax-ready** for iterative optimization.

## 2) Architecture Overview

### The pipeline: analyze → synthesize → compile → route → generate → validate

At a high level, OPE runs:

1. **Enhance**: analyze the raw prompt and apply rule-based improvements (domain
   detection, compound splitting, clarity nudges).
2. **Analyze**: decide _requirements_ (JSON output? citations? length/word
   limits?).
3. **Synthesize**: build a **Prompt IR**
   (role/objective/constraints/style/steps/examples/schema).
4. **Compile**: turn IR + enhanced prompt into the final **system** + **user**
   messages (plus decoding params).
5. **Route**: decide which adapter/model to call (local/echo, local/http, cloud
   API).
6. **Generate**: call the chosen adapter.
7. **Validate**: validate/repair the response into the expected JSON schema.

In the codebase, the pipeline is visible in `src/routes/generate.ts`.

### How enhancement works (domain detection, compound structuring, clarity analysis)

OPE’s enhancement stage (see `src/engine/enhance.ts`) focuses on three big wins:

- **Domain detection**: classify prompts as medical/legal/code/academic/etc.
  using patterns and keywords.
- **Compound question structuring**: detect multiple asks and rewrite them into
  explicit numbered sub-questions.
- **Clarity analysis**: flag ambiguity and optionally add “clarifying
  assumptions / ask-back” nudges.

The enhancement stage also suggests few-shot examples for certain domains, which
the synthesizer can incorporate.

### Contexts: customizing LLM behavior

**Contexts** are reusable “style + constraints” bundles (medical, legal, code,
etc.). They:

- Adjust role/objective wording
- Add domain-specific constraints (e.g., medical safety disclaimers)
- Adjust tone and output formatting
- Optionally override decoding defaults (temperature/max tokens)

Contexts are defined in `contexts.md` and loaded at runtime. You can query them
from the server at `GET /v1/contexts`.

## 3) Step-by-Step User Guide (Web UI)

### Access the demo

1. Run the server:
   - `deno task dev`
2. Open the UI:
   - `http://127.0.0.1:8787/`

### What each field/option does

The form sends a JSON request to `POST /v1/generate`.

- **rawPrompt**: your original prompt text (required).
- **taskType**:
  - `auto` (default): infer from the prompt
  - `qa`: answer/explain with reasoning and constraints
  - `extract`: pull structured facts
  - `summarize`: compress to a target length
- **targetHint**:
  - `auto` (default): route based on availability/config
  - `local`: force local adapter if possible
  - `cloud`: force cloud adapter if configured
- **context**:
  - `auto (detect)` (default): use detected domain if available
  - or choose a context ID like `medical`, `legal`, `code`, `academic`, …
- **enhance**:
  - `rules` (default): apply rule-based enhancement
  - `none`: skip enhancement (use raw prompt as-is)

### How to interpret the tabs

The output panel has multiple views of the same request:

- **DSPy Signature**: the “contract” that will be sent to the model (system +
  user messages), presented in a DSPy-friendly shape.
- **Enhanced Prompt**: the cleaned-up user task text derived from the compiled
  prompt.
- **Final Prompt**: the exact payload (system + user) you can send to any
  chat-style LLM API.
- **Model Output** (bonus): the model’s generated answer.

The **Copy** button always copies the _currently selected tab_.

### Example workflow with screenshots

Use these screenshots (generated by `scripts/ui_smoke.ts`) as “talk track”
anchors:

- Desktop prompt view: `docs/screenshots/desktop-1366x768-prompt.png`
- Desktop final view: `docs/screenshots/desktop-1366x768-final.png`
- Mobile prompt view: `docs/screenshots/mobile-390x844-prompt.png`

Suggested narration:

1. “Here’s the raw prompt. I’m going to let the system auto-detect the domain.”
2. “Now the Enhanced Prompt is more structured: success criteria, constraints,
   and output format are explicit.”
3. “The Final Prompt tab shows the exact system/user messages. This is what
   you’d ship in production.”
4. “And Model Output shows the response after validation/repair into consistent
   JSON.”

## 4) Technical Deep Dive (Developer Audience)

### Key design patterns used

- **Functional TypeScript**: small pure functions for each stage (easy to test
  and reason about).
- **Result types**: adapters return `Result<T, E>` instead of throwing
  (`src/lib/result.ts`).
- **Branded types**: prevent mixing prompt text / tokens / temperature
  (`src/lib/branded.ts`).
- **Ports & Adapters**:
  - Ports: config/context interfaces (`src/ports/*`)
  - Adapters: local echo, local HTTP, cloud OpenAI-style (`src/adapters/*`)

### Run locally

- Start server: `deno task dev`
- Run tests: `deno test -A`
- Try a call from CLI: `deno task gen:local`

### Configure different adapters

OPE selects a model based on config + `targetHint` (see `src/engine/route.ts`).

- **Local echo / mock (default)**:
  - Set `MOCK_AI=true` (default) to use deterministic local behavior.
- **Local HTTP adapter**:
  - Set `MOCK_AI=false`
  - Set `LLM_BASE_URL=http://127.0.0.1:11434/generate`
  - Adapter expects `{ text: string }` (and supports a few compatible variants).
- **Cloud API adapter (OpenAI-compatible)**:
  - Set `MOCK_AI=false`
  - Set `CLOUD_BASE_URL=…`
  - Set `CLOUD_API_KEY=…`
  - Set `CLOUD_MODEL=…`

### Extend the system

Common extensions are intentionally straightforward:

- **Add a new context**
  - Edit `contexts.md`
  - Restart `deno task dev`
  - Verify via `GET /v1/contexts`
- **Add a new adapter**
  1. Create `src/adapters/yourAdapter.ts` implementing the adapter interface
  2. Add config flags in `src/config.ts`
  3. Extend routing in `src/engine/route.ts`
- **Add a new pipeline stage**
  - Keep stages pure and typed (take inputs, return outputs)
  - Wire it into `src/routes/generate.ts` and add tests under `test/`

## 5) Demo Scenarios (Before/After)

The fastest way to win an audience is to show concrete upgrades. Use these as
live demos.

### Scenario A — Medical (QA)

**Before (rawPrompt):**

- “Is it safe to take ibuprofen every day?”

**After (what OPE adds):**

- Clarifies age/conditions, duration, dose assumptions
- Adds safety boundaries and “when to seek help”
- Requests a structured answer with cautions and citations/unknown handling

### Scenario B — Code (QA / Debug)

**Before:**

- “My React app is slow. What do I do?”

**After:**

- Turns this into a troubleshooting checklist
- Asks for reproducible details (bundle size, profiler, network, rendering)
- Produces an actionable plan with prioritized steps

### Scenario C — Legal (Summarize)

**Before:**

- “Summarize this contract and tell me if it’s okay.”

**After:**

- Adds “not legal advice” disclaimer (context-driven)
- Requests a summary + risk flags + missing info questions
- Encourages quoting clauses / giving section references

### Scenario D — Academic (Summarize)

**Before:**

- “Explain the CAP theorem.”

**After:**

- Specifies audience level, length limit, examples, and tradeoffs
- Produces a tighter and more testable output format

### Scenario E — Extract (Business / Ops)

**Before:**

- “Extract key info from: Jane Doe worked at ExampleCorp as Staff Engineer.”

**After:**

- Requests a JSON schema with fields like `name`, `company`, `role`, `dates?`,
  `confidence`
- Makes downstream automation reliable

## 6) Best Practices & Tips

### When to use which context

- **medical**: health questions, symptoms, medication, lab interpretations (adds
  safety boundaries).
- **legal**: contracts, compliance, regulations (adds “not legal advice”, asks
  for jurisdiction).
- **code**: debugging, architecture, refactors (adds reproducibility + stepwise
  diagnosis).
- **academic**: explanations, theory, research summaries (adds definitions,
  assumptions, citations norms).
- If unsure: start with **auto (detect)** and override only when you want a
  specific tone/constraint set.

### Prompts that benefit most from enhancement

- Ambiguous prompts (“tell me about…”) with no success criteria
- Multi-part asks (lists of requirements, “also include…”, “and compare…”)
- Prompts that must be machine-consumable (JSON extraction, strict schema)

### Common pitfalls

- **Over-constraining**: too many requirements can reduce answer quality; prefer
  3–7 constraints.
- **Missing inputs**: if the answer depends on unknowns (jurisdiction, dosage,
  dataset), encourage ask-backs.
- **Assuming citations exist**: teach the model to say “unknown” instead of
  hallucinating.

## Appendix: Handy endpoints

- `GET /health` → `"ok"`
- `GET /v1/contexts` → list of contexts loaded from `contexts.md`
- `POST /v1/generate` → run full pipeline and get `output` + `meta`
