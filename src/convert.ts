import * as fs from "node:fs";
import * as path from "node:path";

function stderrln(msg = ""): void {
  process.stderr.write(msg + "\n");
}

interface ChatIndex {
  id: number;
  name: string;
  personal: boolean;
  channel: boolean;
  [key: string]: unknown;
}

interface RawMessage {
  id: number;
  text: string | null;
  content: string | null;  // v3 API uses "content" instead of "text"
  user_id: number;
  chat_id: number;
  created_at: string;
  updated_at: string | null;
  thread_id: number | null;
  thread_message_count: number;
  parent_message_id: number | null;
  pinned: boolean;
  files: Array<{ name: string; url: string; file_type: string }>;
  reactions: Array<{ code: string; user_ids: number[] }>;
  [key: string]: unknown;
}

interface ThreadReply {
  id: number;
  user_id: number;
  text: string;
  created_at: string;
  has_files: boolean;
  file_names: string[];
}

interface ConvertedMessage {
  id: number;
  user_id: number;
  text: string;
  created_at: string;
  has_files: boolean;
  file_names: string[];
  reactions: string[];
  pinned: boolean;
  thread?: ThreadReply[];
}

function sanitizeName(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 100);
}

function toReply(m: RawMessage): ThreadReply {
  return {
    id: m.id,
    user_id: m.user_id,
    text: m.content ?? m.text ?? "",
    created_at: m.created_at,
    has_files: (m.files?.length ?? 0) > 0,
    file_names: (m.files ?? []).map((f) => f.name),
  };
}

function toConverted(m: RawMessage): ConvertedMessage {
  return {
    id: m.id,
    user_id: m.user_id,
    text: m.content ?? m.text ?? "",
    created_at: m.created_at,
    has_files: (m.files?.length ?? 0) > 0,
    file_names: (m.files ?? []).map((f) => f.name),
    reactions: (m.reactions ?? []).map((r) => r.code),
    pinned: m.pinned,
  };
}

export function runConvert(dumpDir: string): void {
  if (!fs.existsSync(dumpDir)) {
    stderrln(`Error: Directory not found: ${dumpDir}`);
    process.exit(1);
  }

  const indexPath = path.join(dumpDir, "index.json");
  if (!fs.existsSync(indexPath)) {
    stderrln(`Error: index.json not found in ${dumpDir}`);
    stderrln("Make sure this is a valid pachca dump directory.");
    process.exit(1);
  }

  const chats: ChatIndex[] = JSON.parse(fs.readFileSync(indexPath, "utf8"));

  const outDir = path.join(dumpDir, "converted");
  fs.mkdirSync(outDir, { recursive: true });

  let totalChats = 0;
  let totalMessages = 0;
  let totalThreadMessages = 0;

  const chatsDir = path.join(dumpDir, "chats");
  const threadsDir = path.join(dumpDir, "threads");

  for (const chat of chats) {
    const chatFile = path.join(chatsDir, `${chat.id}.json`);
    if (!fs.existsSync(chatFile)) continue;

    const messages: RawMessage[] = JSON.parse(
      fs.readFileSync(chatFile, "utf8"),
    );

    // Load all threads for this chat into a map: thread_id → messages[]
    const threadMessages = new Map<number, RawMessage[]>();
    const chatThreadsDir = path.join(threadsDir, String(chat.id));
    if (fs.existsSync(chatThreadsDir)) {
      for (const tf of fs.readdirSync(chatThreadsDir)) {
        if (!tf.endsWith(".json")) continue;
        const threadId = parseInt(tf.replace(".json", ""), 10);
        const tMsgs: RawMessage[] = JSON.parse(
          fs.readFileSync(path.join(chatThreadsDir, tf), "utf8"),
        );
        tMsgs.sort((a, b) => a.id - b.id);
        threadMessages.set(threadId, tMsgs);
      }
    }

    // Build JSONL: one line per message, thread replies inlined
    const safeName = sanitizeName(chat.name || `chat_${chat.id}`);
    const outPath = path.join(outDir, `${chat.id}_${safeName}.json`);
    messages.sort((a, b) => a.id - b.id);

    const lines: string[] = [];
    for (const m of messages) {
      const converted = toConverted(m);

      // Attach thread replies inline
      if (m.thread_id && m.thread_message_count > 0) {
        const replies = threadMessages.get(m.thread_id);
        if (replies && replies.length > 0) {
          converted.thread = replies.map(toReply);
          totalThreadMessages += replies.length;
        }
      }

      lines.push(JSON.stringify(converted));
      totalMessages++;
    }

    fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
    totalChats++;

    const threadCount = threadMessages.size;
    const threadSuffix = threadCount > 0 ? ` (${threadCount} threads)` : "";
    stderrln(`  ${chat.id}_${safeName}.json — ${messages.length} msgs${threadSuffix}`);
  }

  stderrln("");
  stderrln(`Converted ${totalChats} chats → ${outDir}/`);
  stderrln(`  Messages:        ${totalMessages.toLocaleString("en-US")}`);
  stderrln(`  Thread replies:  ${totalThreadMessages.toLocaleString("en-US")}`);
}
