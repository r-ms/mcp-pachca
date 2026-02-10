import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const toolDefinitions: Tool[] = [
  {
    name: "pachca_list_users",
    description:
      "List users (employees) in Pachca workspace. Supports search by name/email/nickname and cursor-based pagination.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Search by first_name, last_name, email, phone_number, or nickname",
        },
        limit: {
          type: "number",
          description: "Results per page (max 50, default 50)",
        },
        cursor: {
          type: "string",
          description: "Pagination cursor from previous response",
        },
      },
    },
  },
  {
    name: "pachca_get_user",
    description: "Get a single user by ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "User ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "pachca_list_chats",
    description:
      "List chats (discussions, channels) in Pachca. Supports filtering and cursor-based pagination.",
    inputSchema: {
      type: "object" as const,
      properties: {
        availability: {
          type: "string",
          enum: ["is_member", "public"],
          description:
            "Filter: is_member (default) = chats you belong to, public = public chats",
        },
        sort: {
          type: "string",
          enum: ["id_asc", "id_desc", "last_message_at_asc", "last_message_at_desc"],
          description: "Sort order (default: last_message_at_desc)",
        },
        personal: {
          type: "boolean",
          description: "true = personal chats only, false = group chats only",
        },
        limit: {
          type: "number",
          description: "Results per page (max 50, default 50)",
        },
        cursor: {
          type: "string",
          description: "Pagination cursor from previous response",
        },
      },
    },
  },
  {
    name: "pachca_get_chat",
    description: "Get a single chat by ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Chat ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "pachca_get_chat_members",
    description:
      "Get members of a chat. Supports role filtering and cursor-based pagination.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Chat ID" },
        role: {
          type: "string",
          enum: ["all", "owner", "admin", "editor", "member"],
          description: "Filter by role (default: all)",
        },
        limit: {
          type: "number",
          description: "Results per page (max 50, default 50)",
        },
        cursor: {
          type: "string",
          description: "Pagination cursor from previous response",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "pachca_list_messages",
    description:
      "List messages in a chat. Uses page-based pagination. Returns newest messages first by default.",
    inputSchema: {
      type: "object" as const,
      properties: {
        chat_id: { type: "number", description: "Chat ID (required)" },
        per: {
          type: "number",
          description: "Results per page (max 50, default 25)",
        },
        page: {
          type: "number",
          description: "Page number (default 1)",
        },
      },
      required: ["chat_id"],
    },
  },
  {
    name: "pachca_get_message",
    description: "Get a single message by ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Message ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "pachca_list_tags",
    description:
      "List group tags in Pachca workspace. Uses page-based pagination.",
    inputSchema: {
      type: "object" as const,
      properties: {
        per: {
          type: "number",
          description: "Results per page (max 50, default 25)",
        },
        page: {
          type: "number",
          description: "Page number (default 1)",
        },
      },
    },
  },
  {
    name: "pachca_get_thread",
    description: "Get thread details by ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Thread ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "pachca_send_message",
    description:
      "Send a message to a chat, user, or thread in Pachca.",
    inputSchema: {
      type: "object" as const,
      properties: {
        entity_id: {
          type: "number",
          description: "Target ID: chat ID, user ID, or thread ID",
        },
        content: { type: "string", description: "Message text" },
        entity_type: {
          type: "string",
          enum: ["discussion", "user", "thread"],
          description:
            "Target type: discussion (chat, default), user (DM), thread",
        },
        parent_message_id: {
          type: "number",
          description: "Reply to a specific message ID",
        },
      },
      required: ["entity_id", "content"],
    },
  },
];
