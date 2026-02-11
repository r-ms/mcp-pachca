import { randomUUID } from "node:crypto";
import type { PachcaClient } from "../client.js";
import type {
  PachcaUser,
  PachcaChat,
  PachcaMessage,
  PachcaFolder,
  PachcaProfile,
  PachcaPresence,
  PachcaSearchResult,
  PachcaPaginate,
} from "./types.js";

type HandlerFn = (
  client: PachcaClient,
  args: Record<string, unknown>,
) => Promise<unknown>;

async function handleSearchUsers(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  const params: Record<string, string> = {
    type: "user",
    query: String(args["query"]),
  };
  if (args["cursor"]) params["cursor"] = String(args["cursor"]);
  return client.get<PachcaSearchResult<PachcaUser>>("/search", params);
}

async function handleGetUser(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  const data = await client.getWithArrayParams<{ data: PachcaUser[] }>(
    "/users",
    { ids: [Number(args["id"])] },
  );
  if (!data?.data?.length) throw new Error(`User ${args["id"]} not found`);
  return data.data[0];
}

async function handleListChats(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  const folders = await client.get<PachcaFolder[]>("/menu/folders");

  const folderKind = args["folder"] as string | undefined;
  if (!folderKind) {
    return {
      folders: folders?.map((f) => ({
        id: f.id,
        title: f.title,
        kind: f.kind,
      })),
    };
  }

  const folder = folders?.find((f) => f.kind === folderKind);
  if (!folder) {
    return {
      error: `Folder "${folderKind}" not found`,
      available: folders?.map((f) => f.kind),
    };
  }

  const params: Record<string, string> = {};
  if (args["cursor"]) params["cursor"] = String(args["cursor"]);

  return client.get<{ records: PachcaChat[]; paginate: PachcaPaginate }>(
    `/menu/folders/${folder.id}/chats`,
    params,
  );
}

async function handleGetChat(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  const data = await client.getWithArrayParams<{ records: PachcaChat[] }>(
    "/chats",
    { ids: [Number(args["id"])] },
  );
  if (!data?.records?.length) throw new Error(`Chat ${args["id"]} not found`);
  return data.records[0];
}

async function handleGetChatMembers(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  const params: Record<string, string> = {};
  if (args["limit"]) params["limit"] = String(args["limit"]);
  if (args["cursor"]) params["cursor"] = String(args["cursor"]);
  return client.get<{
    users: PachcaUser[];
    total_users: number;
    paginate: PachcaPaginate;
  }>(`/chats/${args["id"]}/users`, params);
}

async function handleListMessages(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  const params: Record<string, string> = {
    chat_id: String(args["chat_id"]),
  };
  if (args["per"]) params["per"] = String(args["per"]);
  if (args["message_id"]) params["message_id"] = String(args["message_id"]);
  if (args["direction"]) params["direction"] = String(args["direction"]);
  return client.get<PachcaMessage[]>("/messages", params);
}

async function handleGetMessage(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  const data = await client.getWithArrayParams<PachcaMessage[]>("/messages", {
    ids: [Number(args["id"])],
  });
  if (!data?.length) throw new Error(`Message ${args["id"]} not found`);
  return data[0];
}

async function handleSendMessage(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  const body: Record<string, unknown> = {
    chat_id: Number(args["chat_id"]),
    text: String(args["text"]),
    uuid: randomUUID(),
  };
  if (args["parent_message_id"]) {
    body["parent_message_id"] = Number(args["parent_message_id"]);
  }
  const result = await client.post<PachcaMessage>("/messages", body);
  return result ?? { success: true };
}

async function handleSearch(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  const params: Record<string, string> = {
    type: "message",
    query: String(args["query"]),
  };
  if (args["cursor"]) params["cursor"] = String(args["cursor"]);
  return client.get<PachcaSearchResult<PachcaMessage>>("/search", params);
}

async function handleGetProfile(client: PachcaClient): Promise<unknown> {
  return client.get<PachcaProfile>("/profile");
}

async function handleGetUnread(client: PachcaClient): Promise<unknown> {
  return client.get<number[]>("/chats/unread_ids");
}

async function handleGetPresence(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  const ids = args["ids"] as number[];
  return client.getWithArrayParams<PachcaPresence[]>("/friends/presence", {
    ids,
  });
}

async function handleGetPersonalChat(
  client: PachcaClient,
  args: Record<string, unknown>,
): Promise<unknown> {
  return client.getWithArrayParams<Record<string, number>>(
    "/users/personal_chats",
    { ids: [Number(args["id"])] },
  );
}

export const handlerRegistry: Record<string, HandlerFn> = {
  pachca_search_users: handleSearchUsers,
  pachca_get_user: handleGetUser,
  pachca_list_chats: handleListChats,
  pachca_get_chat: handleGetChat,
  pachca_get_chat_members: handleGetChatMembers,
  pachca_list_messages: handleListMessages,
  pachca_get_message: handleGetMessage,
  pachca_send_message: handleSendMessage,
  pachca_search: handleSearch,
  pachca_get_profile: handleGetProfile,
  pachca_get_unread: handleGetUnread,
  pachca_get_presence: handleGetPresence,
  pachca_get_personal_chat: handleGetPersonalChat,
};
