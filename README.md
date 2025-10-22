# OPE — Online Prompt Enhancer (Model-Agnostic, Deno)

An end-to-end minimal implementation of the **Online Prompt Enhancer**: analyze
→ synthesize Prompt IR → compile → **route to local/cloud model** → generate →
validate JSON.

- Runtime: **Deno 2.x**
- Style: **Light Functional TypeScript** (no classes, Result types, immutable
  data)
- Type Safety: **Branded types** for domain primitives
- Error Handling: **Result<T,E>** pattern (no exceptions in core)
- Architecture: **Ports & Adapters** pattern
- Client: **Deno task** (`scripts/call.ts`)
- Models supported:
  - `local/echo` (no deps; deterministic)
  - `local/http` (POST to `LLM_BASE_URL` expecting `{ text: string }`)
  - `cloud/openai-style` (POST to OpenAI-compatible `/v1/chat/completions`)

## ✨ Key Features

- **Type-Safe Pipeline**: Branded types prevent mixing up temperatures, tokens,
  and prompts
- **Validation Tracking**: Every response includes detailed validation metrics
- **Result Types**: All adapters return `Result<T, E>` instead of throwing
  exceptions
- **Testable Config**: Port pattern enables dependency injection for testing
- **Immutable Data**: All types use `readonly` for safety

## Quickstart

```bash
# Start the development server
deno task dev   # starts server on :8787 (default)

# Test with local echo adapter (no external dependencies)
deno task gen:local

# Run tests
deno test -A

# Lint and format
deno lint
deno fmt
```

## Configuration

### Environment Variables

```bash
# Server
PORT=8787                                    # Server port (default: 8787)

# Local HTTP LLM (optional)
LLM_BASE_URL=http://127.0.0.1:11434/generate # Local model endpoint

# Cloud API (optional - OpenAI compatible)
CLOUD_BASE_URL=https://api.openai.com        # API base URL
CLOUD_API_KEY=sk-...                         # API key
CLOUD_MODEL=gpt-4o-mini                      # Model name (default: gpt-4o-mini)
```

### Testing Different Adapters

```bash
# Test with local HTTP model
export LLM_BASE_URL=http://localhost:11434/generate
deno task gen:local

# Test with cloud API (OpenAI-compatible)
export CLOUD_BASE_URL=https://api.openai.com
export CLOUD_API_KEY=sk-...
deno task gen:cloud
```

## API

### `POST /v1/generate`

Generate an optimized response using the prompt enhancement pipeline.

**Request**:

```json
{
  "rawPrompt": "Explain Raft consensus in ~150 words",
  "taskType": "summarize", // Optional: "qa" | "extract" | "summarize"
  "targetHint": "local" // Optional: "local" | "cloud"
}
```

**Response**:

```json
{
  "output": {
    "answer": "Generated response text...",
    "citations": ["https://example.com/source"]
  },
  "meta": {
    "model": "local/echo",
    "ir": {
      "role": "precise expert",
      "objective": "Answer the user's request accurately and concisely.",
      "constraints": ["json-only", "cite-or-say-unknown", "120-160-words"],
      "style": ["succinct", "use table only if clearly useful"],
      "steps": ["analyze", "answer"],
      "outputSchema": { "answer": "string", "citations": "string[]" },
      "examples": []
    },
    "compiled": {
      "system": "ROLE: precise expert\nOBJECTIVE: ...",
      "user": "TASK:\n..."
    },
    "decoding": {
      "temperature": 0.2,
      "maxTokens": 600
    },
    "validation": {
      "wasRepaired": false,
      "errorKind": null,
      "errorDetail": null
    }
  }
}
```

**Validation Tracking**:

The `validation` field in `meta` provides transparency about response
processing:

- `wasRepaired: false` - Response was valid JSON with correct schema
- `wasRepaired: true` - Response was repaired (check `errorKind` and
  `errorDetail`)
  - `errorKind: "INVALID_JSON"` - Response wasn't valid JSON (wrapped as answer)
  - `errorKind: "MISSING_FIELDS"` - JSON missing required fields (filled
    defaults)
  - `errorKind: "INVALID_TYPES"` - Type coercion needed (e.g., non-string
    citation)

### `GET /health`

Health check endpoint.

**Response**: `200 OK` with body `"ok"`

## Architecture

### Pipeline Flow

```
GenerateRequest → analyze → synthesize → compile → route → adapter → validate → FinalResponse
```

1. **analyze** - Examines request to determine JSON needs, citations, word
   limits
2. **synthesize** - Creates Prompt IR with role, objective, constraints, style,
   steps
3. **compile** - Converts IR into system/user prompts with decoding parameters
4. **route** - Selects adapter (echo/http/cloud) based on targetHint and config
5. **adapter** - Calls the model and returns `Result<Text, AdapterError>`
6. **validate** - Validates/repairs response, tracks any issues

### Project Structure

```
src/
  server.ts              # HTTP server entry point
  routes/
    generate.ts          # Main pipeline orchestration
  engine/                # Pure transformation functions
    analyze.ts           # Request analysis
    synthesize.ts        # IR synthesis
    compile.ts           # IR → prompts compilation
    route.ts             # Adapter selection (pure function)
    validate.ts          # Output validation with repair tracking
  adapters/              # Model integrations (return Result types)
    types.ts             # Adapter interface + error types
    localEcho.ts         # Echo adapter (testing)
    localHttp.ts         # Generic HTTP LLM adapter
    openaiStyle.ts       # OpenAI-compatible adapter
  lib/
    result.ts            # Result<T, E> type utilities
    branded.ts           # Branded types for domain primitives
  ports/
    config.ts            # ConfigPort interface + adapters
  types.ts               # Core domain types
  config.ts              # Config singleton (uses port pattern)
scripts/
  call.ts                # CLI client for testing
test/
  smoke.test.ts          # Integration tests
```

### Light FP Principles

This codebase follows **Light Functional Programming** patterns:

- **No classes or inheritance** - Only pure functions and type aliases
- **Result types instead of exceptions** - `Result<T, E>` for error handling
- **Immutable data** - All types use `readonly` modifiers
- **Branded types** - Domain primitives prevent type confusion
- **Port pattern** - Interfaces for capabilities (ConfigPort, Adapter)
- **Pure functions** - Engine layer has no side effects
- **Dependency injection** - Config and capabilities passed as parameters

## Development

### Running Tests

```bash
# Run all tests
deno test -A

# Run with coverage
deno task coverage  # (if configured)

# Lint code
deno lint

# Format code
deno fmt
```

### Adding a New Adapter

1. Create `src/adapters/newAdapter.ts` implementing `Adapter` interface
2. Add config check in `src/config.ts` (e.g., `hasNewAdapter()`)
3. Update routing logic in `src/engine/route.ts`
4. Return new model identifier (e.g., `makeModelId("local/new-adapter")`)

### Testing Configuration

The config port pattern enables testing without environment variables:

```typescript
import { makeTestConfig } from "./src/ports/config.ts";

const testConfig = makeTestConfig({
  cloudBaseUrl: "https://test.api.com",
  cloudApiKey: "test-key",
});

// Use testConfig in tests
```

## Monitoring

Track validation metrics to identify issues:

```bash
# Monitor repair rate
curl http://localhost:8787/v1/generate -X POST -H "Content-Type: application/json" \
  -d '{"rawPrompt":"test"}' | jq '.meta.validation.wasRepaired'

# Check for specific error types
jq '.meta.validation.errorKind'
```

High repair rates indicate:

- Model not following JSON schema
- Prompt engineering needs improvement
- Output validation too strict

## Recent Improvements

See [IMPROVEMENTS.md](IMPROVEMENTS.md) for detailed changelog of recent
enhancements:

- ✅ Branded types for type safety
- ✅ Enhanced validation with repair tracking
- ✅ Config port pattern for testability
- ✅ Result types throughout adapters
- ✅ Immutable data structures

## License

MIT
