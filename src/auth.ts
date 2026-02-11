import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

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
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  const p = getSessionPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(session, null, 2) + "\n", "utf8");
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

  const wsData = (await wsRes.json()) as Array<{
    id: number;
    jwt: string;
    company_id: number;
    profile_id: number;
  }>;

  if (wsData.length === 0) {
    throw new Error("No workspaces found for this account");
  }

  const ws = wsData[0]!;

  return {
    email,
    jwt,
    workspaceJwt: ws.jwt,
    profileId: ws.profile_id,
    companyId: ws.company_id,
    cookies,
    createdAt: new Date().toISOString(),
  };
}
