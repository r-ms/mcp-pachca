import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { logger } from "./logger.js";

export interface Session {
  email: string;
  jwt: string;
  workspaceJwt: string;
  profileId: number;
  companyId: number;
  cookies: string[];
  createdAt: string;
}

const BASE_URL = "https://app.pachca.com/api/v3";

export function getSessionPath(): string {
  return path.join(os.homedir(), ".config", "mcp-pachca", "session.json");
}

export function loadSession(): Session | null {
  const p = getSessionPath();
  try {
    const raw = fs.readFileSync(p, "utf8");
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof data.email !== "string" ||
      typeof data.jwt !== "string" ||
      typeof data.workspaceJwt !== "string" ||
      typeof data.profileId !== "number" ||
      typeof data.companyId !== "number" ||
      !Array.isArray(data.cookies) ||
      !data.cookies.every((c: unknown) => typeof c === "string")
    ) {
      return null;
    }
    return data as unknown as Session;
  } catch (err: unknown) {
    if (err instanceof Error && (!("code" in err) || (err as NodeJS.ErrnoException).code !== "ENOENT")) {
      logger.error("Failed to load session", { error: String(err) });
    }
    return null;
  }
}

export function saveSession(session: Session): void {
  const p = getSessionPath();
  fs.mkdirSync(path.dirname(p), { recursive: true, mode: 0o700 });
  fs.writeFileSync(p, JSON.stringify(session, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
}

export async function requestOTP(email: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/account/code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, reason: "login", retry: false }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to request OTP (HTTP ${res.status}): ${body}`);
  }
}

export async function performLogin(
  email: string,
  code: string,
): Promise<Session> {
  // Step 1: Login with OTP code
  const loginRes = await fetch(`${BASE_URL}/account/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  if (!loginRes.ok) {
    const body = await loginRes.text();
    throw new Error(`Login failed (HTTP ${loginRes.status}): ${body}`);
  }

  const cookies = loginRes.headers.getSetCookie?.() ?? [];
  const loginData = (await loginRes.json()) as {
    jwt: string;
    account_id: number;
  };
  const { jwt } = loginData;

  // Step 2: Get workspaces using account JWT
  const wsRes = await fetch(`${BASE_URL}/workspaces`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!wsRes.ok) {
    const body = await wsRes.text();
    throw new Error(
      `Failed to fetch workspaces (HTTP ${wsRes.status}): ${body}`,
    );
  }

  // Response shape: { data: [{ workspaces: [{ actual_profile: { id, jwt, company_id, ... } }] }] }
  const wsBody = (await wsRes.json()) as {
    data: Array<{
      workspaces: Array<{
        actual_profile: {
          id: number;
          jwt: string;
          company_id: number;
        };
      }>;
    }>;
  };

  const account = wsBody.data?.[0];
  const workspace = account?.workspaces?.[0];
  const profile = workspace?.actual_profile;

  if (!profile?.jwt) {
    throw new Error("No workspace found for this account");
  }

  return {
    email,
    jwt,
    workspaceJwt: profile.jwt,
    profileId: profile.id,
    companyId: profile.company_id,
    cookies,
    createdAt: new Date().toISOString(),
  };
}
