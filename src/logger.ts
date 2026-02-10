export interface Logger {
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
  debug(message: string, data?: unknown): void;
}

function formatLog(level: string, message: string, data?: unknown): string {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg: message,
  };
  if (data !== undefined) {
    entry["data"] = data;
  }
  return JSON.stringify(entry);
}

export const logger: Logger = {
  info(message, data) {
    process.stderr.write(formatLog("info", message, data) + "\n");
  },
  warn(message, data) {
    process.stderr.write(formatLog("warn", message, data) + "\n");
  },
  error(message, data) {
    process.stderr.write(formatLog("error", message, data) + "\n");
  },
  debug(message, data) {
    process.stderr.write(formatLog("debug", message, data) + "\n");
  },
};
