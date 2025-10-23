# OPE Logging and Observability Guide

This document explains the comprehensive logging system implemented in OPE for debugging production issues and understanding request flow.

## Overview

OPE implements structured logging throughout the entire request/response pipeline with:
- Request ID tracking for tracing individual requests
- ISO 8601 timestamps on all log entries
- Log levels (INFO, WARN, ERROR)
- Contextual data in JSON format
- Stage-by-stage pipeline logging with duration metrics

## Log Levels

### INFO
Normal operational messages showing request flow and successful operations:
- Server startup
- Request received/completed
- Pipeline stage completions
- Adapter calls and responses

### WARN
Warning conditions that don't prevent operation but indicate potential issues:
- Response validation repairs (e.g., invalid JSON from model)
- Fallback to echo adapter
- Configuration issues in non-critical paths

### ERROR
Error conditions that prevent normal operation:
- Request parsing failures
- Missing required configuration
- Adapter failures (network errors, invalid responses)
- Unhandled exceptions

## Log Format

All logs follow this format:
```
[TIMESTAMP] LEVEL: message {"context":"data"}
```

Example:
```
[2025-10-23T12:11:16.594Z] INFO: Pipeline starting {"requestId":"c1767f5b-e7e4-46f2-bb9e-6d70873006e6"}
```

## Request Flow Logging

### 1. Server Layer ([src/server.ts](src/server.ts))

**Server Startup:**
```
INFO: Server starting {"port":8787,"env":"production"}
```

**Request Received:**
```
INFO: Request received {
  "method":"POST",
  "path":"/v1/generate",
  "userAgent":"Deno/2.0.0",
  "requestId":"abc-123"
}
```

**Request Body Parsed:**
```
INFO: Request body parsed {
  "rawPromptLength":45,
  "taskType":"summarize",
  "targetHint":"local",
  "requestId":"abc-123"
}
```

**Request Completed:**
```
INFO: Request completed {
  "status":200,
  "duration":142,
  "requestId":"abc-123"
}
```

### 2. Pipeline Orchestration ([src/routes/generate.ts](src/routes/generate.ts))

**Pipeline Start:**
```
INFO: Pipeline starting {"requestId":"abc-123"}
```

**Stage Pattern:**
Each stage logs start and completion:
```
INFO: Starting {stage} stage {"requestId":"abc-123"}
INFO: Completed {stage} stage {
  ...stage-specific-context,
  "stage":"analyze",
  "duration":0,
  "requestId":"abc-123"
}
```

**Analyze Stage:**
```
INFO: Completed analyze stage {
  "needsJson":true,
  "needsCitations":true,
  "maxWords":180,
  "stage":"analyze",
  "duration":0,
  "requestId":"abc-123"
}
```

**Synthesize Stage:**
```
INFO: Completed synthesize stage {
  "role":"precise expert",
  "constraintsCount":3,
  "styleCount":2,
  "stage":"synthesize",
  "duration":0,
  "requestId":"abc-123"
}
```

**Compile Stage:**
```
INFO: Completed compile stage {
  "systemPromptLength":217,
  "userPromptLength":170,
  "temperature":0.2,
  "maxTokens":600,
  "stage":"compile",
  "duration":0,
  "requestId":"abc-123"
}
```

**Route Stage:**
```
INFO: Completed route stage {
  "model":"local/echo",
  "targetHint":"local",
  "hasCloud":false,
  "hasLocalHttp":false,
  "stage":"route",
  "duration":0,
  "requestId":"abc-123"
}
```

**Adapter Stage:**
```
INFO: Calling adapter {
  "model":"local/echo",
  "temperature":0.2,
  "maxTokens":600,
  "requestId":"abc-123"
}

INFO: Completed adapter stage {
  "success":true,
  "responseLength":362,
  "stage":"adapter",
  "duration":0,
  "requestId":"abc-123"
}
```

**Validation Stage:**
```
INFO: Completed validate stage {
  "wasRepaired":true,
  "errorKind":"INVALID_JSON",
  "stage":"validate",
  "duration":0,
  "requestId":"abc-123"
}

WARN: Response required repair {
  "errorKind":"INVALID_JSON",
  "errorDetail":"Invalid JSON - wrapped raw text as answer",
  "requestId":"abc-123"
}
```

**Pipeline Completion:**
```
INFO: Pipeline completed successfully {
  "answerLength":362,
  "citationsCount":0,
  "wasRepaired":true,
  "requestId":"abc-123"
}
```

### 3. Adapter Layer

#### localEcho ([src/adapters/localEcho.ts](src/adapters/localEcho.ts))
```
INFO: localEcho adapter called {
  "adapter":"localEcho",
  "systemLength":217,
  "userLength":170,
  "maxTokens":600,
  "temperature":0.2
}

INFO: localEcho response generated {
  "adapter":"localEcho",
  "responseLength":362
}
```

#### localHttp ([src/adapters/localHttp.ts](src/adapters/localHttp.ts))
```
INFO: localHttp adapter called {
  "adapter":"localHttp",
  "url":"http://localhost:11434/generate",
  "promptLength":387,
  "maxTokens":600,
  "temperature":0.2
}

INFO: localHttp response received {
  "adapter":"localHttp",
  "duration":523,
  "responseLength":245
}
```

**Error Case:**
```
ERROR: localHttp: HTTP error response {
  "adapter":"localHttp",
  "status":500,
  "duration":234,
  "bodyPreview":"Internal server error..."
}
```

#### openaiStyle ([src/adapters/openaiStyle.ts](src/adapters/openaiStyle.ts))
```
INFO: openaiStyle adapter called {
  "adapter":"openaiStyle",
  "url":"https://api.openai.com/v1/chat/completions",
  "model":"gpt-4o-mini",
  "systemLength":217,
  "userLength":170,
  "maxTokens":600,
  "temperature":0.2
}

INFO: openaiStyle response received {
  "adapter":"openaiStyle",
  "duration":1245,
  "responseLength":342,
  "model":"gpt-4o-mini",
  "finishReason":"stop"
}
```

## Error Scenarios

### Invalid Request
```
ERROR: Invalid request: missing or empty rawPrompt {"requestId":"abc-123"}
```

### Configuration Missing
```
ERROR: localHttp: LLM_BASE_URL not configured
```

### Adapter Failure
```
ERROR: Adapter call failed {
  "errorKind":"NETWORK_ERROR",
  "errorDetail":"Connection refused",
  "requestId":"abc-123"
}
```

### Unhandled Server Error
```
ERROR: Unhandled server error {
  "error":{
    "message":"Unexpected error",
    "stack":"...",
    "name":"Error"
  },
  "duration":45,
  "requestId":"abc-123"
}
```

## Response Headers

Every response includes an `x-request-id` header for correlation:
```
x-request-id: c1767f5b-e7e4-46f2-bb9e-6d70873006e6
```

## Remote Test Logging

The remote test suite ([test/remote.smoke.test.ts](test/remote.smoke.test.ts)) includes detailed logging:

**Request Starting:**
```
[2025-10-23T12:11:16.590Z] [BasicGeneration] Request starting
{
  "host": "https://ope.timok.deno.net",
  "payload": {
    "rawPrompt": "What is the capital of France?",
    "taskType": "qa"
  }
}
```

**Response Received:**
```
[2025-10-23T12:11:16.735Z] [BasicGeneration] Response received
{
  "status": 200,
  "statusText": "OK",
  "duration": "145ms",
  "headers": {
    "content-type": "application/json; charset=utf-8",
    "x-request-id": "abc-123"
  }
}
```

**Response Summary:**
```
[2025-10-23T12:11:16.738Z] [BasicGeneration] Response body summary
{
  "outputAnswerLength": 52,
  "citationsCount": 0,
  "model": "local/echo",
  "wasRepaired": true,
  "duration": "145ms"
}
```

### Verbose Mode

Set `VERBOSE=true` to see full response bodies in tests:
```bash
VERBOSE=true deno task test:remote
```

This will output complete response JSON for detailed debugging.

## Monitoring Production

### Viewing Logs

Logs are written to stdout/stderr and can be collected by your deployment platform:

**Deno Deploy:**
```bash
# View logs in Deno Deploy dashboard
# or use CLI
deno deploy logs
```

**Local Development:**
```bash
# Run server and pipe to file
deno task dev 2>&1 | tee ope.log

# Follow logs in real-time
tail -f ope.log
```

### Filtering Logs

**By request ID:**
```bash
grep "abc-123" ope.log
```

**By log level:**
```bash
grep "ERROR:" ope.log
grep "WARN:" ope.log
```

**By stage:**
```bash
grep "stage\":\"analyze" ope.log
grep "adapter stage" ope.log
```

### Key Metrics to Monitor

1. **Request Duration:** Look for `Request completed` duration values
2. **Adapter Performance:** Check adapter stage duration
3. **Repair Rate:** Count `wasRepaired: true` occurrences
4. **Error Rate:** Count ERROR level logs
5. **Model Selection:** Track which models are being used

### Example Queries

**Find slow requests (>1000ms):**
```bash
grep "Request completed" ope.log | jq 'select(.duration > 1000)'
```

**Count validation repairs by error kind:**
```bash
grep "wasRepaired\":true" ope.log | jq -r '.errorKind' | sort | uniq -c
```

**Average adapter duration:**
```bash
grep "Completed adapter stage" ope.log | jq '.duration' | awk '{s+=$1; c++} END {print s/c}'
```

## Debugging Tips

### Tracing a Single Request

1. Get request ID from response header or client logs
2. Grep all logs for that request ID:
```bash
grep "abc-123" ope.log
```

3. Examine the pipeline stages in order:
   - analyze → synthesize → compile → route → adapter → validate

### Common Issues

**High Repair Rate:**
- Check validation logs for error kinds
- Examine model responses (run locally with echo adapter)
- Consider adjusting prompt templates

**Adapter Timeouts:**
- Look for long adapter stage durations
- Check network connectivity to LLM provider
- Verify API key and configuration

**Empty Responses:**
- Check adapter logs for HTTP errors
- Verify model is generating content
- Look for finish_reason in openaiStyle logs

**Performance Issues:**
- Identify slow stages from duration metrics
- Check total request duration
- Monitor adapter response times

## Best Practices

1. **Always include request ID** in bug reports or incident investigations
2. **Monitor validation repair rate** - high rates indicate prompt engineering issues
3. **Set up log aggregation** in production for easier searching
4. **Use structured log parsing** (jq, jq-like tools) for analysis
5. **Track key metrics over time** (request duration, error rates, repair rates)
6. **Set up alerts** for ERROR logs and high repair rates

## Related Files

- [src/lib/logger.ts](src/lib/logger.ts) - Logging utility functions
- [src/server.ts](src/server.ts) - HTTP server with request/response logging
- [src/routes/generate.ts](src/routes/generate.ts) - Pipeline orchestration logging
- [src/adapters/](src/adapters/) - Adapter-specific logging
- [test/remote.smoke.test.ts](test/remote.smoke.test.ts) - Test logging examples
