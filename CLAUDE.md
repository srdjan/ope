# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

**OPE MVP (Online Prompt Enhancer)** is a Deno-based prompt optimization system
that implements a complete pipeline: analyze → synthesize → compile → route →
generate → validate. The system is model-agnostic, supporting local echo/HTTP
models and cloud OpenAI-compatible APIs.

**Tech Stack**: Deno, Light Functional TypeScript (no classes), Web Platform
APIs

## Development Commands

```bash
# Development server (starts on port 8787 by default)
deno task dev

# Test API calls
deno task gen:local   # Test with local adapter
deno task gen:cloud   # Test with cloud adapter (requires env vars)
deno task call 'JSON' # Custom API call with JSON payload

# Testing
deno test -A          # Run all tests
```

## Environment Variables

```bash
# Server configuration
PORT=8787                                    # Server port (default: 8787)

# Local HTTP LLM (optional)
LLM_BASE_URL=http://127.0.0.1:11434/generate # Endpoint expecting {prompt, max_tokens, temperature}

# Cloud API (optional)
CLOUD_BASE_URL=https://api.openai.com        # OpenAI-compatible base URL
CLOUD_API_KEY=sk-...                         # API key
CLOUD_MODEL=gpt-4o-mini                      # Model name (default: gpt-4o-mini)

# Client configuration
OPE_HOST=http://127.0.0.1:8787              # Override target host in scripts/call.ts
```

## Architecture

### Core Pipeline Flow

The system implements a **functional pipeline** where each stage transforms data
immutably:

```
GenerateRequest → AnalysisReport → PromptIR → CompiledPrompt → RouteDecision → Generated Text → Validated Output
```

**Entry Point**: [src/routes/generate.ts](src/routes/generate.ts) orchestrates
the entire pipeline:

1. **analyze** ([src/engine/analyze.ts](src/engine/analyze.ts)) - Examines
   request to determine JSON needs, citations, word limits based on taskType
2. **synthesize** ([src/engine/synthesize.ts](src/engine/synthesize.ts)) -
   Creates intermediate representation (PromptIR) with role, objective,
   constraints, style, steps
3. **compileIR** ([src/engine/compile.ts](src/engine/compile.ts)) - Converts IR
   into system/user prompts with decoding parameters
4. **route** ([src/engine/route.ts](src/engine/route.ts)) - Selects appropriate
   model adapter based on targetHint and available configuration
5. **adapter** ([src/adapters/](src/adapters/)) - Calls the chosen model (echo,
   local HTTP, or OpenAI-style cloud)
6. **validateOrRepair** ([src/engine/validate.ts](src/engine/validate.ts)) -
   Ensures output conforms to `{answer, citations}` schema

### Adapter Pattern

Three model adapters implement the `Adapter` interface from
[src/adapters/types.ts](src/adapters/types.ts):

- **localEcho** - No-op echo adapter for testing (no external dependencies)
- **localHttp** - Generic HTTP POST to `LLM_BASE_URL` expecting `{text: string}`
  response
- **openaiStyle** - OpenAI-compatible `/v1/chat/completions` endpoint

**Routing logic** ([src/engine/route.ts](src/engine/route.ts)):

- `targetHint="local"` → tries localHttp → falls back to localEcho
- `targetHint="cloud"` → requires CLOUD_BASE_URL + CLOUD_API_KEY → tries
  openaiStyle
- No hint → prefers cloud if configured, then localHttp, finally localEcho

### Type System

Core types in [src/types.ts](src/types.ts):

- `GenerateRequest` - API input with rawPrompt, optional taskType
  ("qa"|"extract"|"summarize"), targetHint
- `PromptIR` - Intermediate representation capturing role, objective,
  constraints, style, steps, outputSchema, examples
- `CompiledPrompt` - System/user prompts plus decoding parameters (temperature,
  maxTokens)
- `FinalResponse` - API output with validated `{answer, citations}` plus
  metadata (model, IR, compiled, decoding)

## API

**Single Endpoint**: `POST /v1/generate`

Request body:

```json
{
  "rawPrompt": "Explain Raft consensus",
  "taskType": "summarize",
  "targetHint": "local"
}
```

Response:

```json
{
  "output": {
    "answer": "string content",
    "citations": ["url1", "url2"]
  },
  "meta": {
    "model": "local/echo | local/http | cloud/openai-style",
    "ir": { "role": "...", "objective": "...", ... },
    "compiled": { "system": "...", "user": "..." },
    "decoding": { "temperature": 0.2, "maxTokens": 600 }
  }
}
```

Health check: `GET /health` → returns "ok"

## Code Style Conventions

This codebase follows **Light Functional TypeScript** principles:

- **No classes or inheritance** - Use pure functions and type aliases
- **Immutable data** - All transformations return new objects
- **Explicit types** - Strong typing throughout (GenerateArgs, PromptIR, etc.)
- **Simple composition** - Pipeline stages compose cleanly via function calls
- **Minimal dependencies** - Deno standard library + Web Platform APIs only
- **Error handling** - Throws at adapter boundaries; validate/repair at edges

### Module Organization

```
src/
  server.ts          # HTTP server with routing logic
  routes/            # Request handlers (generate.ts)
  engine/            # Pure transformation functions (analyze, synthesize, compile, route, validate)
  adapters/          # Model integrations (localEcho, localHttp, openaiStyle)
  types.ts           # Core type definitions
  config.ts          # Environment variable accessors
scripts/
  call.ts            # CLI client for testing API
test/
  smoke.test.ts      # Basic integration tests
```

**Key principles**:

- **engine/** contains pure logic with no I/O
- **adapters/** handle external model calls
- **routes/** orchestrate the pipeline
- Types defined once in [types.ts](src/types.ts), imported everywhere

## Testing Strategy

Run tests with `deno test -A`

- **Integration tests** in [test/smoke.test.ts](test/smoke.test.ts) call
  `handleGenerate` directly
- Tests use localEcho adapter (no external dependencies required)
- Validate response structure and required fields

To test with real models:

```bash
# Local HTTP model
export LLM_BASE_URL=http://localhost:11434/generate
deno task gen:local

# Cloud API
export CLOUD_BASE_URL=https://api.openai.com
export CLOUD_API_KEY=sk-...
deno task gen:cloud
```

## Adding New Features

### Adding a New Adapter

1. Create `src/adapters/newAdapter.ts` implementing the `Adapter` type
2. Add configuration check in [src/config.ts](src/config.ts) (e.g.,
   `hasNewAdapter()`)
3. Update routing logic in [src/engine/route.ts](src/engine/route.ts)
4. Return new model identifier string (e.g., `"local/new-adapter"`)

### Modifying the Pipeline

Each pipeline stage is independent:

- **Analysis**: Adjust heuristics in
  [src/engine/analyze.ts](src/engine/analyze.ts) (word limits, JSON
  requirements)
- **IR synthesis**: Modify constraints/style in
  [src/engine/synthesize.ts](src/engine/synthesize.ts)
- **Compilation**: Change prompt templates in
  [src/engine/compile.ts](src/engine/compile.ts)
- **Validation**: Update schema in
  [src/engine/validate.ts](src/engine/validate.ts)

The placeholder comment in
[src/routes/generate.ts:16](src/routes/generate.ts#L16) (`ir2 = ir`) is reserved
for future Ax/DSPy optimization.

## Common Gotchas

1. **Port conflicts**: Default port 8787 may conflict with other services
2. **Missing env vars**: Cloud adapter throws if CLOUD_BASE_URL or CLOUD_API_KEY
   are unset
3. **Local HTTP response format**: localHttp adapter expects `{text: string}`
   but also handles `{choices: [{text}]}`
4. **JSON validation**: validateOrRepair wraps non-JSON responses as
   `{answer: text, citations: []}`
5. **Lint exclusion**: [deno.json](deno.json) excludes openaiStyle.ts from
   linting

## License

MIT
