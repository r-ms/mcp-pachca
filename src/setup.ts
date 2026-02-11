import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as rl from "node:readline/promises";
import { requestOTP, performLogin, saveSession } from "./auth.js";

const CLIENTS = ["Claude Code", "Cursor"] as const;
type Client = (typeof CLIENTS)[number];

const SCOPES = ["Project", "Global"] as const;
type Scope = (typeof SCOPES)[number];

function stderr(msg: string): void {
  process.stderr.write(msg);
}

function stderrln(msg: string = ""): void {
  process.stderr.write(msg + "\n");
}

// --- Prompt helpers ---

/** Collect all lines from a non-TTY stdin upfront (avoids readline buffering issues). */
function readAllLines(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const lines: string[] = [];
    const iface = rl.createInterface({ input: process.stdin });
    iface.on("line", (line) => lines.push(line));
    iface.on("close", () => resolve(lines));
    iface.on("error", (err) => {
      iface.close();
      reject(err);
    });
  });
}

/** Simple line-based prompter backed by a pre-read array (non-TTY). */
function makePipePrompter(lines: string[]) {
  let idx = 0;
  return {
    ask(question: string): string {
      stderr(question);
      if (idx >= lines.length) {
        stderrln("\nError: not enough input lines.");
        process.exit(1);
      }
      const answer = lines[idx++]!.trim();
      stderrln(answer);
      return answer;
    },
  };
}

/** Interactive TTY prompter using readline/promises. */
function makeTTYPrompter() {
  const iface = rl.createInterface({ input: process.stdin, output: process.stderr });
  return {
    async ask(question: string): Promise<string> {
      const answer = await iface.question(question);
      return answer.trim();
    },
    close() {
      iface.close();
    },
  };
}

// --- Choice helper ---

async function askChoice<T extends string>(
  ask: (q: string) => string | Promise<string>,
  question: string,
  choices: readonly T[],
  retry = true,
): Promise<T> {
  stderrln(question);
  for (let i = 0; i < choices.length; i++) {
    stderrln(`  ${i + 1}) ${choices[i]}`);
  }
  while (true) {
    const raw = await ask("Enter choice: ");
    const n = parseInt(raw, 10);
    if (n >= 1 && n <= choices.length) {
      return choices[n - 1]!;
    }
    if (!retry) {
      stderrln(`Error: invalid choice "${raw}". Expected a number between 1 and ${choices.length}.`);
      process.exit(1);
    }
    stderrln(`Please enter a number between 1 and ${choices.length}.`);
  }
}

// --- Config helpers ---

function resolveConfigPath(client: Client, scope: Scope): string {
  if (client === "Claude Code") {
    return scope === "Project"
      ? path.join(process.cwd(), ".mcp.json")
      : path.join(os.homedir(), ".mcp.json");
  }
  // Cursor
  return scope === "Project"
    ? path.join(process.cwd(), ".cursor", "mcp.json")
    : path.join(os.homedir(), ".cursor", "mcp.json");
}

function buildEntry(): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    type: "stdio",
    command: "npx",
    args: ["-y", "mcp-pachca@latest"],
  };
  if (process.env["DEBUG"]) {
    entry["env"] = { DEBUG: "1" };
  }
  return entry;
}

// --- Main ---

export async function runSetup(): Promise<void> {
  stderrln("mcp-pachca setup wizard\n");

  let client: Client;
  let scope: Scope;
  let email: string;
  let code: string;

  if (!process.stdin.isTTY) {
    stderrln("Error: --setup requires an interactive terminal (OTP code is sent via email).");
    process.exit(1);
  }

  const prompter = makeTTYPrompter();
  try {
    client = await askChoice(prompter.ask, "Select your MCP client:", CLIENTS);
    scope = await askChoice(prompter.ask, "Select config scope:", SCOPES);

    email = await prompter.ask("Enter your Pachca email: ");
    if (!email || !email.includes("@")) {
      stderrln("Error: invalid email address.");
      process.exit(1);
    }

    stderrln("\nRequesting login code...");
    await requestOTP(email);
    stderrln("Check your email for the 6-digit code.");

    code = await prompter.ask("Enter the code: ");
  } finally {
    prompter.close();
  }

  if (!code || !/^\d{6}$/.test(code)) {
    stderrln("Error: code must be exactly 6 digits.");
    process.exit(1);
  }

  stderrln("Logging in...");
  let session;
  try {
    session = await performLogin(email, code);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    stderrln(`\nLogin failed: ${msg}`);
    process.exit(1);
  }
  saveSession(session);
  stderrln(`Session saved to ~/.config/mcp-pachca/session.json`);

  // Write MCP config
  const configPath = resolveConfigPath(client, scope);
  const dir = path.dirname(configPath);
  fs.mkdirSync(dir, { recursive: true });

  let config: Record<string, unknown>;
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf8");
    try {
      config = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      stderrln(
        `Error: ${configPath} contains malformed JSON. Fix it manually before re-running setup.`,
      );
      process.exit(1);
    }
  } else {
    config = {};
  }

  const raw = config["mcpServers"];
  const servers = (raw !== null && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  servers["pachca"] = buildEntry();
  config["mcpServers"] = servers;

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");

  stderrln(`\nConfig written to ${configPath}`);
  stderrln("Restart your MCP client to apply changes.");
}
