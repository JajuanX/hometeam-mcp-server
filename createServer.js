import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { TOOL_DEFINITIONS, TOOL_MAP } from './tools/index.js';

const EMPTY_OBJECT_SCHEMA = { type: 'object', properties: {} };

const getApiKeyFromRequestInfo = (requestInfo) => {
  if (!requestInfo?.headers) {
    return null;
  }

  if (typeof requestInfo.headers.get === 'function') {
    return requestInfo.headers.get('x-api-key');
  }

  if (Array.isArray(requestInfo.headers)) {
    const matched = requestInfo.headers.find(([key]) => String(key).toLowerCase() === 'x-api-key');
    return matched?.[1] || null;
  }

  if (typeof requestInfo.headers === 'object') {
    const key = Object.keys(requestInfo.headers).find((headerName) => headerName.toLowerCase() === 'x-api-key');
    return key ? requestInfo.headers[key] : null;
  }

  return null;
};

const toCallToolResult = (payload, isError = false) => {
  const text = typeof payload === 'string'
    ? payload
    : JSON.stringify(payload, null, 2);

  const structuredContent = payload && typeof payload === 'object'
    ? payload
    : { value: payload };

  return {
    content: [{ type: 'text', text }],
    structuredContent,
    ...(isError ? { isError: true } : {}),
  };
};

const buildRequestMeta = (defaultMeta, extra) => {
  return {
    ...defaultMeta,
    sessionId: extra?.sessionId,
    apiKey: defaultMeta.apiKey || getApiKeyFromRequestInfo(extra?.requestInfo),
  };
};

const createHometeamServer = (defaultMeta = {}) => {
  const serverVersion = defaultMeta.version || process.env.MCP_SERVER_VERSION || '1.0.0';

  const server = new Server(
    {
      name: process.env.MCP_SERVER_NAME || 'hometeam-directory',
      version: serverVersion,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOL_DEFINITIONS.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema || EMPTY_OBJECT_SCHEMA,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const toolName = request.params?.name;
    const selectedTool = TOOL_MAP.get(toolName);

    if (!selectedTool) {
      throw new McpError(ErrorCode.MethodNotFound, `Tool "${toolName}" not found`);
    }

    const input = request.params?.arguments && typeof request.params.arguments === 'object'
      ? request.params.arguments
      : {};

    try {
      const response = await selectedTool.handler(input, buildRequestMeta(defaultMeta, extra));

      if (response && typeof response === 'object' && response.error) {
        return toCallToolResult(response, true);
      }

      return toCallToolResult(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tool execution failed';
      return toCallToolResult({ error: message }, true);
    }
  });

  return server;
};

export default createHometeamServer;
