import dotenv from 'dotenv';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import connectDB from './config/db.js';
import createHometeamServer from './createServer.js';

dotenv.config({ quiet: true });

const startServer = async () => {
  await connectDB();

  const server = createHometeamServer({
    source: 'claude-desktop',
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Hometeam MCP server running');
};

startServer().catch((error) => {
  console.error('Hometeam MCP server failed to start:', error.message);
  process.exit(1);
});
