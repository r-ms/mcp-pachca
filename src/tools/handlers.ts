import type { PachcaClient } from "../client.js";
import type {
  CursorPaginatedResponse,
  PagePaginatedResponse,
  SingleResponse,
  PachcaUser,
  PachcaChat,
  PachcaMessage,
  PachcaTag,
  PachcaThread,
} from "./types.js";

type HandlerFn = (
  client: PachcaClient,
  args: Record<string, unknown>,
) => Promise<unknown>;

async function handleListUsers(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  const params: Record<string, string> = {};
  if (args["query"]) params["query"] = String(args["query"]);
  if (args["limit"]) params["limit"] = String(args["limit"]);
  if (args["cursor"]) params["cursor"] = String(args["cursor"]);
  return client.get<CursorPaginatedResponse<PachcaUser>>("/users", params);
}

async function handleGetUser(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  return client.get<SingleResponse<PachcaUser>>(`/users/${args["id"]}`);
}

async function handleListChats(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  const params: Record<string, string> = {};
  if (args["availability"]) params["availability"] = String(args["availability"]);
  if (args["limit"]) params["limit"] = String(args["limit"]);
  if (args["cursor"]) params["cursor"] = String(args["cursor"]);
  if (args["personal"] !== undefined) params["personal"] = String(args["personal"]);
  if (args["sort"]) {
    const sort = String(args["sort"]);
    if (sort.startsWith("id_")) {
      params["sort[id]"] = sort.replace("id_", "");
    } else if (sort.startsWith("last_message_at_")) {
      params["sort[last_message_at]"] = sort.replace("last_message_at_", "");
    }
  }
  return client.get<CursorPaginatedResponse<PachcaChat>>("/chats", params);
}

async function handleGetChat(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  return client.get<SingleResponse<PachcaChat>>(`/chats/${args["id"]}`);
}

async function handleGetChatMembers(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  const params: Record<string, string> = {};
  if (args["role"]) params["role"] = String(args["role"]);
  if (args["limit"]) params["limit"] = String(args["limit"]);
  if (args["cursor"]) params["cursor"] = String(args["cursor"]);
  return client.get<CursorPaginatedResponse<PachcaUser>>(
    `/chats/${args["id"]}/members`,
    params,
  );
}

async function handleListMessages(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  const params: Record<string, string> = {
    chat_id: String(args["chat_id"]),
  };
  if (args["per"]) params["per"] = String(args["per"]);
  if (args["page"]) params["page"] = String(args["page"]);
  return client.get<PagePaginatedResponse<PachcaMessage>>("/messages", params);
}

async function handleGetMessage(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  return client.get<SingleResponse<PachcaMessage>>(`/messages/${args["id"]}`);
}

async function handleListTags(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  const params: Record<string, string> = {};
  if (args["per"]) params["per"] = String(args["per"]);
  if (args["page"]) params["page"] = String(args["page"]);
  return client.get<PagePaginatedResponse<PachcaTag>>("/group_tags", params);
}

async function handleGetThread(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  return client.get<SingleResponse<PachcaThread>>(`/threads/${args["id"]}`);
}

async function handleSendMessage(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  const message: Record<string, unknown> = {
    entity_id: args["entity_id"],
    content: args["content"],
  };
  if (args["entity_type"]) message["entity_type"] = args["entity_type"];
  if (args["parent_message_id"])
    message["parent_message_id"] = args["parent_message_id"];
  return client.post<SingleResponse<PachcaMessage>>("/messages", { message });
}

export const handlerRegistry: Record<string, HandlerFn> = {
  pachca_list_users: handleListUsers,
  pachca_get_user: handleGetUser,
  pachca_list_chats: handleListChats,
  pachca_get_chat: handleGetChat,
  pachca_get_chat_members: handleGetChatMembers,
  pachca_list_messages: handleListMessages,
  pachca_get_message: handleGetMessage,
  pachca_list_tags: handleListTags,
  pachca_get_thread: handleGetThread,
  pachca_send_message: handleSendMessage,
};
