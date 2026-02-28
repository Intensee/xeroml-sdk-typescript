import { describe, it, expect, vi, afterEach } from "vitest";
import { XeroML } from "../src/client";
import type { IntentGraph } from "../src/types";

// ── Fixtures ──────────────────────────────────────────

const MOCK_GRAPH: IntentGraph = {
  schema_version: "1.0",
  root_goal: "order pizza",
  sub_goals: [],
  meta: {
    source: "openai",
    confidence: 0.9,
    negotiation_history: [],
    latent_states: {
      goal_intent: "order_pizza",
      action_readiness: "executing",
      ambiguity_level: "clear",
      risk_sensitivity: "low",
      intent_scope: "single",
    },
  },
};

// ── Helpers ───────────────────────────────────────────

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    json: () => Promise.resolve(body),
    headers: { get: () => null },
  });
}

async function createSession(fetchMock: ReturnType<typeof vi.fn>) {
  // First call: createSession, subsequent calls: the actual test call
  const createResponse = { session_id: "sess_1", status: "active", created_at: "2026-02-01T00:00:00Z" };
  let callCount = 0;
  const originalFn = fetchMock;
  const wrappedFetch = vi.fn().mockImplementation((...args: unknown[]) => {
    callCount++;
    if (callCount === 1) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve(createResponse),
        headers: { get: () => null },
      });
    }
    return originalFn(...args);
  });
  vi.stubGlobal("fetch", wrappedFetch);
  const client = new XeroML({ apiKey: "k" });
  const session = await client.createSession();
  return { session, fetch: wrappedFetch };
}

// ── Tests ─────────────────────────────────────────────

describe("Session.parse()", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns IntentGraph from session parse", async () => {
    const fetchMock = mockFetch({ graph: MOCK_GRAPH, session_id: "sess_1", turn_number: 1, request_id: "r1", latency_ms: 50 });
    const { session } = await createSession(fetchMock);
    const graph = await session.parse("order a pepperoni pizza");
    expect(graph).toEqual(MOCK_GRAPH);
  });

  it("sends provider option when specified", async () => {
    const fetchMock = mockFetch({ graph: MOCK_GRAPH, session_id: "sess_1", turn_number: 1, request_id: "r1", latency_ms: 50 });
    const { session, fetch } = await createSession(fetchMock);
    await session.parse("hello", { provider: "anthropic" });

    // Second call is the parse call
    const parseCall = fetch.mock.calls[1];
    const body = JSON.parse(parseCall[1].body);
    expect(body).toEqual({ message: "hello", provider: "anthropic" });
    expect(parseCall[0]).toContain("/v1/sessions/sess_1/parse");
  });
});

describe("Session.update()", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends update request and resolves", async () => {
    const fetchMock = mockFetch({ status: "ok", session_id: "sess_1" });
    const { session, fetch } = await createSession(fetchMock);
    await session.update("Here is the pizza menu");

    const updateCall = fetch.mock.calls[1];
    expect(updateCall[0]).toContain("/v1/sessions/sess_1/update");
    const body = JSON.parse(updateCall[1].body);
    expect(body).toEqual({ message: "Here is the pizza menu" });
  });

  it("passes role option when specified", async () => {
    const fetchMock = mockFetch({ status: "ok", session_id: "sess_1" });
    const { session, fetch } = await createSession(fetchMock);
    await session.update("response", { role: "assistant" });

    const body = JSON.parse(fetch.mock.calls[1][1].body);
    expect(body).toEqual({ message: "response", role: "assistant" });
  });
});

describe("Session.checkDrift()", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns drift report", async () => {
    const driftReport = {
      detected: true,
      drift_type: "goal_shift",
      severity: 0.7,
      description: "User shifted from pizza to sushi",
      previous_goal: "order pizza",
      current_goal: "order sushi",
    };
    const fetchMock = mockFetch(driftReport);
    const { session } = await createSession(fetchMock);
    const report = await session.checkDrift();
    expect(report).toEqual(driftReport);
  });
});

describe("Session.getGraph()", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns IntentGraph when present", async () => {
    const fetchMock = mockFetch({ graph: MOCK_GRAPH, session_id: "sess_1", turn_count: 2 });
    const { session } = await createSession(fetchMock);
    const graph = await session.getGraph();
    expect(graph).toEqual(MOCK_GRAPH);
  });

  it("returns null when graph is null", async () => {
    const fetchMock = mockFetch({ graph: null, session_id: "sess_1", turn_count: 0 });
    const { session } = await createSession(fetchMock);
    const graph = await session.getGraph();
    expect(graph).toBeNull();
  });
});

describe("Session.end()", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends end request and resolves", async () => {
    const fetchMock = mockFetch({ status: "ended", session_id: "sess_1" });
    const { session, fetch } = await createSession(fetchMock);
    await session.end();

    const endCall = fetch.mock.calls[1];
    expect(endCall[0]).toContain("/v1/sessions/sess_1/end");
    expect(endCall[1].method).toBe("POST");
  });
});
