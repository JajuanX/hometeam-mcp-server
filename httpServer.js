import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import connectDB from './config/db.js';
import createHometeamServer from './createServer.js';

dotenv.config({ quiet: true });
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
const PORT = Number(process.env.PORT || 3001);
const PUBLIC_BASE_URL = process.env.MCP_PUBLIC_URL || 'https://hometeam-mcp.herokuapp.com';
const DAILY_LIMIT = 100;
const requestCounts = new Map();

const app = express();

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const sessions = new Map();

const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim().length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || 'unknown-ip';
};

const getCurrentDay = () => new Date().toISOString().slice(0, 10);

const rateLimiter = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (typeof apiKey === 'string' && apiKey.trim().length > 0) {
    // TODO: validate API key against database for paid tiers.
    return next();
  }

  const ip = getClientIp(req);
  const day = getCurrentDay();
  const requestKey = `${ip}:${day}`;
  const currentCount = requestCounts.get(requestKey) || 0;

  if (currentCount >= DAILY_LIMIT) {
    return res.status(429).json({
      error: `Daily limit of ${DAILY_LIMIT} queries exceeded. Get an API key for higher limits at https://www.thehometeam.io/developers`,
    });
  }

  requestCounts.set(requestKey, currentCount + 1);

  if (Math.random() < 0.01) {
    const today = getCurrentDay();
    for (const key of requestCounts.keys()) {
      if (!key.endsWith(today)) {
        requestCounts.delete(key);
      }
    }
  }

  return next();
};

app.get('/', (_req, res) => {
  return res.status(200).json({
    service: 'hometeam-mcp-server',
    status: 'running',
    version: pkg.version,
    description: 'AI-queryable directory of Black-owned businesses in South Florida',
    tools: [
      'search_businesses',
      'get_business_details',
      'find_by_specialty',
      'list_categories',
      'list_neighborhoods',
      'get_latest_draft_class',
    ],
    documentation: 'https://www.thehometeam.io/developers',
    connect: {
      sse: `${PUBLIC_BASE_URL}/sse`,
      messages: `${PUBLIC_BASE_URL}/messages`,
    },
  });
});

app.get('/health', (_req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      version: pkg.version,
      activeConnections: sessions.size,
    },
  });
});

app.get('/sse', rateLimiter, async (req, res) => {
  const ip = getClientIp(req);
  console.error(`New SSE connection from ${ip}`);

  try {
    const server = createHometeamServer({
      apiKey: typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'] : null,
      ip,
      source: 'http',
      tier: req.headers['x-api-key'] ? 'paid' : 'free',
      version: pkg.version,
    });

    const transport = new SSEServerTransport('/messages', res);
    const sessionId = transport.sessionId || randomUUID();
    sessions.set(sessionId, { server, transport });

    res.on('close', async () => {
      const sessionEntry = sessions.get(sessionId);
      if (sessionEntry) {
        console.error(`SSE connection closed: ${sessionId}`);
        await sessionEntry.transport.close?.().catch(() => {});
        await sessionEntry.server.close?.();
        sessions.delete(sessionId);
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

app.post('/messages', rateLimiter, async (req, res) => {
  const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : null;

  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(400).json({
      error: 'Invalid or expired session. Reconnect via /sse',
    });
  }

  const sessionEntry = sessions.get(sessionId);

  try {
    await sessionEntry.transport.handlePostMessage(req, res, req.body);
    return undefined;
  } catch (error) {
    console.error('Message handling error:', error.message);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
});

const startHttpServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.error(`Hometeam MCP server running on port ${PORT}`);
    console.error('SSE endpoint: /sse');
    console.error('Messages endpoint: /messages');
  });
};

startHttpServer().catch((error) => {
  console.error('Failed to start Hometeam MCP HTTP server:', error.message);
  process.exit(1);
});
