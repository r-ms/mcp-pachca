export interface PachcaUser {
  id: number;
  name: string;
  display_name: string;
  last_name: string;
  email: string;
  avatar_color: string;
  company_role: string | null;
  department: string | null;
  title: string | null;
  role: string;
  suspended: boolean;
  bot: boolean;
  last_seen: string | null;
  time_zone: string;
  image_url: string | null;
}

export interface PachcaChat {
  id: number;
  name: string;
  token: string;
  chat_subtype: string | null;
  channel: boolean;
  personal: boolean;
  public: boolean;
  is_member: boolean;
  personal_interlocutor: number | null;
  avatar_color: string | null;
  avatar_url: string | null;
  workspace_id: number;
  last_message_at: string | null;
  created_at: string;
  meet_room_url: string | null;
}

export interface PachcaMessage {
  id: number;
  uuid: string;
  text: string;
  markup: string | null;
  kind: string;
  user_id: number;
  chat_id: number;
  created_at: string;
  updated_at: string | null;
  pinned: boolean;
  important: boolean;
  thread_id: number | null;
  thread_message_count: number;
  parent_message_id: number | null;
  reactions: PachcaReaction[];
  files: PachcaFile[];
  link_previews: PachcaLinkPreview[];
}

export interface PachcaReaction {
  code: string;
  user_ids: number[];
}

export interface PachcaFile {
  id: number;
  key: string;
  name: string;
  file_type: string;
  url: string;
}

export interface PachcaLinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
}

export interface PachcaThread {
  id: number;
  chat_id: number;
  message_id: number;
  message_chat_id: number;
  updated_at: string;
}

export interface PachcaFolder {
  id: number;
  title: string;
  kind: "pinned" | "team" | "personal";
}

export interface PachcaPaginate {
  cursor: string | null;
  has_next: boolean;
}

export interface PachcaSearchResult<T> {
  records: T[];
  paginate: PachcaPaginate;
}

export interface PachcaPresence {
  id: number;
  status: "online" | "offline";
}

export interface PachcaReadInfo {
  id: number;
  unread_message_counter: number;
  unread: boolean;
  mentioned: boolean;
  last_read_message_id: number | null;
  last_message_id: number | null;
}

export interface PachcaProfile {
  id: number;
  name: string;
  display_name: string;
  last_name: string;
  email: string;
  avatar_color: string;
  company_role: string | null;
  department: string | null;
  title: string | null;
  time_zone: string;
  image_url: string | null;
}
