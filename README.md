# mcp-pachca

MCP-сервер для корпоративного мессенджера [Pachca](https://pachca.com). Позволяет Claude Code, Cursor и другим MCP-клиентам читать чаты, искать сообщения, просматривать пользователей и отправлять сообщения.

## Установка

```bash
npx mcp-pachca --setup
```

Мастер настройки:
1. Выберите MCP-клиент (Claude Code / Cursor)
2. Выберите область конфигурации (проект / глобально)
3. Введите email от Pachca
4. Введите 6-значный код из письма

Сессия сохраняется в `~/.config/mcp-pachca/session.json`, конфигурация MCP записывается автоматически.

### Ручная конфигурация

Если мастер уже пройден, можно добавить сервер вручную в `.mcp.json`:

```json
{
  "mcpServers": {
    "pachca": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-pachca@latest"]
    }
  }
}
```

## Инструменты

| Инструмент | Описание |
|---|---|
| `pachca_search_users` | Поиск пользователей по имени или email |
| `pachca_get_user` | Получить пользователя по ID |
| `pachca_list_chats` | Список чатов по папкам (pinned / team / personal) |
| `pachca_get_chat` | Получить чат по ID |
| `pachca_get_chat_members` | Участники чата |
| `pachca_list_messages` | Сообщения в чате (anchor-based пагинация) |
| `pachca_get_message` | Получить сообщение по ID |
| `pachca_send_message` | Отправить сообщение в чат |
| `pachca_search` | Полнотекстовый поиск по сообщениям |
| `pachca_get_profile` | Текущий пользователь ("кто я") |
| `pachca_get_unread` | Чаты с непрочитанными сообщениями |
| `pachca_get_presence` | Онлайн-статус пользователей |
| `pachca_get_personal_chat` | Найти личный чат с пользователем по его ID |

## Разработка

```bash
git clone https://github.com/r-ms/mcp-pachca.git
cd mcp-pachca
npm install
npm run build
node dist/index.js --setup   # авторизация
node dist/index.js            # запуск сервера
```

Для отладки запросов к API:

```bash
DEBUG=1 node dist/index.js
```

## Лицензия

MIT
