# Grid Guide Setup

Grid Guide uses OpenAI's Responses API from a Vercel serverless function. The browser never receives the OpenAI API key.

## Environment Variables

Add these in Vercel Project Settings > Environment Variables:

```text
OPENAI_API_KEY=<your OpenAI API key>
OPENAI_MODEL=gpt-5.5
```

Apply `OPENAI_API_KEY` to Production, Preview, and Development if you want the guide available in every Vercel environment. `OPENAI_MODEL` is optional; the server defaults to `gpt-5.5`.

Create and manage API keys at https://platform.openai.com/api-keys. Do not place a real key in `.env.example`, GitHub, browser code, screenshots, or chat messages.

After adding or changing an environment variable, redeploy the latest Vercel deployment.

## Architecture

- Client: `src/components/GridGuide.jsx`
- Server: `api/grid-guide.js`
- API: OpenAI Responses API
- Output: strict JSON Schema using Structured Outputs
- Storage: disabled for the model request
- Context: active view, visible layer state, record counts, and a compact selected-feature summary
- Sources: server-side allowlist; model-returned citations not on the list are removed
- Rate limit: best-effort per-instance request limit, 12 requests per minute per address

## Official Documentation

- Responses API text generation: https://developers.openai.com/api/docs/guides/text
- Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- Current model guidance: https://developers.openai.com/api/docs/guides/latest-model

The OpenAI developer-docs MCP connector could not be installed in this Windows session because the local Codex executable was blocked. The implementation was therefore verified against the official pages above directly.
