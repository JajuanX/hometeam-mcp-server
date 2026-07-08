import express from 'express';
import dotenv from 'dotenv';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import createServer from './createServer.js';
import connectDB from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 3100;
const MCP_PUBLIC_URL = process.env.MCP_PUBLIC_URL || `http://localhost:${PORT}`;

await connectDB();

const app = express();

app.set('trust proxy', 1);

// ============================================================
// 1. CORS - must come before everything else so preflight works
// ============================================================
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization, MCP-Protocol-Version, Mcp-Session-Id');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE');
  res.header('Access-Control-Expose-Headers', 'MCP-Protocol-Version, Mcp-Session-Id');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  return next();
});

// ============================================================
// 2. MCP protocol version header on every response
// ============================================================
app.use((req, res, next) => {
  res.set('MCP-Protocol-Version', '2025-06-18');
  next();
});

// ============================================================
// 3. OAuth discovery - return 404 to signal "no auth required"
//    Must come BEFORE any auth middleware would run.
// ============================================================
app.get('/.well-known/oauth-authorization-server', (_req, res) => {
  res.status(404).json({ error: 'This server does not require authentication.' });
});

app.get('/.well-known/openid-configuration', (_req, res) => {
  res.status(404).json({ error: 'This server does not require authentication.' });
});

// ============================================================
// 4. JSON body parsing (no auth in this cycle)
// ============================================================
app.use(express.json({ limit: '1mb' }));

// ============================================================
// 5. Health check - public, no auth
// ============================================================
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    server: process.env.MCP_SERVER_NAME || 'hometeam-directory',
    version: process.env.MCP_SERVER_VERSION || '1.0.0',
    publicUrl: MCP_PUBLIC_URL,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// 6. MCP request handler - Streamable HTTP transport
//    Mounted at both `/` and `/mcp` for maximum client compatibility.
// ============================================================
const handleMcp = async (req, res) => {
  try {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('[mcp] request error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal error' },
        id: null,
      });
    }
  }
};

app.post('/', handleMcp);
app.post('/mcp', handleMcp);

// ============================================================
// 7. Protocol compliance handlers
//    GET on MCP paths -> 405 (Method Not Allowed)
//    DELETE on MCP paths -> 200 (session cleanup)
// ============================================================
app.get('/', (_req, res) => {
  res.set('Allow', 'POST').status(405).json({
    error: 'Method not allowed. Use POST for MCP requests.',
    server: process.env.MCP_SERVER_NAME || 'hometeam-directory',
    version: process.env.MCP_SERVER_VERSION || '1.0.0',
  });
});

app.get('/mcp', (_req, res) => {
  res.set('Allow', 'POST').status(405).json({
    error: 'Method not allowed. Use POST for MCP requests.',
  });
});

app.delete('/', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.delete('/mcp', (_req, res) => {
  res.status(200).json({ ok: true });
});

// ============================================================
// Start listening
// ============================================================
app.listen(PORT, () => {
  console.log(`[mcp] server listening on port ${PORT}`);
  console.log(`[mcp] public URL: ${MCP_PUBLIC_URL}`);
  console.log('[mcp] transport: Streamable HTTP at /mcp and /');
});
