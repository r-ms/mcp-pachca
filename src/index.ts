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

  if (process.argv[2] === "--dump") {
    process.env["MCP_PACHCA_QUIET"] = "1";
    const { runDump } = await import("./dump.js");
    await runDump(process.argv[3]);
    process.exit(0);
  }

  if (process.argv[2] === "--convert") {
    if (!process.argv[3]) {
      process.stderr.write("Usage: mcp-pachca --convert <dump_directory>\n");
      process.stderr.write("Example: mcp-pachca --convert ./pachca_dump_20260324\n");
      process.exit(1);
    }
    const { runConvert } = await import("./convert.js");
    runConvert(process.argv[3]);
    process.exit(0);
  }

  const session = loadSession();
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
