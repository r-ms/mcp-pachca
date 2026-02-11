#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { loadSession } from "./auth.js";
import { logger } from "./logger.js";
import { runSetup } from "./setup.js";

async function main(): Promise<void> {
  if (process.argv.includes("--setup")) {
    await runSetup();
    process.exit(0);
  }

  const session = loadSession();
  if (!session) {
    logger.error("No session found. Run: npx mcp-pachca --setup");
    process.exit(1);
  }

  const server = createServer(session);
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
