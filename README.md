# Hometeam MCP Server

The Hometeam MCP server exposes an AI-queryable directory of Black-owned businesses in South Florida.
It runs as a separate Node.js service in `mcp-server/` and connects to the same MongoDB as the main backend.

## Features

- MCP tools for business search, details, categories, neighborhoods, draft classes, and specialty matching
- Stdio transport for Claude Desktop
- HTTP/SSE transport for remote clients
- Usage logging in MongoDB (`mcpusages`) for analytics and future billing
- API-key middleware scaffold for free/paid tier rate limits

## Available Tools

1. `search_businesses`
- Search active businesses by keyword, category slug, neighborhood slug, county, and sort.

2. `get_business_details`
- Fetch full details for one business by slug or fuzzy name.

3. `list_categories`
- List all categories with name, slug, and description.

4. `list_neighborhoods`
- List all neighborhoods, optionally filtered by county.

5. `get_latest_draft_class`
- Return the most recent published Draft Class and businesses in that class.

6. `find_by_specialty`
- Smart natural-language matching for needs like “box braids”, “catering”, “tax prep”.

## Setup

1. Install dependencies:
```bash
cd mcp-server
npm install
```

2. Configure environment:
```bash
cp .env.example .env
```

3. Set your `MONGO_URI` in `.env`.

## Run (Stdio / Claude Desktop)

```bash
npm run start
```

Claude Desktop config sample is in `claude_desktop_config.json`.

### Claude Desktop config

Add the `hometeam` block from `claude_desktop_config.json` into your Claude Desktop MCP config, then restart Claude Desktop.

## Run (HTTP/SSE)

```bash
npm run start:http
```

Health check:
```bash
curl http://localhost:3001/health
```

Endpoints:
- `GET /sse`
- `POST /messages?sessionId=<id>`

## Free vs Paid tier (beta scaffold)

- Free tier: IP-based rate limit (`MCP_FREE_DAILY_LIMIT`, default `100/day`)
- Paid tier: API-key based higher limit (`MCP_PAID_DAILY_LIMIT`, default `10000/day`)
- API keys are allowlisted via `MCP_API_KEYS` (comma-separated)
- During beta, missing key still receives free-tier access

## Usage Logging

Every tool call logs:
- tool name
- sanitized input
- businesses returned
- api key (if present)
- source (`claude-desktop` / `http`)
- response time
- timestamp

Collection: `mcpusages`

## Example prompts

- “Find me a Black-owned restaurant in Lauderhill.”
- “Tell me more about Keisha’s Kitchen.”
- “What categories are available on Hometeam?”
- “What neighborhoods in Broward are covered?”
- “What new businesses just joined Hometeam?”
- “I need someone to do box braids near Miramar.”

## Fair Use

- Be respectful of daily limits.
- Heavy scraping and abusive automated traffic are not supported.
- Rate limits and key enforcement will be tightened for paid API launch.
