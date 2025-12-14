# Demo Prompts for OPE Mock Mode

When running OPE with `MOCK_AI=true` (default), the system uses pre-configured
responses for demo purposes. Use these prompts to showcase realistic API
responses.

## Demo Prompts

### Code Domain

**TypeScript**

```
What is TypeScript?
```

- Domain: code
- Citation: typescriptlang.org

---

**REST API**

```
What is a REST API?
```

- Domain: code
- Citation: MDN

---

**Python Debugging**

```
Why is my Python function returning None?
```

- Domain: code
- Citation: docs.python.org

---

### Technical Domain

**Raft Consensus**

```
Explain the Raft consensus algorithm
```

- Domain: technical
- Citation: raft.github.io

---

**Docker**

```
What is Docker?
```

- Domain: technical
- Citation: docker.com

---

**CAP Theorem**

```
Explain the CAP theorem
```

- Domain: technical
- No citations

---

### Educational Domain

**Machine Learning**

```
What is machine learning?
```

- Domain: educational
- No citations

---

### Academic Domain

**Photosynthesis**

```
Explain photosynthesis
```

- Domain: academic
- Citations: Wikipedia, Nature

---

### Business Domain

**Team Productivity**

```
How to improve team productivity?
```

- Domain: business
- No citations

---

### Creative Domain

**Haiku**

```
Write a haiku about programming
```

- Domain: creative
- No citations

---

## Quick Test Commands

```bash
# Start server (mock mode is default)
deno task dev

# Test demo prompts
deno task call '{"rawPrompt":"What is TypeScript?"}'
deno task call '{"rawPrompt":"Explain the Raft consensus algorithm"}'
deno task call '{"rawPrompt":"What is a REST API?"}'
deno task call '{"rawPrompt":"What is Docker?"}'
deno task call '{"rawPrompt":"What is machine learning?"}'
deno task call '{"rawPrompt":"Explain photosynthesis"}'
deno task call '{"rawPrompt":"How to improve team productivity?"}'
deno task call '{"rawPrompt":"Why is my Python function returning None?"}'
deno task call '{"rawPrompt":"Explain the CAP theorem"}'
deno task call '{"rawPrompt":"Write a haiku about programming"}'
```

## Expected Response Format

All demo prompts return:

- `meta.validation.wasRepaired: false` (valid JSON)
- `meta.model: "local/mock"`
- `meta.prompt`: The actual user prompt
- `meta.signature`: The DSPy compiled format
- Realistic answers (100-200 words)
- Citations where appropriate

## Fallback Response

For prompts that don't match any keyword, the system returns a helpful fallback
message explaining the demo mode and suggesting available topics.

## Adding New Demo Prompts

Edit [src/adapters/mockData.ts](../src/adapters/mockData.ts) to add new entries:

```typescript
{
  keywords: ["your-keyword"],
  domain: "code", // or technical, educational, academic, business, creative
  response: {
    answer: "Your 100-200 word answer...",
    citations: ["https://example.com/source"],
  },
}
```
