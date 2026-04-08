# 🏠 Hometeam MCP Server

**Ask any AI about Black-owned businesses in South Florida. This is where the answers come from.**

The Hometeam MCP server connects AI assistants to a curated, community-verified directory of Black-owned businesses across Miami-Dade, Broward, and Palm Beach counties. When someone asks Claude, "find me a Black-owned caterer in Broward County," this server provides the real, verified data behind the answer.

Built on the [Model Context Protocol](https://modelcontextprotocol.io) (MCP) — the open standard for connecting AI assistants to external data sources.

---

## Published on the MCP Registry

This server is listed on the [official MCP Registry](https://registry.modelcontextprotocol.io) as `io.github.JajuanX/hometeam-directory`.

**Live endpoint:** `https://mcp.thehometeam.io/sse`

### Connect with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hometeam": {
      "command": "npx",
      "args": [
        "mcp-remote@latest",
        "https://mcp.thehometeam.io/sse"
      ]
    }
  }
}
```

### Available tools

| Tool | Description |
|------|-------------|
| `search_businesses` | Search by keyword, category, neighborhood, or county |
| `get_business_details` | Get full profile: hours, contact, reviews, specials |
| `find_by_specialty` | Natural language search ("someone to do box braids near Miramar") |
| `list_categories` | All 14 business categories |
| `list_neighborhoods` | Neighborhoods across Miami-Dade, Broward, Palm Beach |
| `get_latest_draft_class` | Newest businesses added on Draft Day |

### Rate limits

| Tier | Limit | Access |
|------|-------|--------|
| Free | 100 queries/day | No API key needed |
| Pro | 10,000 queries/day | API key (coming soon) |

---

## Connect to the live server

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "hometeam": {
      "command": "npx",
      "args": [
        "mcp-remote@latest",
        "https://mcp.thehometeam.io/sse"
      ]
    }
  }
}
```

Restart Claude Desktop. Then ask:
- "Find me a Black-owned restaurant in Lauderhill"
- "What new businesses just joined Hometeam?"
- "I need someone to do box braids near Miramar"

### HTTP endpoints

| Endpoint | Description |
|----------|-------------|
| `GET https://mcp.thehometeam.io/` | Service info and available tools |
| `GET https://mcp.thehometeam.io/health` | Health check |
| `GET https://mcp.thehometeam.io/sse` | SSE connection for MCP clients |
| `POST https://mcp.thehometeam.io/messages` | MCP message handler |

### Rate limits

| Tier | Limit | How to access |
|------|-------|---------------|
| Free | 100 queries/day | No API key required |
| Pro | 10,000 queries/day | API key (coming soon — join the waitlist at thehometeam.io/developers) |

### Quick test

```bash
# Service info
curl https://mcp.thehometeam.io/

# Health check
curl https://mcp.thehometeam.io/health
```

### Verify on the registry

```bash
curl "https://registry.modelcontextprotocol.io/v0/servers/io.github.JajuanX%2Fhometeam-directory/versions/latest"
```

### Local development

If you want to run the server locally (for development or contributing):

```bash
git clone https://github.com/juanx/hometeam-project-orange.git
cd hometeam-project-orange/hometeam/mcp-server
npm install
cp .env.example .env
# Edit .env — set MONGO_URI to the same database as the backend

# Run with stdio transport (for Claude Desktop local testing)
npm run start:local

# Run with HTTP/SSE transport (for remote access)
npm start
```

Claude Desktop config for local:

```json
{
  "mcpServers": {
    "hometeam": {
      "command": "node",
      "args": ["/absolute/path/to/hometeam-mcp-server/server.js"],
      "env": {
        "MONGO_URI": "your_mongodb_connection_string"
      }
    }
  }
}
```

**Important:** Use the absolute path from `pwd` in the mcp-server directory. `console.log` is redirected to `console.error` because stdio transport uses stdout for JSON-RPC communication.

---

## Available tools

The MCP server exposes 6 tools that AI assistants can call:

### `search_businesses`
Search the directory by keyword, category, neighborhood, or county.

```json
{
  "query": "jerk chicken",
  "county": "Broward",
  "limit": 5,
  "sort": "most_visited"
}
```

Returns matching businesses with name, category, neighborhood, rating, contact info, and Hometeam profile link.

---

### `get_business_details`
Get everything about a specific business — hours, contact, social media, reviews, current specials.

```json
{ "slug": "keishas-kitchen" }
```

Or search by name:

```json
{ "name": "Keisha's Kitchen" }
```

Returns the full business profile including recent reviews, active specials, and community trust signals.

---

### `find_by_specialty`
The smart search. Describe what you need in plain English.

```json
{ "need": "someone to do box braids for my daughter's birthday", "location": "Miramar" }
```

```json
{ "need": "tax preparation for my small business", "location": "Palm Beach" }
```

```json
{ "need": "a barber who can do a fresh fade", "location": "Overtown" }
```

Maps natural language to categories and searches intelligently. This is the tool most AI assistants reach for first.

---

### `list_categories`
Returns all business categories in the directory. No parameters needed.

Categories: Restaurants & Food, Hair & Beauty, Health & Wellness, Home Services, Professional Services, Retail & Shopping, Auto Services, Education & Tutoring, Events & Entertainment, Fitness & Training, Technology & Media, Real Estate, Childcare & Family, Arts & Creative.

---

### `list_neighborhoods`
Returns South Florida neighborhoods, optionally filtered by county.

```json
{ "county": "Broward" }
```

Covers 29+ neighborhoods across Miami-Dade, Broward, and Palm Beach counties.

---

### `get_latest_draft_class`
Returns the most recent Draft Class — the newest businesses to join Hometeam. No parameters needed.

Hometeam drafts new businesses monthly through community events. This tool lets AI assistants answer "what's new?" questions with real, timely data.

---

## How it works

```
User asks AI: "Find me a Black-owned caterer in Broward"
         │
         ▼
AI assistant sees Hometeam MCP tools are available
         │
         ▼
AI calls search_businesses({ query: "caterer", county: "Broward" })
         │
         ▼
Hometeam MCP server queries the live MongoDB database
         │
         ▼
Returns real business data: name, location, rating, contact, hours
         │
         ▼
AI presents the answer to the user with Hometeam attribution
         │
         ▼
User visits the business. Community grows.
```

The data is always live — not a cached snapshot. When a business updates their hours or posts a special, the MCP server reflects it immediately.

---

## Project structure

```
mcp-server/
├── server.js                  # Entry point (stdio transport — local/Claude Desktop)
├── httpServer.js              # HTTP/SSE transport (deployed/remote access)
├── config/
│   └── db.js                  # MongoDB connection
├── models/                    # Mongoose schemas (read-only, shared with backend DB)
│   ├── Business.js
│   ├── Category.js
│   ├── Neighborhood.js
│   ├── Review.js
│   ├── Event.js
│   ├── DraftClass.js
│   └── McpUsage.js
├── tools/                     # MCP tool definitions + handlers
│   ├── searchBusinesses.js
│   ├── getBusinessDetails.js
│   ├── findBySpecialty.js
│   ├── listCategories.js
│   ├── listNeighborhoods.js
│   └── getLatestDraftClass.js
├── middleware/
│   └── apiKeyAuth.js          # API key validation (paid tier — coming soon)
├── utils/
│   └── logUsage.js            # Query analytics logger
├── scripts/
│   └── release.js             # Semantic version release script
└── .env.example
```

---

## Transport modes

### Stdio (local)
For Claude Desktop and local development. Communicates via stdin/stdout using JSON-RPC.

```bash
npm run start:local
```

**Critical:** All logging uses `console.error`, not `console.log`. Stdout is reserved for the MCP protocol. Any `console.log` output corrupts the JSON-RPC stream and crashes the connection.

### HTTP/SSE (deployed)
For production and remote AI agents. Express server with Server-Sent Events.

```bash
npm start
# Starts on PORT (default 3001, Heroku assigns dynamically)
```

Endpoints:
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service info, version, tool list |
| GET | `/health` | Health check |
| GET | `/sse` | SSE connection for MCP clients |
| POST | `/messages` | MCP JSON-RPC message handler |

---

## Developer workflow

### Coding conventions

Defined in `AGENTS.md` at the project root (shared with the backend). Key rules:

- **ES Modules** — `import`/`export` with `.js` extensions on all relative imports
- **Async/await** throughout
- **`console.error` only** — never `console.log` (breaks stdio transport)
- **Models** — `export default`, read-only versions of backend schemas
- **Tools** — each tool in its own file, exports schema + handler

### Adding a new MCP tool

1. Create `mcp-server/tools/myNewTool.js` with a schema and handler export:
   ```javascript
   export const myNewToolSchema = {
     description: 'What this tool does — written for an AI to understand when to use it',
     inputSchema: {
       type: 'object',
       properties: {
         param1: { type: 'string', description: 'What this parameter means' },
       },
       required: ['param1'],
     },
   };

   export const myNewToolHandler = async (args) => {
     // Query MongoDB, format results
     return { success: true, data: { args } };
   };
   ```

2. Register it in `mcp-server/tools/index.js`:
   ```javascript
   import { myNewToolHandler, myNewToolSchema } from './myNewTool.js';

   export const TOOL_DEFINITIONS = [
     // existing tools...
     {
       name: 'my_new_tool',
       description: myNewToolSchema.description,
       inputSchema: myNewToolSchema.inputSchema,
       handler: myNewToolHandler,
     },
   ];
   ```

3. Restart the MCP server and test with Claude Desktop locally before deploying.

### Branch strategy and commits

Same as the backend — feature branches, conventional commits:

```
feat: add business-hours-aware search tool
fix: correct category matching in find_by_specialty
chore: update @modelcontextprotocol/sdk
```

---

## Versioning and releases

Version lives in `package.json` and is served in the MCP server info and HTTP root endpoint.

```bash
# Bug fix (1.0.0 → 1.0.1)
npm run release:patch

# New feature — e.g., new MCP tool (1.0.0 → 1.1.0)
npm run release:minor

# Breaking change (1.0.0 → 2.0.0)
npm run release:major
```

The script: checks for clean working tree → bumps `package.json` → commits → creates git tag → pushes → Heroku auto-deploys.

---

## Deployment

### Heroku

The deployed version uses `httpServer.js` (HTTP/SSE), not `server.js` (stdio).

```bash
heroku login
heroku create hometeam-mcp

heroku config:set NODE_ENV=production
heroku config:set MONGO_URI="your_mongodb_atlas_uri"
heroku config:set MCP_SERVER_NAME="hometeam-directory"
heroku config:set CORS_ORIGIN="*"

git push heroku main

# Verify
curl https://mcp.thehometeam.io/
curl https://mcp.thehometeam.io/health
```

**Do not set PORT** — Heroku assigns it. The `Procfile` runs `node httpServer.js`.

### Verify tools are registered

```bash
curl https://mcp.thehometeam.io/
```

Response includes all 6 tool names in the `tools` array.

In Claude Desktop MCP logs, you should see:
```
tools/list → search_businesses, get_business_details, find_by_specialty,
             list_categories, list_neighborhoods, get_latest_draft_class
```

---

## Usage analytics

Every query is logged (anonymized) to the `mcpusages` MongoDB collection:

- Which tool was called
- Input parameters (sanitized)
- Which businesses appeared in results
- Response time

This data powers:

**For business owners:** Their dashboard shows "AI recommendation served via MCP" in the activity feed, with how often AI agents recommend their business.

**For the platform:** Aggregated trends reveal demand — "Caribbean catering queries spiked 300% in Broward this month."

---

## API access tiers

### Free tier (current)
- 100 queries per day per IP
- All 6 tools
- Basic business data
- No API key required

### Pro tier (coming soon)
- 10,000 queries per day
- Enhanced data (full reviews, photos, specials, visit counts)
- Usage analytics dashboard
- Priority support
- Starting at $99/month

**Business owners are never charged.** Hometeam is free for all listed businesses.

[Join the Pro tier waitlist →](https://hometeam.app/developers)

---

## Environment variables

```env
NODE_ENV=development
PORT=3001
MONGO_URI=mongodb://localhost:27017/hometeam
MCP_SERVER_NAME=hometeam-directory
CORS_ORIGIN=*
```

The `MONGO_URI` must point to the same database as the backend. The MCP server reads from it; it does not write business data (only writes usage logs).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | HTTP/SSE server (production, deployed) |
| `npm run start:local` | Stdio server (Claude Desktop, local dev) |
| `npm run dev` | HTTP/SSE with auto-reload |
| `npm run dev:local` | Stdio with auto-reload |
| `npm run release` | Show release usage help |
| `npm run release:patch` | Bug fix release |
| `npm run release:minor` | Feature release |
| `npm run release:major` | Breaking change release |

---

## Coverage

### Miami-Dade County
Overtown · Liberty City · Little Haiti · Opa-locka · Carol City · Richmond Heights · Goulds · Florida City · Coconut Grove West · North Miami · Miami Gardens

### Broward County
Lauderhill · Lauderdale Lakes · Fort Lauderdale · Plantation · Miramar · Pembroke Pines · Hollywood · Deerfield Beach · Pompano Beach · Dania Beach · Tamarac

### Palm Beach County
West Palm Beach · Riviera Beach · Boynton Beach · Delray Beach · Belle Glade · Lake Worth Beach · Palm Beach Gardens

---

## Why MCP?

Most local business directories are trapped behind websites. You have to know they exist, visit them, and search manually.

MCP makes Hometeam's data available to every AI assistant that supports the protocol. Instead of one website with one search bar, there are millions of AI assistants — each one a potential distribution channel for Black-owned businesses.

When someone asks their AI "where should I eat in Lauderhill?", the answer should include Black-owned restaurants. Not because of an algorithm, but because the community verified them and Hometeam made the data available.

---

## Related repos

| Repo | Description |
|------|-------------|
| [hometeam-backend](https://github.com/juanx/hometeam-backend) | Node.js/Express API |
| [hometeam-frontend](https://github.com/juanx/hometeam-frontend) | React/TypeScript directory, dashboards, map |

---

## Contributing

We welcome contributions. To add a new MCP tool, improve search relevance, or fix a bug: open an issue or submit a PR.

---

## License

MIT

---

*Every AI recommendation is a customer walking through a Black-owned business's door. That's the point.*
