import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import connectDB from './config/db.js';
import createHometeamServer from './createServer.js';

dotenv.config({ quiet: true });
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

const startServer = async () => {
  await connectDB();

  const server = createHometeamServer({
    source: 'claude-desktop',
    version: pkg.version,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Hometeam MCP server running');
};

startServer().catch((error) => {
  console.error('Hometeam MCP server failed to start:', error.message);
  process.exit(1);
});
