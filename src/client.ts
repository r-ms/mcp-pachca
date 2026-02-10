import { logger } from "./logger.js";

export class PachcaClient {
  private readonly baseUrl = "https://api.pachca.com/api/shared/v1";
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
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
    return this.request<T>("GET", url.toString());
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", `${this.baseUrl}${path}`, body);
  }

  private async request<T>(
    method: string,
    url: string,
    body?: unknown,
  ): Promise<T> {
    logger.debug("Pachca API request", { method, url });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
      };

      if (body !== undefined) {
        headers["Content-Type"] = "application/json; charset=utf-8";
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorBody: unknown;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text();
        }
        logger.error("Pachca API error", {
          status: response.status,
          body: errorBody,
        });
        throw new Error(
          `Pachca API error (HTTP ${response.status}): ${JSON.stringify(errorBody)}`,
        );
      }

      return (await response.json()) as T;
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
