#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { logger } from "./logger.js";

async function main(): Promise<void> {
  const token = process.env["PACHCA_ACCESS_TOKEN"];
  if (!token) {
    logger.error("PACHCA_ACCESS_TOKEN environment variable is required");
    process.exit(1);
  }

  const server = createServer(token);
  const transport = new StdioServerTransport();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down`);
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await server.connect(transport);
  logger.info("MCP Pachca server started");
}

main().catch((err: unknown) => {
  logger.error("Fatal error", err);
  process.exit(1);
});
