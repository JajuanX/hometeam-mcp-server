import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import connectDB from './config/db.js';
import createHometeamServer from './createServer.js';
import apiKeyAuth from './middleware/apiKeyAuth.js';

dotenv.config({ quiet: true });

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : ['*'];

const resolvedCorsOrigin = corsOrigins.length === 1 && corsOrigins[0] === '*'
  ? '*'
  : corsOrigins;

const mcpLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: (req) => (req.headers['x-api-key'] ? 10000 : 100),
  keyGenerator: (req) => {
    const headerKey = req.headers['x-api-key'];
    if (typeof headerKey === 'string' && headerKey.trim().length > 0) {
      return headerKey.trim();
    }

    return req.ip || 'unknown-ip';
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Free tier limit reached (100 queries/day). Upgrade to Pro for higher limits.',
    documentation: 'https://hometeam.app/developers',
  },
});

app.use(cors({
  origin: resolvedCorsOrigin,
}));
app.use(express.json({ limit: '1mb' }));
app.use(mcpLimiter);

const sessions = new Map();

app.get('/', (_req, res) => {
  return res.status(200).json({
    service: 'hometeam-mcp-server',
    status: 'running',
    version: process.env.MCP_SERVER_VERSION || '1.0.0',
    transport: 'sse',
    endpoints: {
      health: '/health',
      messages: '/messages',
      sse: '/sse',
    },
    tools: [
      'search_businesses',
      'get_business_details',
      'find_by_specialty',
      'list_categories',
      'list_neighborhoods',
      'get_latest_draft_class',
    ],
    documentation: 'https://hometeam.app/developers',
  });
});

app.get('/health', (_req, res) => {
  return res.status(200).json({
    success: true,
    status: 'ok',
    service: process.env.MCP_SERVER_NAME || 'hometeam-directory',
  });
});

app.get('/sse', apiKeyAuth, async (req, res) => {
  try {
    const server = createHometeamServer({
      apiKey: req.mcpAccess?.apiKey || null,
      ip: req.ip,
      source: 'http',
      tier: req.mcpAccess?.tier || 'free',
    });

    const transport = new SSEServerTransport('/messages', res);
    sessions.set(transport.sessionId, { server, transport });

    req.on('close', async () => {
      const sessionEntry = sessions.get(transport.sessionId);
      if (sessionEntry) {
        await sessionEntry.server.close?.();
        sessions.delete(transport.sessionId);
      }
    });

    await server.connect(transport);
  } catch (error) {
    console.error('Failed to initialize MCP SSE transport:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to start MCP SSE session.',
    });
  }

  return undefined;
});

app.post('/messages', apiKeyAuth, async (req, res) => {
  const sessionId = req.query.sessionId;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Missing sessionId query parameter.',
    });
  }

  const sessionEntry = sessions.get(sessionId);

  if (!sessionEntry) {
    return res.status(404).json({
      success: false,
      message: 'Unknown or expired MCP session.',
    });
  }

  try {
    await sessionEntry.transport.handlePostMessage(req, res, req.body);
    return undefined;
  } catch (error) {
    console.error('Failed to handle MCP message:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to process MCP message.',
    });
  }
});

const startHttpServer = async () => {
  await connectDB();

  const port = Number(process.env.PORT || 3001);
  app.listen(port, () => {
    console.error(`Hometeam MCP HTTP server listening on port ${port}`);
  });
};

startHttpServer().catch((error) => {
  console.error('Failed to start Hometeam MCP HTTP server:', error.message);
  process.exit(1);
});
