// @xeroml/sdk — XeroML client class

import { mapError } from "./errors";
import { Session } from "./session";
import type {
  IntentGraph,
  ParseOptions,
  ParseResponse,
  SessionInfo,
  SessionListResponse,
  SessionListItem,
  UsageInfo,
  XeroMLConfig,
} from "./types";

const DEFAULT_BASE_URL = "https://api.xeroml.com";
const DEFAULT_TIMEOUT = 30_000;

export class XeroML {
  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(config: XeroMLConfig) {
    if (!config.apiKey) {
      throw new Error("XeroML: apiKey is required.");
    }
    this.apiKey = config.apiKey;
    this.baseURL = (config.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
  }

  /**
   * One-shot parse — no session. Costs 1 credit.
   */
  async parse(message: string, options?: ParseOptions): Promise<IntentGraph> {
    const body: Record<string, unknown> = { message };
    if (options?.provider) body.provider = options.provider;

    const res = await this.request<ParseResponse>("POST", "/v1/parse", body);
    return res.graph;
  }

  /**
   * Create a new multi-turn session. Free.
   */
  async createSession(options?: { sessionId?: string }): Promise<Session> {
    const body: Record<string, unknown> = {};
    if (options?.sessionId) body.session_id = options.sessionId;

    const res = await this.request<SessionInfo>("POST", "/v1/sessions", body);
    return new Session(this, res.session_id);
  }

  /**
   * List all sessions for the authenticated API key.
   */
  async listSessions(limit?: number): Promise<SessionListItem[]> {
    const query = limit ? `?limit=${limit}` : "";
    const res = await this.request<SessionListResponse>("GET", `/v1/sessions${query}`, null);
    return res.sessions;
  }

  /**
   * Get credit balance and usage stats. Free.
   */
  async getUsage(): Promise<UsageInfo> {
    return this.request<UsageInfo>("GET", "/v1/usage", null);
  }

  /**
   * Internal HTTP helper. Exposed for Session to call.
   * @internal
   */
  async request<T>(method: string, path: string, body: Record<string, unknown> | null): Promise<T> {
    const url = `${this.baseURL}${path}`;

    const headers: Record<string, string> = {
      "X-API-Key": this.apiKey,
    };
    if (body !== null) {
      headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body !== null ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        let errorBody: unknown;
        try {
          errorBody = await res.json();
        } catch {
          errorBody = { error: { message: res.statusText } };
        }
        const retryAfter = res.headers.get("Retry-After");
        throw mapError(res.status, errorBody as Record<string, unknown>, retryAfter ? parseInt(retryAfter, 10) : undefined);
      }

      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw mapError(504, { error: { code: "timeout", message: "Request timed out." } });
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
