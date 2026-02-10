# mcp-pachca

MCP server for [Pachca](https://pachca.com) corporate messenger. Enables Claude Code (and other MCP clients) to read chats, users, messages and send messages via Pachca REST API.

## Setup

Add to your MCP client configuration (e.g. `~/.claude/settings.json` or `.mcp.json`):

```json
{
  "mcpServers": {
    "pachca": {
      "command": "npx",
      "args": ["-y", "git+https://github.com/r-ms/mcp-pachca.git"],
      "env": {
        "PACHCA_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

Get your access token in Pachca: **Settings > API access tokens**.

## Tools

| Tool | Description |
|------|-------------|
| `pachca_list_users` | List workspace users (search, pagination) |
| `pachca_get_user` | Get user by ID |
| `pachca_list_chats` | List chats/channels (filter, sort, pagination) |
| `pachca_get_chat` | Get chat by ID |
| `pachca_get_chat_members` | Get chat members (role filter, pagination) |
| `pachca_list_messages` | List messages in a chat (pagination) |
| `pachca_get_message` | Get message by ID |
| `pachca_list_tags` | List group tags (pagination) |
| `pachca_get_thread` | Get thread details |
| `pachca_send_message` | Send message to chat/user/thread |

## Development

```bash
npm install
npm run build
PACHCA_ACCESS_TOKEN=xxx node dist/index.js
```

## License

MIT
