#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { loadSession } from "./auth.js";
import { logger } from "./logger.js";
import { runSetup } from "./setup.js";

async function main(): Promise<void> {
  if (process.argv[2] === "--setup") {
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

  process.on("SIGINT", () =>
    shutdown("SIGINT").catch((err) => {
      logger.error("Error during shutdown", { error: String(err) });
      process.exit(1);
    }),
  );
  process.on("SIGTERM", () =>
    shutdown("SIGTERM").catch((err) => {
      logger.error("Error during shutdown", { error: String(err) });
      process.exit(1);
    }),
  );

  await server.connect(transport);
  logger.info("MCP Pachca server started");
}

main().catch((err: unknown) => {
  logger.error("Fatal error", err);
  process.exit(1);
});
