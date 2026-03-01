// @xeroml/sdk — Session class for multi-turn conversations

import type { XeroML } from "./client.js";
import type {
  DriftReport,
  IntentGraph,
  ParseOptions,
  SessionGraphResponse,
  SessionHistoryResponse,
  SessionParseResponse,
  UpdateOptions,
} from "./types.js";

export class Session {
  private client: XeroML;
  readonly sessionId: string;

  /** @internal — use `xeroml.createSession()` instead. */
  constructor(client: XeroML, sessionId: string) {
    this.client = client;
    this.sessionId = sessionId;
  }

  /**
   * Parse a user message within this session. Costs 1 credit.
   */
  async parse(message: string, options?: ParseOptions): Promise<IntentGraph> {
    const body: Record<string, unknown> = { message };
    if (options?.provider) body.provider = options.provider;

    const res = await this.client.request<SessionParseResponse>(
      "POST",
      `/v1/sessions/${this.sessionId}/parse`,
      body,
    );
    return res.graph;
  }

  /**
   * Feed an LLM response back into the session for drift tracking. Free.
   */
  async update(message: string, options?: UpdateOptions): Promise<void> {
    const body: Record<string, unknown> = { message };
    if (options?.role) body.role = options.role;

    await this.client.request<{ status: string; session_id: string }>(
      "POST",
      `/v1/sessions/${this.sessionId}/update`,
      body,
    );
  }

  /**
   * Check if intent drift has occurred. Free.
   */
  async checkDrift(): Promise<DriftReport> {
    return this.client.request<DriftReport>(
      "GET",
      `/v1/sessions/${this.sessionId}/drift`,
      null,
    );
  }

  /**
   * Get the current IntentGraph snapshot. Free.
   */
  async getGraph(): Promise<IntentGraph | null> {
    const res = await this.client.request<SessionGraphResponse>(
      "GET",
      `/v1/sessions/${this.sessionId}/graph`,
      null,
    );
    return res.graph;
  }

  /**
   * Get per-turn intent graphs, drift events, and the current evolved graph. Free.
   */
  async getHistory(): Promise<SessionHistoryResponse> {
    return this.client.request<SessionHistoryResponse>(
      "GET",
      `/v1/sessions/${this.sessionId}/history`,
      null,
    );
  }

  /**
   * End this session. Free.
   */
  async end(): Promise<void> {
    await this.client.request<{ status: string; session_id: string }>(
      "POST",
      `/v1/sessions/${this.sessionId}/end`,
      {},
    );
  }
}
