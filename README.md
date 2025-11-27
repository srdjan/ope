# OPE — Online Prompt Enhancer (Model-Agnostic, Deno)

An end-to-end implementation of the **Online Prompt Enhancer**: **enhance** →
analyze → synthesize Prompt IR → compile → **route to local/cloud model** →
generate → validate JSON.

- Runtime: **Deno 2.x**
- Style: **Light Functional TypeScript** (no classes, Result types, immutable
  data)
- Type Safety: **Branded types** for domain primitives
- Error Handling: **Result<T,E>** pattern (no exceptions in core)
- Architecture: **Ports & Adapters** pattern
- Client: **Deno task** (`scripts/call.ts`)
- UI: **Static HTMX page** at `/` for interactive prompt enhancement
- Models supported:
  - `local/echo` (no deps; deterministic) — **default in mock mode**
  - `local/http` (POST to `LLM_BASE_URL` expecting `{ text: string }`)
  - `cloud/openai-style` (POST to OpenAI-compatible `/v1/chat/completions`)

## ✨ Key Features

- **Rule-Based Prompt Enhancement**: Auto-detects domain (medical, code, legal,
  academic, etc.), structures compound questions, improves clarity, and adds
  few-shot examples
- **Type-Safe Pipeline**: Branded types prevent mixing up temperatures, tokens,
  and prompts
- **Validation Tracking**: Every response includes detailed validation metrics
- **Result Types**: All adapters return `Result<T, E>` instead of throwing
  exceptions
- **Testable Config**: Port pattern enables dependency injection for testing
- **Mock Mode**: Default behavior uses local echo adapter for development (set
  `MOCK_AI=false` to use real models)
- **Immutable Data**: All types use `readonly` for safety
- **Built-in Web UI**: Minimal, responsive page with loading states and
  copy-to-clipboard for enhanced prompts

## Quickstart

Update `.env` with your local and cloud credentials (tasks automatically load it
via `--env-file=.env`), then run:

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

With the dev server running, open [http://127.0.0.1:8787/](http://127.0.0.1:8787/)
to access the browser UI or keep using the API endpoints directly.

## Configuration

All `deno task …` commands are configured to load environment variables from
`.env`. Update that file and restart the dev server to pick up changes.

### Environment Variables

```bash
# Server
PORT=8787                                    # Server port (default: 8787)
MOCK_AI=true                                 # Mock mode (default: true). Set to "false" to use real models

# Local HTTP LLM (optional, requires MOCK_AI=false)
LLM_BASE_URL=http://127.0.0.1:11434/generate # Local model endpoint

# Cloud API (optional - OpenAI compatible, requires MOCK_AI=false)
CLOUD_BASE_URL=https://api.openai.com        # API base URL
CLOUD_API_KEY=sk-...                         # API key
CLOUD_MODEL=gpt5-mini                        # Model name (default: gpt5-mini)
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
  "taskType": "summarize",   // Optional: "qa" | "extract" | "summarize"
  "targetHint": "local",     // Optional: "local" | "cloud"
  "context": "academic",     // Optional: context ID (medical, legal, code, etc.)
  "enhance": "rules"         // Optional: "rules" (default) | "none"
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
      "objective": "Answer about Raft consensus accurately and concisely.",
      "constraints": ["json-only", "cite-or-say-unknown", "120-160-words"],
      "style": ["succinct", "use table only if clearly useful"],
      "steps": ["analyze", "answer"],
      "outputSchema": { "answer": "string", "citations": "string[]" },
      "examples": [{ "user": "...", "assistant": "..." }]
    },
    "compiled": {
      "system": "ROLE: precise expert\nOBJECTIVE: ...\n\nEXAMPLES:\n...",
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
    },
    "enhancement": {
      "originalPrompt": "Explain Raft consensus in ~150 words",
      "enhancedPrompt": "Explain Raft consensus in ~150 words",
      "analysis": {
        "detectedDomain": "academic",
        "isCompoundQuestion": false,
        "ambiguityScore": 0.1,
        "suggestedExamples": []
      },
      "enhancementsApplied": ["domain_detected:academic"]
    }
  }
}
```

**Note**: The `enhancement` field only appears when enhancements were actually
applied.

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

### `POST /shutdown`

Graceful shutdown endpoint for development and CI/CD.

**Response**: `200 OK` with JSON body:
```json
{
  "message": "Server shutting down gracefully"
}
```

**Behavior**:
- Responds immediately before shutting down
- Uses `queueMicrotask()` to schedule shutdown after response is sent
- Performs graceful shutdown via `server.shutdown()` if available
- Falls back to `Deno.exit(0)` if shutdown method not available

**Example**:
```bash
curl -X POST http://localhost:8787/shutdown
```

## Web UI

The repository includes a static, server-rendered HTML page at
`ui/public/index.html` that the Deno server serves from `/`. It uses HTMX for
form submission while keeping the markup simple and cache-friendly.

- **Prompt Input**: enter the baseline prompt, then submit with the `Enhance Prompt`
  button.
- **Loading State**: the submit button locks and shows a spinner while awaiting
  the `/v1/generate` response.
- **Enhanced Output**: the read-only textarea renders `output.answer`. Errors
  from the API surface inline with helpful copy.
- **Copy to Clipboard**: a dedicated button copies the enhanced prompt and shows
  transient confirmation text.
- **Responsive Layout**: spacing and typography adjust cleanly for mobile and
  desktop breakpoints.

When running in production (via `DENO_DEPLOYMENT_ID`), the HTML is cached in
memory after the first read; locally it refreshes on each request, making UI
tweaks instantaneous.

## Architecture

### Pipeline Flow

```
GenerateRequest → enhance → analyze → synthesize → compile → route → adapter → validate → FinalResponse
```

1. **enhance** - Analyzes prompt for domain detection, compound questions,
   ambiguity; applies rule-based enhancements; suggests few-shot examples
2. **analyze** - Examines request to determine JSON needs, citations, word
   limits (adjusted by prompt complexity)
3. **synthesize** - Creates Prompt IR with role, objective, constraints, style,
   steps, and examples from enhancement
4. **compile** - Converts IR into system/user prompts with decoding parameters;
   includes examples for few-shot learning
5. **route** - Selects adapter (echo/http/cloud) based on targetHint and config
6. **adapter** - Calls the model and returns `Result<Text, AdapterError>`
7. **validate** - Validates/repairs response, tracks any issues

### Enhancement Features

The enhancement stage provides:

- **Domain Detection**: Auto-detects medical, legal, code, academic, business,
  educational, creative, or technical domains from keywords and patterns
- **Auto-Context**: Applies detected domain as context if none specified
- **Compound Question Structuring**: Breaks multi-part questions into numbered
  steps
- **Clarity Improvement**: Flags vague prompts with clarification notes
- **Few-Shot Examples**: Populates `PromptIR.examples` based on detected domain

## Development

### Running Tests

```bash
# Run all tests (local unit and integration tests)
deno test -A

# Run remote smoke tests against deployed instance
deno task test:remote

# Test specific remote host
OPE_HOST=https://your-ope-instance.com deno test --allow-net --allow-env test/remote.smoke.test.ts

# Lint code
deno lint

# Format code
deno fmt
```

### Remote Testing

The project includes comprehensive smoke tests for validating deployed OPE instances:

**Test Coverage** ([test/remote.smoke.test.ts](test/remote.smoke.test.ts)):
- Health check endpoint validation
- Basic generation request/response structure
- All task types (qa, extract, summarize)
- Target hint routing (local/cloud)
- IR synthesis and compilation validation
- Error handling (empty prompts, invalid JSON)
- Performance checks (response time < 30s)
- Concurrent request handling

**Quick Start**:
```bash
# Test the default deployed instance
deno task test:remote

# Test a custom deployment
OPE_HOST=https://your-instance.com deno task test:remote
```

**What Gets Tested**:
- ✅ Health endpoint returns "ok"
- ✅ /v1/generate accepts valid requests
- ✅ Response structure matches schema (output, meta)
- ✅ All task types (qa, extract, summarize) work correctly
- ✅ IR synthesis produces role, objective, constraints, style
- ✅ Compiled prompts contain system and user messages
- ✅ Decoding parameters are present (temperature, maxTokens)
- ✅ Citations structure is valid (array of strings)
- ✅ Error handling for invalid inputs
- ✅ Response times are reasonable
- ✅ Concurrent requests are handled properly

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

## Developers: Clody & Gipity

## License

MIT
