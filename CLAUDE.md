# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains the PRD for **LaikaTest n8n Community Node** - an n8n integration that allows workflow builders to fetch prompts and push experiment scores to LaikaTest.

The related LaikaTest JavaScript SDK is located at `/Users/namanarora/laikatest_client_js`.

## Project Context

**LaikaTest n8n Node** wraps the `@laikatest/js-client` library to provide three operations:
1. **Get Prompt** - Fetch versioned prompts by name
2. **Get Experimental Prompt** - Fetch A/B tested prompt variants
3. **Push Scores** - Send evaluation metrics back to LaikaTest

Key design principles:
- Node should be thin and declarative - map n8n inputs to client library calls
- Pass client library responses through untouched (no transformation)
- Fail fast with clear errors - no silent fallbacks or retries
- Single credential per project (1 API key = 1 project)

## LaikaTest SDK Structure (laikatest_client_js)

A monorepo with three packages:

### @laikatest/js-client (packages/client)
Core JavaScript client for prompt fetching and experiments.
- Pure JavaScript (no TypeScript compilation needed)
- Run tests: `node test.js`
- Key exports: `LaikaTest`, `Prompt`, error classes

### @laikatest/auto-otel (packages/auto-otel)
OpenTelemetry auto-instrumentation for LLM tracing.
- TypeScript, build with: `npm run build`
- Run tests: `npm test` (Jest)
- Provides session/user tracking, custom properties, experiment context injection

### @laikatest/sdk (packages/sdk)
Unified SDK combining client and auto-otel.
- TypeScript, build with: `npm run build`
- Run tests: `npm test` (Jest)
- Single entry point for both tracing and experiments

## Common Commands

```bash
# Root level (monorepo)
npm install          # Install all workspace dependencies
npm run build        # Build all TypeScript packages
npm test             # Run tests across all packages

# Per-package
cd packages/client && node test.js
cd packages/auto-otel && npm run build && npm test
cd packages/sdk && npm run build && npm test
```

## Architecture Notes

### Client Library Flow
```
LaikaTest.getPrompt() -> fetchPrompt() -> HTTP to api.laikatest.com -> Prompt instance
LaikaTest.getExperimentPrompt() -> evaluateExperiment() -> sets currentExperiment context -> Prompt instance
prompt.pushScore() -> delegates to client.pushScore() -> HTTP to /api/v1/scores
```

### Context Propagation (auto-otel)
- `LaikaSpanProcessor` injects session/user/properties into all spans
- `getCurrentExperiment()` from js-client provides experiment context for trace correlation
- AsyncLocalStorage used for per-request context in concurrent environments

### Score Types
Scores support: `int`, `float`, `bool`, `string` - type must match value.

## Important Patterns

### Error Classes
- `ValidationError` - Invalid inputs
- `AuthenticationError` - API key issues
- `NetworkError` - Connection/timeout failures
- `LaikaServiceError` - API errors (4xx, 5xx)

### Prompt Class
- `getContent()` - Get raw prompt content
- `compile(variables)` - Replace `{{placeholders}}`
- `pushScore(scores, options)` - Only works for experiment prompts
- `getBucketId()`, `getExperimentId()` - Experiment metadata accessors

## n8n Node Development Notes

For the n8n node implementation:
- Use `@laikatest/js-client` directly (not the unified SDK)
- Node credential type should store API key
- Map n8n operation parameters to client method calls
- Return raw client responses without modification
- Handle all error types and propagate to n8n error system
