# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

**OPE (Online Prompt Enhancer)** is a Deno-based prompt optimization system
that implements a complete pipeline: analyze → synthesize → compile → route →
generate → validate. The system is model-agnostic, supporting local echo/HTTP
models and cloud OpenAI-compatible APIs.

**Tech Stack**: Deno 2.x, Light Functional TypeScript (no classes), Web
Platform APIs, Branded Types, Result<T,E> pattern, Ports & Adapters

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
deno task test:remote # Run remote smoke tests against deployed instance
```

## Environment Variables

```bash
# Server configuration
PORT=8787                                    # Server port (default: 8787)
MOCK_AI=true                                 # Mock AI calls using localEcho (default: true)

# Local HTTP LLM (optional, ignored when MOCK_AI=true)
LLM_BASE_URL=http://127.0.0.1:11434/generate # Endpoint expecting {prompt, max_tokens, temperature}

# Cloud API (optional, ignored when MOCK_AI=true)
CLOUD_BASE_URL=https://api.openai.com        # OpenAI-compatible base URL
CLOUD_API_KEY=sk-...                         # API key
CLOUD_MODEL=gpt5-mini                        # Model name (default: gpt5-mini)

# Client configuration
OPE_HOST=http://127.0.0.1:8787              # Override target host in scripts/call.ts
```

**Mock Mode**: By default, `MOCK_AI=true` forces all adapter calls to use
`localEcho`, which returns a formatted echo of the prompts without calling any
external AI service. Set `MOCK_AI=false` to enable real AI model calls.

All `deno task …` commands use `--env-file=.env`, so populate the root `.env`
once and restart the relevant task to apply changes.

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
  metadata (model, IR, compiled, decoding, validation)

### Branded Types

OPE uses branded types ([src/lib/branded.ts](src/lib/branded.ts)) to prevent
mixing incompatible primitive values at compile time:

- `ModelId` - Model identifier ("local/echo" | "local/http" |
  "cloud/openai-style")
- `PromptText` - User's input (validated non-empty)
- `SystemPrompt` / `UserPrompt` - Compiled prompt messages
- `Temperature` - number 0-2 (validated range)
- `MaxTokens` - number > 0 (validated positive)
- `CitationUrl` - string (validated as URL or "unknown")

Smart constructors validate on creation and prevent invalid values at runtime:

```typescript
makeTemperature(1.5); // OK: returns Temperature
makeTemperature(3.0); // Throws: range validation error
```

### Result Type Pattern

All adapters return `Result<T, E>` instead of throwing exceptions:

```typescript
type Result<T, E> = Ok<T> | Err<E>;

// Adapter result
Result<GenerateResult, AdapterError> =
  | { ok: true; value: { text: string } }
  | { ok: false; error: { kind, detail } };
```

Benefits:

- Errors are **values**, not exceptions
- **Explicit error handling** in pipelines
- Stack traces not required in normal error flows
- Testable error paths without try/catch

### Ports & Adapters Pattern

**ConfigPort** ([src/ports/config.ts](src/ports/config.ts)) enables testable
configuration:

```typescript
interface ConfigPort {
  port: number;
  cloudBaseUrl: string;
  hasCloud(): boolean;
  hasLocalHttp(): boolean;
}
```

Implementations:

- `makeEnvConfig()` - reads from environment variables
- `makeTestConfig()` - for testing with dependency injection

This enables **testable, swappable configuration** without modifying business
logic.

### Context System (Pluggable Instructions)

OPE supports **pluggable context instructions** that customize LLM behavior for
specific domains (medical, legal, code, academic, etc.) while keeping core
logic pure.

**Context Definition** ([contexts.md](contexts.md)):

Contexts are defined in a markdown file with YAML-like structure:

```yaml
id: medical
name: Medical Domain
description: For medical and health-related queries
instruction:
  roleSuffix: in medical and health sciences
  additionalConstraints:
    - include medical disclaimer
    - cite peer-reviewed medical sources
  systemSuffix: |
    IMPORTANT: Always include disclaimer about consulting healthcare professionals
  temperatureOverride: 0.2
  maxTokensOverride: 800
```

**Context Port** ([src/ports/context.ts](src/ports/context.ts)):

- `ContextPort` interface for dependency injection
- `makeContextPort()` creates port from parsed contexts
- `validateContextInstruction()` validates instruction parameters
- Loaded once at startup via `getContextPort()` singleton

**Integration**:

1. **Request** - Add optional `context` field to `GenerateRequest`
2. **Synthesis** - `synthesize()` accepts `ContextInstruction` parameter
3. **Compilation** - `compileIR()` applies context overrides
4. **Routing** - Unknown contexts return 400 error with available list

**Context Precedence**: Context instructions **override** taskType-based
defaults.

**Available Contexts** (see [contexts.md](contexts.md)):

- `medical` - Medical/health queries with disclaimers
- `legal` - Legal questions with jurisdiction awareness
- `code` - Programming with lower temperature (0.1), code examples
- `academic` - Scholarly rigor with citations
- `business` - Business frameworks and practical advice
- `educational` - Clear explanations with examples
- `creative` - Higher temperature (0.8) for creative writing
- `technical` - Technical documentation best practices

## API

**Single Endpoint**: `POST /v1/generate`

Request body:

```json
{
  "rawPrompt": "Explain Raft consensus",
  "taskType": "summarize",
  "targetHint": "local",
  "context": "academic"
}
```

Fields:

- `rawPrompt` (required): The user's input prompt
- `taskType` (optional): "qa" | "extract" | "summarize"
- `targetHint` (optional): "local" | "cloud"
- `context` (optional): Context ID (e.g., "medical", "legal", "code")

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
    "decoding": { "temperature": 0.2, "maxTokens": 600 },
    "validation": {
      "wasRepaired": false,
      "errorKind": null,
      "errorDetail": null
    }
  }
}
```

**Validation Tracking**: The `validation` field provides transparency about
response processing:

- `wasRepaired: false` - Response was valid JSON with correct schema
- `wasRepaired: true` - Response was repaired (check `errorKind` and
  `errorDetail`)
  - `errorKind: "INVALID_JSON"` - Response wasn't valid JSON (wrapped as
    answer)
  - `errorKind: "MISSING_FIELDS"` - JSON missing required fields (filled
    defaults)
  - `errorKind: "INVALID_TYPES"` - Type coercion needed

High repair rates indicate prompt engineering issues or models not following
JSON schema.

### Additional Endpoints

- **Health check**: `GET /health` → returns "ok"
- **Graceful shutdown**: `POST /shutdown` → shuts down server gracefully after responding

**Shutdown endpoint usage:**
```bash
curl -X POST http://localhost:8787/shutdown
```

The shutdown endpoint:
- Responds immediately with `{"message": "Server shutting down gracefully"}`
- Schedules graceful server shutdown using `queueMicrotask()`
- Ensures response is sent before shutdown begins
- Useful for development and CI/CD pipelines

## Code Style Conventions

This codebase follows **Light Functional TypeScript** principles:

- **No classes or inheritance** - Use pure functions and type aliases
- **Immutable data** - All transformations return new objects
- **Explicit types** - Strong typing throughout (branded types for primitives)
- **Simple composition** - Pipeline stages compose cleanly via function calls
- **Minimal dependencies** - Deno standard library + Web Platform APIs only
- **Error handling** - Result types in core; throws only at edges
- **Pure functions** - No side effects in engine/; effects only in
  adapters/server

### Module Organization

```
src/
  server.ts          # HTTP server with routing and logging
  routes/            # Request handlers (generate.ts - pipeline orchestration)
  engine/            # Pure transformation functions (analyze, synthesize, compile, route, validate)
  adapters/          # Model integrations (localEcho, localHttp, openaiStyle)
  lib/               # Utilities (result.ts, branded.ts, logger.ts)
  ports/             # Dependency injection interfaces (config.ts)
  types.ts           # Core type definitions
  config.ts          # Environment variable facade
scripts/
  call.ts            # CLI client for testing API
test/
  smoke.test.ts      # Local integration tests
  remote.smoke.test.ts # Remote deployment smoke tests
```

**Key principles**:

- **engine/** contains pure logic with no I/O
- **adapters/** handle external model calls (return Result types)
- **routes/** orchestrate the pipeline
- **lib/** provides reusable utilities (Result, branded types, logging)
- **ports/** define interfaces for dependency injection
- Types defined once in [types.ts](src/types.ts), imported everywhere

## Testing Strategy

### Local Tests

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

### Remote Tests

Test deployed instances with comprehensive smoke tests
([test/remote.smoke.test.ts](test/remote.smoke.test.ts)):

```bash
# Test default deployed instance
deno task test:remote

# Test custom deployment
OPE_HOST=https://your-instance.com deno task test:remote
```

**Coverage**:

- Health check endpoint validation
- Request/response structure for all task types (qa, extract, summarize)
- Target hint routing (local/cloud)
- IR synthesis and compilation validation
- Error handling (empty prompts, invalid JSON)
- Performance checks (response time < 30s)
- Concurrent request handling

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

The placeholder assignment in [src/routes/generate.ts:61](src/routes/generate.ts#L61)
(`ir2 = ir`) is reserved for future Ax/DSPy optimization.

## Logging and Observability

OPE implements structured logging throughout the pipeline
([src/lib/logger.ts](src/lib/logger.ts)):

- **Request ID tracking** - UUID generated per request, propagated through
  pipeline
- **ISO 8601 timestamps** - All log entries timestamped
- **Log levels** - INFO, WARN, ERROR with contextual JSON data
- **Stage-by-stage logging** - Each pipeline stage logs start/completion with
  duration
- **Adapter logging** - Detailed HTTP call logging with timing

**Log format**:

```
[2025-10-23T12:11:16.594Z] INFO: Pipeline starting {"requestId":"abc-123"}
[2025-10-23T12:11:16.595Z] INFO: Completed analyze stage {"stage":"analyze","duration":1,"requestId":"abc-123"}
```

**Response headers**: Every response includes `x-request-id` header for
correlation.

See [LOGGING.md](LOGGING.md) for comprehensive logging documentation and
debugging tips.

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
6. **Branded type validation**: Smart constructors throw on invalid values at
   runtime
7. **Request ID correlation**: Always include request ID from `x-request-id`
   header in bug reports

## License

MIT
