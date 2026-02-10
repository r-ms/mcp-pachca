export interface PachcaUser {
  id: number;
  first_name: string;
  last_name: string;
  nickname: string;
  email: string;
  phone_number: string | null;
  department: string | null;
  title: string | null;
  role: "admin" | "user" | "multi_guest";
  suspended: boolean;
  invite_status: "confirmed" | "sent";
  list_tags: string[];
  custom_properties: PachcaCustomProperty[];
  user_status: PachcaUserStatus | null;
  bot: boolean;
  sso: boolean;
  created_at: string;
  last_activity_at: string | null;
  time_zone: string;
  image_url: string | null;
}

export interface PachcaCustomProperty {
  id: number;
  name: string;
  data_type: string;
  value: string;
}

export interface PachcaUserStatus {
  emoji: string;
  title: string;
  expires_at: string | null;
}

export interface PachcaChat {
  id: number;
  name: string;
  owner_id: number;
  created_at: string;
  member_ids: number[];
  group_tag_ids: number[];
  channel: boolean;
  personal: boolean;
  public: boolean;
  last_message_at: string | null;
  meet_room_url: string | null;
}

export interface PachcaMessage {
  id: number;
  entity_type: "discussion" | "thread" | "user";
  entity_id: number;
  chat_id: number;
  content: string;
  user_id: number;
  created_at: string;
  url: string;
  files: PachcaFile[];
  thread: PachcaThreadRef | null;
  parent_message_id: number | null;
}

export interface PachcaFile {
  id: number;
  key: string;
  name: string;
  file_type: "file" | "image";
  url: string;
}

export interface PachcaThreadRef {
  id: number;
  chat_id: number;
  message_id: number;
  message_chat_id: number;
  updated_at: string;
}

export interface PachcaThread {
  id: number;
  chat_id: number;
  message_id: number;
  message_chat_id: number;
  updated_at: string;
}

export interface PachcaTag {
  id: number;
  name: string;
  users_count: number;
}

export interface CursorPaginatedResponse<T> {
  meta: { paginate: { next_page: string | null } };
  data: T[];
}

export interface PagePaginatedResponse<T> {
  data: T[];
}

export interface SingleResponse<T> {
  data: T;
}
