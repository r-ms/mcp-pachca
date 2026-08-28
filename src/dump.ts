import * as fs from "node:fs";
import * as path from "node:path";
import { loadSession } from "./auth.js";
import { PachcaClient } from "./client.js";
import type {
  PachcaChat,
  PachcaMessage,
} from "./tools/types.js";

interface ProfileResponse {
  id: number;
  role: string;
  [key: string]: unknown;
}

interface ThreadInfo {
  data: {
    id: number;
    chat_id: number;
    message_id: number;
    message_chat_id: number;
  };
}

function stderr(msg: string): void {
  process.stderr.write(msg);
}

function stderrln(msg = ""): void {
  process.stderr.write(msg + "\n");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function progressBar(current: number, total: number, width = 20): string {
  const ratio = Math.min(current / total, 1);
  const filled = Math.round(ratio * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function dateSuffix(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

let interrupted = false;

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable =
        /HTTP (429|5\d{2})/.test(msg) || msg.includes("timeout");
      if (attempt === retries || !isRetryable) throw err;
      const delay = 1000 * Math.pow(2, attempt - 1);
      stderrln(`  Retry ${attempt}/${retries} in ${delay}ms: ${msg}`);
      await sleep(delay);
    }
  }
  throw new Error("unreachable");
}

async function fetchAllChats(
  client: PachcaClient,
): Promise<PachcaChat[]> {
  // /chats?per=100 returns up to 100 chats where user is a member
  // API hard limit is 100 with no pagination support
  const res = await fetchWithRetry(() =>
    client.get<{ records: PachcaChat[] }>("/chats", { per: "100" }),
  );
  const chats = (res?.records ?? []) as PachcaChat[];
  stderrln(`  Found ${chats.length} chats`);
  if (chats.length === 100) {
    stderrln("  Warning: hit API limit of 100 chats — some chats may be missing");
  }
  return chats;
}

async function fetchAllMessages(
  client: PachcaClient,
  chatId: number,
  progressPrefix?: string,
): Promise<PachcaMessage[]> {
  const seen = new Map<number, PachcaMessage>();
  let anchorId: number | undefined;

  while (!interrupted) {
    const params: Record<string, string> = {
      chat_id: String(chatId),
      per: "100",
    };
    if (anchorId !== undefined) {
      params["message_id"] = String(anchorId);
      params["direction"] = "around";
    }

    const messages = await fetchWithRetry(() =>
      client.get<PachcaMessage[]>("/messages", params),
    );

    const batch = messages ?? [];
    if (!Array.isArray(batch) || batch.length === 0) break;

    for (const m of batch) {
      seen.set(m.id, m);
    }

    // Find the oldest message ID for next page
    const oldestId = batch.reduce((min, m) => m.id < min ? m.id : min, batch[0]!.id);
    if (oldestId === anchorId) break; // no progress — reached beginning
    anchorId = oldestId;

    // Update inline progress
    if (progressPrefix) {
      stderr(`\r  ${progressPrefix}: ${formatNumber(seen.size)}...`);
    }

    await sleep(100);
  }

  return [...seen.values()];
}

export async function runDump(outputDir?: string): Promise<void> {
  interrupted = false;
  const session = loadSession();
  if (!session) {
    stderrln("Error: No Pachca session found.");
    stderrln("Run: npx mcp-pachca --setup");
    process.exit(1);
  }

  const client = new PachcaClient(session);

  // Handle Ctrl+C gracefully
  const onInterrupt = (): void => {
    if (interrupted) {
      stderrln("\nForce quit.");
      process.exit(1);
    }
    interrupted = true;
    stderrln("\n\nInterrupted — saving what we have...");
  };
  process.on("SIGINT", onInterrupt);

  // Fetch profile
  const profile = await fetchWithRetry(() =>
    client.get<ProfileResponse>("/profile"),
  );

  // Try to get user name from /users endpoint
  let userName = "unknown";
  if (profile?.id) {
    try {
      type UserInfo = { name: string; last_name: string; display_name: string };
      const usersRes = await client.getWithArrayParams<{ data: UserInfo[] }>(
        "/users",
        { ids: [profile.id] },
      );
      const user = usersRes?.data?.[0];
      if (user) {
        userName = user.display_name || `${user.name} ${user.last_name}`.trim();
      }
    } catch {
      // Ignore — we'll use "unknown"
    }
  }

  stderrln(`Pachca dump — user: ${userName} (id: ${profile?.id ?? "?"})\n`);

  // Fetch all chats
  stderrln("Fetching chats...");
  const uniqueChats = await fetchAllChats(client);
  stderrln(`Total: ${uniqueChats.length} chats\n`);

  if (uniqueChats.length === 0) {
    stderrln("No chats found.");
    return;
  }

  // Create output directory
  const dir = outputDir ?? `pachca_dump_${dateSuffix()}`;
  const chatsDir = path.join(dir, "chats");
  const threadsDir = path.join(dir, "threads");
  fs.mkdirSync(chatsDir, { recursive: true });
  fs.mkdirSync(threadsDir, { recursive: true });

  // Save profile
  fs.writeFileSync(
    path.join(dir, "profile.json"),
    JSON.stringify({ ...profile, resolved_name: userName }, null, 2) + "\n",
  );

  // Load previous index for incremental mode
  const prevIndexPath = path.join(dir, "index.json");
  const prevCounts = new Map<number, number>();
  if (fs.existsSync(prevIndexPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(prevIndexPath, "utf8")) as Array<Record<string, unknown>>;
      for (const c of prev) {
        if (typeof c.id === "number" && typeof c.messages_count === "number") {
          prevCounts.set(c.id, c.messages_count);
        }
      }
    } catch {
      // Ignore — will re-download everything
    }
  }

  // Save chat index (always update with fresh data)
  fs.writeFileSync(
    path.join(dir, "index.json"),
    JSON.stringify(uniqueChats, null, 2) + "\n",
  );

  // Dump messages for each chat
  stderrln("Dumping messages...");
  let totalMessages = 0;
  let totalThreadMessages = 0;
  let totalThreads = 0;
  let skippedChats = 0;

  for (let i = 0; i < uniqueChats.length; i++) {
    if (interrupted) break;

    const chat = uniqueChats[i]!;
    const label = chat.name || (chat.personal ? `DM #${chat.id}` : `Chat #${chat.id}`);
    const progress = `[${i + 1}/${uniqueChats.length}]`;

    // Skip if messages_count unchanged and chat file already exists
    const chatFile = path.join(chatsDir, `${chat.id}.json`);
    const prevCount = prevCounts.get(chat.id);
    if (
      prevCount !== undefined &&
      chat.messages_count !== undefined &&
      prevCount === chat.messages_count &&
      fs.existsSync(chatFile)
    ) {
      skippedChats++;
      stderr(
        `\r  ${progress} ${label.slice(0, 40).padEnd(40)}  skipped (unchanged)\n`,
      );
      continue;
    }

    stderr(
      `\r  ${progress} ${label.slice(0, 40).padEnd(40)} ${progressBar(i, uniqueChats.length)} `,
    );

    try {
      const messages = await fetchAllMessages(client, chat.id, "Messages");
      totalMessages += messages.length;

      // Save messages (chronological order)
      messages.sort((a, b) => a.id - b.id);
      fs.writeFileSync(
        path.join(chatsDir, `${chat.id}.json`),
        JSON.stringify(messages, null, 2) + "\n",
      );

      // Collect thread IDs from messages
      const threadIds = new Set<number>();
      for (const m of messages) {
        if (m.thread_id && m.thread_message_count > 0) {
          threadIds.add(m.thread_id);
        }
      }

      // Fetch threads
      let chatThreadMsgs = 0;
      if (threadIds.size > 0) {
        const chatThreadsDir = path.join(threadsDir, String(chat.id));
        fs.mkdirSync(chatThreadsDir, { recursive: true });

        let tIdx = 0;
        for (const threadId of threadIds) {
          if (interrupted) break;
          tIdx++;

          try {
            // Get thread metadata to find the thread's chat_id
            const threadInfo = await fetchWithRetry(() =>
              client.get<ThreadInfo>(`/threads/${threadId}`),
            );
            const threadChatId = threadInfo?.data?.chat_id;
            if (!threadChatId) continue;

            stderr(`\r  ${progress} ${label.slice(0, 30).padEnd(30)} threads ${tIdx}/${threadIds.size}...`);

            const threadMsgs = await fetchAllMessages(client, threadChatId);
            threadMsgs.sort((a, b) => a.id - b.id);

            fs.writeFileSync(
              path.join(chatThreadsDir, `${threadId}.json`),
              JSON.stringify(threadMsgs, null, 2) + "\n",
            );

            chatThreadMsgs += threadMsgs.length;
            await sleep(100);
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            if (!/HTTP (403|404)/.test(errMsg)) {
              stderr(`\r  ${progress} thread ${threadId}: ${errMsg.slice(0, 60)}\n`);
            }
          }
        }

        totalThreads += threadIds.size;
        totalThreadMessages += chatThreadMsgs;
      }

      // Clear the line and show result
      const threadSuffix = chatThreadMsgs > 0
        ? ` + ${formatNumber(chatThreadMsgs)} in ${threadIds.size} threads`
        : "";
      stderr(
        `\r  ${progress} ${label.slice(0, 40).padEnd(40)} ${formatNumber(messages.length).padStart(8)} msgs${threadSuffix}\n`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stderr(
        `\r  ${progress} ${label.slice(0, 40).padEnd(40)} ERROR: ${msg.slice(0, 50)}\n`,
      );
    }

    await sleep(300);
  }

  const skippedSuffix = skippedChats > 0 ? `, ${skippedChats} skipped (unchanged)` : "";
  stderrln(
    `\nDone! ${uniqueChats.length} chats, ${formatNumber(totalMessages)} messages, ${formatNumber(totalThreads)} threads (${formatNumber(totalThreadMessages)} thread msgs)${skippedSuffix} → ./${dir}/`,
  );

  process.removeListener("SIGINT", onInterrupt);
}
