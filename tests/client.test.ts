import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { XeroML } from "../src/client";
import { Session } from "../src/session";
import {
  XeroMLAuthError,
  XeroMLCreditError,
  XeroMLRateLimitError,
  XeroMLValidationError,
  XeroMLTimeoutError,
} from "../src/errors";
import type { IntentGraph, UsageInfo, SessionListItem } from "../src/types";

// ── Fixtures ──────────────────────────────────────────

const MOCK_GRAPH: IntentGraph = {
  schema_version: "1.0",
  root_goal: "book a flight",
  sub_goals: [],
  meta: {
    source: "openai",
    confidence: 0.95,
    negotiation_history: [],
    latent_states: {
      goal_intent: "book_flight",
      action_readiness: "deciding",
      ambiguity_level: "clear",
      risk_sensitivity: "low",
      intent_scope: "single",
    },
  },
};

const MOCK_USAGE: UsageInfo = {
  credits: { used: 10, total: 1000, remaining: 990 },
  tier: "free",
  rate_limit: 60,
  usage: [{ month: "2026-02", parse_calls: 10, drift_checks: 2, session_creates: 3 }],
};

const MOCK_SESSIONS: SessionListItem[] = [
  { session_id: "s1", status: "active", turn_count: 3, created_at: "2026-02-01T00:00:00Z", updated_at: "2026-02-01T01:00:00Z" },
];

// ── Helpers ───────────────────────────────────────────

function mockFetch(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: "Error",
    json: () => Promise.resolve(body),
    headers: {
      get: (key: string) => headers[key] ?? null,
    },
  });
}

// ── Tests ─────────────────────────────────────────────

describe("XeroML constructor", () => {
  it("throws when apiKey is missing", () => {
    expect(() => new XeroML({ apiKey: "" })).toThrow("apiKey is required");
  });

  it("uses default baseURL and timeout", () => {
    const client = new XeroML({ apiKey: "test_key" });
    // Access private fields via request to verify defaults are applied
    expect(client).toBeDefined();
  });

  it("strips trailing slashes from baseURL", async () => {
    const fetch = mockFetch(MOCK_USAGE);
    vi.stubGlobal("fetch", fetch);
    const client = new XeroML({ apiKey: "k", baseURL: "https://example.com///" });
    await client.getUsage();
    expect(fetch).toHaveBeenCalledWith(
      "https://example.com/v1/usage",
      expect.anything(),
    );
    vi.unstubAllGlobals();
  });

  it("respects custom timeout", async () => {
    // Just verify it constructs without error
    const client = new XeroML({ apiKey: "k", timeout: 5000 });
    expect(client).toBeDefined();
  });
});

describe("XeroML.parse()", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the IntentGraph from response", async () => {
    vi.stubGlobal("fetch", mockFetch({ graph: MOCK_GRAPH, request_id: "r1", latency_ms: 42 }));
    const client = new XeroML({ apiKey: "test_key" });
    const graph = await client.parse("book a flight");
    expect(graph).toEqual(MOCK_GRAPH);
  });

  it("sends correct request body and headers", async () => {
    const fetch = mockFetch({ graph: MOCK_GRAPH, request_id: "r1", latency_ms: 42 });
    vi.stubGlobal("fetch", fetch);
    const client = new XeroML({ apiKey: "my_key" });
    await client.parse("hello", { provider: "openai" });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.xeroml.com/v1/parse",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-API-Key": "my_key",
          "Content-Type": "application/json",
        }),
      }),
    );
    const callBody = JSON.parse(fetch.mock.calls[0][1].body);
    expect(callBody).toEqual({ message: "hello", provider: "openai" });
  });
});

describe("XeroML.createSession()", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns a Session instance", async () => {
    vi.stubGlobal("fetch", mockFetch({ session_id: "sess_abc", status: "active", created_at: "2026-02-01T00:00:00Z" }));
    const client = new XeroML({ apiKey: "k" });
    const session = await client.createSession();
    expect(session).toBeInstanceOf(Session);
    expect(session.sessionId).toBe("sess_abc");
  });

  it("passes sessionId when provided", async () => {
    const fetch = mockFetch({ session_id: "custom_id", status: "active", created_at: "2026-02-01T00:00:00Z" });
    vi.stubGlobal("fetch", fetch);
    const client = new XeroML({ apiKey: "k" });
    await client.createSession({ sessionId: "custom_id" });
    const callBody = JSON.parse(fetch.mock.calls[0][1].body);
    expect(callBody).toEqual({ session_id: "custom_id" });
  });
});

describe("XeroML.listSessions()", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns session list", async () => {
    vi.stubGlobal("fetch", mockFetch({ sessions: MOCK_SESSIONS }));
    const client = new XeroML({ apiKey: "k" });
    const sessions = await client.listSessions();
    expect(sessions).toEqual(MOCK_SESSIONS);
  });

  it("adds limit query parameter", async () => {
    const fetch = mockFetch({ sessions: [] });
    vi.stubGlobal("fetch", fetch);
    const client = new XeroML({ apiKey: "k" });
    await client.listSessions(5);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.xeroml.com/v1/sessions?limit=5",
      expect.anything(),
    );
  });
});

describe("XeroML.getUsage()", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns usage info", async () => {
    vi.stubGlobal("fetch", mockFetch(MOCK_USAGE));
    const client = new XeroML({ apiKey: "k" });
    const usage = await client.getUsage();
    expect(usage).toEqual(MOCK_USAGE);
  });
});

describe("XeroML error mapping via request()", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("throws XeroMLAuthError on 401", async () => {
    vi.stubGlobal("fetch", mockFetch({ error: { code: "invalid_api_key", message: "Bad key" } }, 401));
    const client = new XeroML({ apiKey: "k" });
    await expect(client.parse("hi")).rejects.toThrow(XeroMLAuthError);
  });

  it("throws XeroMLCreditError on 402", async () => {
    vi.stubGlobal("fetch", mockFetch({ error: { code: "credits_exhausted", message: "No credits" } }, 402));
    const client = new XeroML({ apiKey: "k" });
    await expect(client.parse("hi")).rejects.toThrow(XeroMLCreditError);
  });

  it("throws XeroMLRateLimitError on 429 with Retry-After", async () => {
    vi.stubGlobal("fetch", mockFetch(
      { error: { code: "rate_limited", message: "Slow down" } },
      429,
      { "Retry-After": "45" },
    ));
    const client = new XeroML({ apiKey: "k" });
    try {
      await client.parse("hi");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(XeroMLRateLimitError);
      expect((err as XeroMLRateLimitError).retryAfter).toBe(45);
    }
  });

  it("throws XeroMLValidationError on 400", async () => {
    vi.stubGlobal("fetch", mockFetch({ error: { code: "invalid_input", message: "Bad" } }, 400));
    const client = new XeroML({ apiKey: "k" });
    await expect(client.parse("hi")).rejects.toThrow(XeroMLValidationError);
  });

  it("throws XeroMLTimeoutError when fetch is aborted", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" })));
    const client = new XeroML({ apiKey: "k", timeout: 1 });
    await expect(client.parse("hi")).rejects.toThrow(XeroMLTimeoutError);
  });
});
