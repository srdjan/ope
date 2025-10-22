# OPE MVP — Online Prompt Enhancer (Model-Agnostic, Deno)

An end-to-end minimal implementation of the **Online Prompt Enhancer**:
analyze → synthesize Prompt IR → compile → **route to local/cloud model** → generate → validate JSON.

- Runtime: **Deno**
- Style: **Light Functional TypeScript** (no classes)
- Client: **Deno task** (`scripts/call.ts`)
- Models supported:
  - `local/echo` (no deps; deterministic)
  - `local/http` (POST to `LLM_BASE_URL` expecting `{ text: string }`)
  - `cloud/openai-style` (POST to OpenAI-compatible `/v1/chat/completions`)

## Quickstart

```bash
deno task dev   # starts server on :8787
deno task gen:local  # calls /v1/generate with a local demo body
```

### Optional: Local HTTP LLM
Set an endpoint which accepts `POST { prompt: string }` and returns `{ text: string }`:

```bash
export LLM_BASE_URL=http://127.0.0.1:11434/generate
deno task gen:local
```

### Optional: Cloud (OpenAI-compatible)
Provide an API base and key:

```bash
export CLOUD_BASE_URL=https://api.openai.com
export CLOUD_API_KEY=sk-...
deno task gen:cloud
```

## API

`POST /v1/generate`

Request:
```json
{ "rawPrompt": "Explain Raft", "taskType": "summarize", "targetHint": "local" }
```

Response:
```json
{
  "output": { "answer": "string", "citations": ["..."] },
  "meta": {
    "model": "local/echo | local/http | cloud/openai-style",
    "ir": { "...": "Prompt IR" },
    "compiled": { "system": "...", "user": "..." },
    "decoding": { "temperature": 0.2, "maxTokens": 600 }
  }
}
```

## Structure

```
src/
  server.ts
  routes/generate.ts
  engine/
    analyze.ts
    synthesize.ts
    compile.ts
    route.ts
    validate.ts
  adapters/
    types.ts
    localEcho.ts
    localHttp.ts
    openaiStyle.ts
  types.ts
  config.ts
scripts/
  call.ts
test/
  smoke.test.ts
```

## License
MIT
