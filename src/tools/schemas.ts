import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const toolDefinitions: Tool[] = [
  {
    name: "pachca_search_users",
    description:
      "Search for users in Pachca by name or email. Returns matching users with cursor-based pagination.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query (name or email)",
        },
        cursor: {
          type: "string",
          description: "Pagination cursor from previous response",
        },
      },
      required: ["query"],
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
      "List chats organized by folder. First call without folder to see available folders, then specify a folder kind to list its chats.",
    inputSchema: {
      type: "object" as const,
      properties: {
        folder: {
          type: "string",
          enum: ["pinned", "team", "personal"],
          description:
            "Folder kind to list chats from. Omit to get the list of available folders.",
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
    description: "Get members of a chat.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Chat ID" },
        limit: {
          type: "number",
          description: "Max results per page (default 30)",
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
      "List messages in a chat. Uses anchor-based pagination: provide message_id + direction to page through history.",
    inputSchema: {
      type: "object" as const,
      properties: {
        chat_id: { type: "number", description: "Chat ID" },
        per: {
          type: "number",
          description: "Messages per page (default 30)",
        },
        message_id: {
          type: "number",
          description: "Anchor message ID for pagination",
        },
        direction: {
          type: "string",
          enum: ["before", "after", "around"],
          description: "Pagination direction relative to message_id",
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
    name: "pachca_send_message",
    description: "Send a message to a chat in Pachca.",
    inputSchema: {
      type: "object" as const,
      properties: {
        chat_id: { type: "number", description: "Chat ID to send message to" },
        text: { type: "string", description: "Message text" },
        parent_message_id: {
          type: "number",
          description: "Reply to a specific message ID",
        },
      },
      required: ["chat_id", "text"],
    },
  },
  {
    name: "pachca_search",
    description:
      "Full-text search for messages across all chats. Returns matching messages with cursor-based pagination.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
        cursor: {
          type: "string",
          description: "Pagination cursor from previous response",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "pachca_get_profile",
    description: 'Get the current authenticated user\'s profile ("who am I").',
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "pachca_get_unread",
    description: "Get list of chat IDs that have unread messages.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "pachca_get_presence",
    description: "Get online/offline status for one or more users.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ids: {
          type: "array",
          items: { type: "number" },
          description: "User IDs to check presence for",
        },
      },
      required: ["ids"],
    },
  },
  {
    name: "pachca_get_personal_chat",
    description:
      "Resolve a user ID to their personal (DM) chat ID. Use this before sending a direct message to a user.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "User ID" },
      },
      required: ["id"],
    },
  },
];
