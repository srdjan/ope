# Remote OPE Testing Guide

This document explains how to test a remotely deployed OPE instance.

## Quick Start

```bash
# Test the default deployed instance (https://ope.timok.deno.net)
deno task test:remote
```

## Testing Custom Deployments

### Option 1: Using Environment Variable

```bash
# Set the remote host
export OPE_HOST=https://your-ope-instance.com

# Run the tests
deno task test:remote
```

### Option 2: Inline Environment Variable

```bash
# Test a specific deployment in one command
OPE_HOST=https://your-ope-instance.com deno task test:remote
```

### Option 3: Direct Test Execution

```bash
# Run the test file directly with custom host
OPE_HOST=https://staging.ope.example.com deno test --allow-net --allow-env test/remote.smoke.test.ts
```

## What Gets Tested

The remote smoke test suite validates:

### Core Functionality

- **Health Check**: `/health` endpoint returns "ok"
- **Basic Generation**: `/v1/generate` accepts requests and returns valid
  responses
- **Response Structure**: Output contains `answer` and `citations`
- **Metadata**: Response includes `model`, `ir`, `compiled`, and `decoding`
  metadata

### Task Types

- **QA**: Question-answering tasks produce substantial answers
- **Extract**: Information extraction from text
- **Summarize**: Summarization with word limit constraints

### Routing

- **Local Target**: `targetHint: "local"` routes to local adapters
- **Cloud Target**: `targetHint: "cloud"` routes to cloud adapters (if
  configured)

### IR (Intermediate Representation)

- **Synthesis**: Produces `role`, `objective`, `constraints`, `style`
- **Compilation**: Generates `system` and `user` prompts
- **Decoding**: Sets appropriate `temperature` and `maxTokens`

### Error Handling

- **Empty Prompts**: Handles empty or invalid prompts gracefully
- **Invalid JSON**: Handles malformed request bodies
- **Resource Management**: No memory leaks or hanging connections

### Performance

- **Response Time**: Requests complete within 30 seconds
- **Concurrency**: Handles multiple simultaneous requests

## Example Test Run

```bash
$ deno task test:remote

running 15 tests from ./test/remote.smoke.test.ts
Remote OPE - Health check ... ok (141ms)
Remote OPE - Basic generation request ... ok (135ms)
Remote OPE - QA task type ... ok (132ms)
Remote OPE - Extract task type ... ok (141ms)
Remote OPE - Summarize task type ... ok (144ms)
Remote OPE - Target hint: local ... ok (136ms)
Remote OPE - Complex prompt with multiple requirements ... ok (140ms)
Remote OPE - Short prompt handling ... ok (144ms)
Remote OPE - IR synthesis validation ... ok (136ms)
Remote OPE - Compiled prompt structure ... ok (132ms)
Remote OPE - Error handling: empty prompt ... ok (137ms)
Remote OPE - Error handling: invalid JSON ... ok (138ms)
Remote OPE - Response time check ... ok (137ms)
Remote OPE - Citations structure validation ... ok (139ms)
Remote OPE - Multiple concurrent requests ... ok (134ms)

ok | 15 passed | 0 failed (2s)
```

## Manual Testing with curl

You can also test the remote instance manually:

### Health Check

```bash
curl https://ope.timok.deno.net/health
# Expected: "ok"
```

### Generate Request

```bash
curl -X POST https://ope.timok.deno.net/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "rawPrompt": "What is the capital of France?",
    "taskType": "qa"
  }' | jq
```

### With Task Type and Target Hint

```bash
curl -X POST https://ope.timok.deno.net/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "rawPrompt": "Summarize the principles of REST APIs",
    "taskType": "summarize",
    "targetHint": "local"
  }' | jq
```

## Using the CLI Client

The project includes a CLI client for testing:

```bash
# Test against default remote instance
OPE_HOST=https://ope.timok.deno.net deno task call '{
  "rawPrompt": "Explain quantum computing",
  "taskType": "summarize"
}'

# Test with custom JSON payload
OPE_HOST=https://your-instance.com deno run -A scripts/call.ts '{
  "rawPrompt": "Your question here",
  "taskType": "qa",
  "targetHint": "cloud"
}'
```

## CI/CD Integration

You can integrate remote testing into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Test Remote OPE Instance
  run: deno task test:remote
  env:
    OPE_HOST: https://staging.ope.example.com

- name: Test Production OPE Instance
  run: deno task test:remote
  env:
    OPE_HOST: https://ope.production.example.com
```

## Authentication

**Note**: The current OPE implementation does not include authentication at the
server level. If your deployment requires authentication, you would need to:

1. Add authentication middleware to the server
2. Modify the test suite to include auth headers
3. Set API keys via environment variables

Example modification (if authentication is added):

```typescript
const response = await fetch(`${OPE_HOST}/v1/generate`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${Deno.env.get("OPE_API_KEY")}`,
  },
  body: JSON.stringify(payload),
});
```

## Troubleshooting

### Test Failures

**Connection Errors**:

- Verify the remote host is accessible: `curl https://your-host.com/health`
- Check for network/firewall issues
- Ensure the URL includes the protocol (`https://`)

**Timeout Errors**:

- The remote instance may be slow or overloaded
- Check response time test (should be < 30s)
- Consider increasing timeout in test configuration

**Invalid Response Structure**:

- The remote instance may be running a different version
- Check the deployed version matches test expectations
- Review API response format

### Performance Issues

If tests are slow:

- Check network latency to remote host
- Monitor server load on remote instance
- Consider running tests from closer geographic location

## Test Coverage Summary

| Category       | Tests | Coverage                                        |
| -------------- | ----- | ----------------------------------------------- |
| Endpoints      | 2     | Health, Generate                                |
| Task Types     | 3     | QA, Extract, Summarize                          |
| Routing        | 1     | Local target hint                               |
| Validation     | 5     | Structure, IR, Compilation, Citations, Decoding |
| Error Handling | 2     | Empty prompt, Invalid JSON                      |
| Performance    | 2     | Response time, Concurrency                      |

**Total**: 15 comprehensive smoke tests

## Next Steps

After running remote tests:

1. Review any failures and investigate root causes
2. Check performance metrics (response times)
3. Verify all task types work correctly
4. Test with production-like payloads
5. Monitor error handling behavior
6. Validate concurrent request handling
