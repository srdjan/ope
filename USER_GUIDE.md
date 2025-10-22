# OPE User Guide

Welcome! This guide walks you through running and using the Online Prompt Enhancer (OPE) without needing to know the internal code. OPE runs a prompt optimization pipeline — **analyze → synthesize → compile → route → generate → validate** — so every request returns a structured, validated answer.

---

## 1. Introduction

OPE is a Deno-based API that takes a raw user prompt, builds a richer instruction set, routes the request to the best available language model, and verifies the result. You send a prompt, and OPE gives you a JSON response with the answer plus validation metadata. The pipeline stages:

- **Analyze**: inspect the request (task type, word limits, citation needs).
- **Synthesize**: build an intermediate representation (IR) with role, objective, constraints, style.
- **Compile**: turn the IR into final system + user prompts and decoding settings.
- **Route**: choose the right adapter (local echo/http or cloud) using configured capabilities.
- **Generate**: call the adapter to get model text.
- **Validate**: enforce the JSON schema and repair common issues (with full transparency).

---

## 2. Quick Start

### Prerequisites

- Deno **2.x** runtime (`deno --version` should show 2.x).
- Git (optional but recommended for cloning).

### Steps

1. **Clone the project**
   ```bash
   git clone https://github.com/<your-org>/ope.git
   cd ope
   ```

2. **Start the development server (defaults to port 8787)**
   ```bash
   deno task dev
   ```
   Keep this terminal running. The server listens on `http://127.0.0.1:8787`.

3. **Make your first API call**
   - Open a second terminal.
   - Use the provided `call` script (works with the default echo adapter):
     ```bash
     deno task call '{"rawPrompt":"What is OPE?","taskType":"qa"}'
     ```
   - Expect a JSON response similar to:
     ```json
     {
       "output": {
         "answer": "ECHO-MODE:\nSYSTEM => ROLE: precise expert ...",
         "citations": []
       },
       "meta": {
         "model": "local/echo",
         "validation": {
           "wasRepaired": false,
           "errorKind": null,
           "errorDetail": null
         }
       }
     }
     ```
   - Alternatively, call the REST endpoint directly:
     ```bash
     curl -X POST http://127.0.0.1:8787/v1/generate \
       -H "content-type: application/json" \
       -d '{"rawPrompt":"Summarize OPE in one sentence."}'
     ```

---

## 3. Configuration

OPE reads configuration from environment variables. You can export them in your shell or place them in a `.env` file and load it (e.g., using `direnv` or manually exporting before running tasks).

### Environment Variables Overview

| Variable        | Required?                 | Default           | Purpose |
|-----------------|---------------------------|-------------------|---------|
| `PORT`          | Optional                  | `8787`            | HTTP port for the API server. |
| `LLM_BASE_URL`  | Optional (local HTTP)     | *(empty)*         | URL for a local HTTP language model endpoint that accepts `POST { prompt, max_tokens, temperature }`. |
| `CLOUD_BASE_URL`| Optional (cloud)          | *(empty)*         | Base URL for an OpenAI-compatible API. |
| `CLOUD_API_KEY` | Optional (cloud)          | *(empty)*         | API key used for `Authorization: Bearer`. |
| `CLOUD_MODEL`   | Optional (cloud)          | `gpt-4o-mini`     | Model name passed to the cloud API. |
| `OPE_HOST`      | Optional (clients/tests)  | `http://127.0.0.1:8787` | Override target host for client scripts and remote tests. (`test:remote` defaults to `https://ope.timok.deno.net`.) |
| `OPE_API_KEY`   | Optional (remote testing) | *(empty)*         | Used only by remote smoke tests that hit protected deployments. |

### Local Development (default echo adapter)

No extra env vars required. The router falls back to the echo adapter when no local or cloud model is configured.

### Local HTTP Model

```bash
export PORT=8787
export LLM_BASE_URL=http://127.0.0.1:11434/generate
deno task dev
```

Run `deno task call ...` with `targetHint:"local"` to force the HTTP adapter:
```bash
deno task call '{"rawPrompt":"Health benefits of green tea?","taskType":"qa","targetHint":"local"}'
```

### Cloud Model (OpenAI-compatible)

```bash
export CLOUD_BASE_URL=https://api.openai.com
export CLOUD_API_KEY=sk-...
export CLOUD_MODEL=gpt-4o-mini
deno task dev
```

Calls without a `targetHint` automatically prefer the cloud adapter once both `CLOUD_BASE_URL` and `CLOUD_API_KEY` are present. To keep local echo as a fallback, leave the cloud vars unset.

### Mixing Local and Cloud

You can set both `LLM_BASE_URL` and the cloud variables. Routing rules:

- `targetHint:"local"` → local HTTP if available, else echo.
- `targetHint:"cloud"` (or unspecified with cloud enabled) → cloud adapter.
- No cloud and no local HTTP → echo adapter.

---

## 4. API Usage

### Endpoint

- `POST /v1/generate` — produce an optimized answer.
- `GET /health` — quick readiness probe (returns `"ok"`).

### Request Payload

```json
{
  "rawPrompt": "string (required)",
  "taskType": "qa | extract | summarize (optional)",
  "targetHint": "local | cloud (optional)"
}
```

- `rawPrompt`: the plain instruction or question.
- `taskType`: influences analysis constraints (citations, word budget).
- `targetHint`: nudges routing toward a local or cloud adapter when both exist.

### Response Structure

```json
{
  "output": {
    "answer": "Final answer text",
    "citations": ["https://..."]
  },
  "meta": {
    "model": "local/http",
    "ir": { "...": "..." },
    "compiled": {
      "system": "ROLE: precise expert\nOBJECTIVE: ...",
      "user": "TASK:\n..."
    },
    "decoding": { "temperature": 0.2, "maxTokens": 600 },
    "validation": {
      "wasRepaired": false,
      "errorKind": null,
      "errorDetail": null
    }
  }
}
```

- `output.answer`: always a string (repaired if needed).
- `output.citations`: array of source strings; can be `[]` or `["unknown"]`.
- `meta.validation`: shows whether the validator had to repair the model output.

### Real-World Examples

**Q&A (default routing)**

```bash
curl -X POST http://127.0.0.1:8787/v1/generate \
  -H "content-type: application/json" \
  -d '{
    "rawPrompt": "Who wrote Dune and when was it published?",
    "taskType": "qa"
  }'
```

Expected response excerpt:

```json
{
  "output": {
    "answer": "Frank Herbert wrote Dune, first published in 1965...",
    "citations": ["FrankHerbert.com", "Encyclopedia of Science Fiction"]
  },
  "meta": { "model": "cloud/openai-style", "validation": { "wasRepaired": false, ... } }
}
```

**Extraction (local HTTP adapter)**

```bash
deno task call '{
  "rawPrompt":"Pull out the company and title from: Jane Doe joined ExampleCorp as Staff Engineer in 2023.",
  "taskType":"extract",
  "targetHint":"local"
}'
```

Possible response:

```json
{
  "output": {
    "answer": "ExampleCorp; Staff Engineer",
    "citations": []
  },
  "meta": {
    "model": "local/http",
    "validation": { "wasRepaired": false, "errorKind": null, "errorDetail": null }
  }
}
```

**Summarization (cloud adapter with validation repair)**

```bash
curl -X POST http://127.0.0.1:8787/v1/generate \
  -H "content-type: application/json" \
  -d '{
    "rawPrompt": "Summarize the key points from this release note: ...",
    "taskType": "summarize",
    "targetHint": "cloud"
  }'
```

If the cloud model returns plain text, the validator wraps it:

```json
{
  "output": {
    "answer": "• Feature A improves latency...\n• Feature B adds audit logs...",
    "citations": []
  },
  "meta": {
    "model": "cloud/openai-style",
    "validation": {
      "wasRepaired": true,
      "errorKind": "INVALID_JSON",
      "errorDetail": "Invalid JSON - wrapped raw text as answer"
    }
  }
}
```

---

## 5. Testing the API

- **Smoke test with local echo**  
  ```bash
  deno task gen:local
  ```
  Sends a summarize request with `targetHint:"local"`; no extra setup needed.

- **Smoke test with cloud adapter**  
  ```bash
  export CLOUD_BASE_URL=...
  export CLOUD_API_KEY=...
  deno task gen:cloud
  ```
  Make sure the API key has access to the `CLOUD_MODEL`.

- **Custom request via script**  
  ```bash
  deno task call '{"rawPrompt":"List three key facts about the HTTP protocol.","taskType":"qa"}'
  ```
  Pass any JSON payload as the first argument.

- **Full test suite**  
  ```bash
  deno test -A
  ```
  Runs unit and integration tests locally.

- **Remote smoke test (optional)**  
  ```bash
  export OPE_HOST=https://your-deployment.example.com
  export OPE_API_KEY=...
  deno task test:remote
  ```
  Useful after deploying a protected instance.

---

## 6. Troubleshooting

- **Port already in use**  
  Set `PORT` to a free port before starting the server (e.g., `export PORT=9000`).

- **`rawPrompt is required` (HTTP 400)**  
  Confirm your request body includes a non-empty `rawPrompt` string.

- **`CONFIG_MISSING` errors from adapters**  
  - Local HTTP requires `LLM_BASE_URL`.  
  - Cloud adapter requires both `CLOUD_BASE_URL` and `CLOUD_API_KEY`.  
  Double-check the variables are exported in the same terminal running `deno task dev`.

- **`NETWORK_ERROR` with status 401/403**  
  Your cloud credentials are missing or invalid. Regenerate the API key or verify scopes.

- **Validator keeps repairing responses**  
  The upstream model may not be returning JSON. Adjust the model/system prompt in your chosen adapter, or ensure the model supports JSON mode.

- **`fetch` failures when using `deno task call`**  
  If the server runs on a remote host, set `OPE_HOST` to that URL. For self-signed certificates, consider tunneling over `ssh -L` or using a trusted certificate.

Need more help? Check `README.md` for architecture details or explore `REMOTE_TESTING.md` for deployment scenarios.
