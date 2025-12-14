# OPE User Guide

Welcome! This guide walks you through running and using the Online Prompt
Enhancer (OPE) without needing to know the internal code. OPE runs a prompt
optimization pipeline — **enhance → analyze → synthesize → compile → route →
generate → validate** — so every request returns a structured, validated answer
with intelligent prompt enhancement.

---

## 1. Introduction

OPE is a Deno-based API that takes a raw user prompt, **enhances it** using
rule-based analysis, builds a richer instruction set, routes the request to the
best available language model, and verifies the result. You send a prompt, and
OPE gives you a JSON response with the answer plus validation and enhancement
metadata. The pipeline stages:

- **Enhance**: analyze prompt for domain, compound questions, ambiguity; apply
  rule-based improvements; suggest few-shot examples.
- **Analyze**: inspect the request (task type, word limits, citation needs)
  adjusted by prompt complexity.
- **Synthesize**: build an intermediate representation (IR) with role,
  objective, constraints, style, and examples.
- **Compile**: turn the IR into final system + user prompts with examples for
  few-shot learning.
- **Route**: choose the right adapter (local echo/http or cloud) using
  configured capabilities.
- **Generate**: call the adapter to get model text.
- **Validate**: enforce the JSON schema and repair common issues (with full
  transparency).

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

3. **Open the browser UI**
   - Visit [http://127.0.0.1:8787/](http://127.0.0.1:8787/) in your browser.
   - Enter a baseline prompt and press **Enhance Prompt**. The button locks and
     shows a spinner while the request runs.
   - Review the enhanced prompt in the read-only textarea and use **Copy** to
     place it on your clipboard; transient status text confirms success.
   - Any API errors appear inline under the panels so you can retry quickly.

4. **Make your first API call**
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

OPE reads configuration from environment variables. You can export them in your
shell or place them in a `.env` file and load it (e.g., using `direnv` or
manually exporting before running tasks). All bundled `deno task …` commands
already include `--env-file=.env`, so editing the root `.env` and restarting
`deno task dev` is usually enough.

### Environment Variables Overview

| Variable         | Required?                 | Default                 | Purpose                                                                                                             |
| ---------------- | ------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `PORT`           | Optional                  | `8787`                  | HTTP port for the API server.                                                                                       |
| `MOCK_AI`        | Optional                  | `true`                  | Mock mode. Set to `"false"` to use real AI models.                                                                  |
| `LLM_BASE_URL`   | Optional (local HTTP)     | _(empty)_               | URL for a local HTTP language model endpoint (requires `MOCK_AI=false`).                                            |
| `CLOUD_BASE_URL` | Optional (cloud)          | _(empty)_               | Base URL for an OpenAI-compatible API (requires `MOCK_AI=false`).                                                   |
| `CLOUD_API_KEY`  | Optional (cloud)          | _(empty)_               | API key used for `Authorization: Bearer`.                                                                           |
| `CLOUD_MODEL`    | Optional (cloud)          | `gpt5-mini`             | Model name passed to the cloud API.                                                                                 |
| `OPE_HOST`       | Optional (clients/tests)  | `http://127.0.0.1:8787` | Override target host for client scripts and remote tests. (`test:remote` defaults to `https://ope.timok.deno.net`.) |
| `OPE_API_KEY`    | Optional (remote testing) | _(empty)_               | Used only by remote smoke tests that hit protected deployments.                                                     |

### Local Development (default echo adapter)

No extra env vars required. The router falls back to the echo adapter when no
local or cloud model is configured.

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
export CLOUD_MODEL=gpt5-mini
deno task dev
```

Calls without a `targetHint` automatically prefer the cloud adapter once both
`CLOUD_BASE_URL` and `CLOUD_API_KEY` are present. To keep local echo as a
fallback, leave the cloud vars unset.

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
  "targetHint": "local | cloud (optional)",
  "context": "medical | legal | code | academic | ... (optional)",
  "enhance": "rules | none (optional, default: rules)"
}
```

- `rawPrompt`: the plain instruction or question.
- `taskType`: influences analysis constraints (citations, word budget).
- `targetHint`: nudges routing toward a local or cloud adapter when both exist.
- `context`: applies domain-specific context (medical, legal, code, academic,
  business, educational, creative, technical). Auto-detected if not specified.
- `enhance`: controls prompt enhancement. `"rules"` (default) applies rule-based
  enhancements; `"none"` skips enhancement.

### Response Structure

```json
{
  "output": {
    "answer": "Final answer text",
    "citations": ["https://..."]
  },
  "meta": {
    "model": "local/http",
    "ir": { "role": "...", "objective": "...", "examples": [...] },
    "compiled": {
      "system": "ROLE: precise expert\nOBJECTIVE: ...\n\nEXAMPLES:\n...",
      "user": "TASK:\n..."
    },
    "decoding": { "temperature": 0.2, "maxTokens": 600 },
    "validation": {
      "wasRepaired": false,
      "errorKind": null,
      "errorDetail": null
    },
    "enhancement": {
      "originalPrompt": "...",
      "enhancedPrompt": "...",
      "analysis": {
        "detectedDomain": "code",
        "isCompoundQuestion": false,
        "ambiguityScore": 0.1,
        "suggestedExamples": [...]
      },
      "enhancementsApplied": ["domain_detected:code", "examples_suggested"]
    }
  }
}
```

- `output.answer`: always a string (repaired if needed).
- `output.citations`: array of source strings; can be `[]` or `["unknown"]`.
- `meta.validation`: shows whether the validator had to repair the model output.
- `meta.enhancement`: (only when enhancements applied) shows what was detected
  and improved.

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
    "validation": {
      "wasRepaired": false,
      "errorKind": null,
      "errorDetail": null
    }
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

- **Port already in use**\
  Set `PORT` to a free port before starting the server (e.g.,
  `export PORT=9000`).

- **`rawPrompt is required` (HTTP 400)**\
  Confirm your request body includes a non-empty `rawPrompt` string.

- **`CONFIG_MISSING` errors from adapters**
  - Local HTTP requires `LLM_BASE_URL`.
  - Cloud adapter requires both `CLOUD_BASE_URL` and `CLOUD_API_KEY`.\
    Double-check the variables are exported in the same terminal running
    `deno task dev`.

- **`NETWORK_ERROR` with status 401/403**\
  Your cloud credentials are missing or invalid. Regenerate the API key or
  verify scopes.

- **Validator keeps repairing responses**\
  The upstream model may not be returning JSON. Adjust the model/system prompt
  in your chosen adapter, or ensure the model supports JSON mode.

- **`fetch` failures when using `deno task call`**\
  If the server runs on a remote host, set `OPE_HOST` to that URL. For
  self-signed certificates, consider tunneling over `ssh -L` or using a trusted
  certificate.

Need more help? Check `README.md` for architecture details or explore
`REMOTE_TESTING.md` for deployment scenarios.

---

## 7. Prompt Enhancement

OPE automatically enhances your prompts using rule-based analysis. This happens
by default (can be disabled with `"enhance": "none"`).

### What Gets Enhanced

1. **Domain Detection**: OPE analyzes keywords and patterns to detect the
   domain:
   - `medical`: symptoms, diagnosis, treatment, medication
   - `code`: function, class, error, bug, API, programming languages
   - `legal`: law, court, contract, liability, statute
   - `academic`: research, study, hypothesis, methodology, citation
   - `business`: revenue, strategy, market, ROI
   - `educational`: explain, learn, teach, beginner
   - `creative`: write, story, poem, creative
   - `technical`: deploy, infrastructure, configuration, architecture

2. **Auto-Context**: When a domain is detected and no `context` is specified,
   OPE automatically applies the matching context (temperature, constraints,
   system suffix).

3. **Compound Question Structuring**: Multi-part questions are broken into
   numbered steps:
   ```
   Input:  "What is React and how does it work and what are hooks?"
   Output: "1. What is React
            2. how does it work
            3. what are hooks?"
   ```

4. **Clarity Improvement**: Very vague prompts get clarification notes:
   ```
   Input:  "Fix it"
   Output: "Fix it

            [Note: Please specify what "it/this/that" refers to for a targeted response]"
   ```

5. **Few-Shot Examples**: Domain-specific examples are added to the IR and
   compiled into the system prompt for better LLM performance.

### Enhancement Examples

**Code Domain Detection**:

```bash
deno task call '{"rawPrompt":"Why is my Python function returning None?"}'
```

Response includes `enhancement.analysis.detectedDomain: "code"` and appropriate
coding examples.

**Disabling Enhancement**:

```bash
deno task call '{"rawPrompt":"Hello world","enhance":"none"}'
```

Skips all enhancement processing.
