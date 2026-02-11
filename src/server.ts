import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Session } from "./auth.js";
import { PachcaClient } from "./client.js";
import { toolDefinitions } from "./tools/schemas.js";
import { handlerRegistry } from "./tools/handlers.js";
import { logger } from "./logger.js";

export function createServer(session: Session): Server {
  const client = new PachcaClient(session);

  const server = new Server(
    { name: "mcp-pachca", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefinitions,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const handler = handlerRegistry[name];

    if (!handler) {
      return {
        content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    try {
      const result = await handler(client, (args ?? {}) as Record<string, unknown>);
      const text = JSON.stringify(result, null, 2);
      return { content: [{ type: "text" as const, text }] };
    } catch (err) {
      logger.error("Tool call failed", { tool: name, error: String(err) });
      const message =
        err instanceof Error ? err.message : "Unknown error during tool call";
      return {
        content: [{ type: "text" as const, text: message }],
        isError: true,
      };
    }
  });

  return server;
}
