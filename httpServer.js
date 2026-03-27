import dotenv from 'dotenv';
import express from 'express';

import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import connectDB from './config/db.js';
import createHometeamServer from './createServer.js';
import apiKeyAuth from './middleware/apiKeyAuth.js';

dotenv.config({ quiet: true });

const app = express();
app.use(express.json({ limit: '1mb' }));

const sessions = new Map();

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

  const port = Number(process.env.MCP_SERVER_PORT || 3001);
  app.listen(port, () => {
    console.error(`Hometeam MCP HTTP server listening on port ${port}`);
  });
};

startHttpServer().catch((error) => {
  console.error('Failed to start Hometeam MCP HTTP server:', error.message);
  process.exit(1);
});
