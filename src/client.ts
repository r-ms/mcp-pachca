import { logger } from "./logger.js";
import type { Session } from "./auth.js";

export class PachcaClient {
  private readonly baseUrl = "https://app.pachca.com/api/v3";
  private readonly session: Session;

  constructor(session: Session) {
    this.session = session;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, value);
        }
      }
    }
    return (await this.request<T>("GET", url.toString())) as T;
  }

  async getWithArrayParams<T>(
    path: string,
    arrayParams: Record<string, (string | number)[]>,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, value);
        }
      }
    }
    for (const [key, values] of Object.entries(arrayParams)) {
      for (const v of values) {
        url.searchParams.append(`${key}[]`, String(v));
      }
    }
    return (await this.request<T>("GET", url.toString())) as T;
  }

  async post<T>(path: string, body: unknown): Promise<T | undefined> {
    return this.request<T>("POST", `${this.baseUrl}${path}`, body);
  }

  private async request<T>(
    method: string,
    url: string,
    body?: unknown,
  ): Promise<T | undefined> {
    logger.debug("Pachca API request", { method, url });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.session.workspaceJwt}`,
        Accept: "application/json",
        "user-id": String(this.session.profileId),
      };

      if (this.session.cookies.length > 0) {
        headers["Cookie"] = this.session.cookies.join("; ");
      }

      if (body !== undefined) {
        headers["Content-Type"] = "application/json; charset=utf-8";
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (response.status === 204) {
        return undefined;
      }

      if (response.status === 401) {
        await response.text();
        throw new Error("Session expired. Run: npx mcp-pachca --setup");
      }

      if (!response.ok) {
        const rawBody = await response.text();
        let errorBody: unknown;
        try {
          errorBody = JSON.parse(rawBody);
        } catch {
          errorBody = rawBody;
        }
        logger.error("Pachca API error", {
          status: response.status,
          body: errorBody,
        });
        throw new Error(
          `Pachca API error (HTTP ${response.status}): ${JSON.stringify(errorBody)}`,
        );
      }

      const rawText = await response.text();
      let data: T;
      try {
        data = JSON.parse(rawText) as T;
      } catch {
        throw new Error(
          `Pachca API returned non-JSON response (HTTP ${response.status}): ${rawText.slice(0, 200)}`,
        );
      }
      if (process.env["DEBUG"]) {
        logger.debug("Pachca API response", { method, url, body: data });
      }
      return data;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        logger.error("Pachca API request timeout", { url });
        throw new Error(`Pachca API request timeout: ${url}`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
