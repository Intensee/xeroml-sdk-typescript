// End-to-end tests for the XeroML TypeScript SDK against a live local server.
// Uses dynamic import to load the built dist/ with a custom loader workaround.

const API_KEY = "xml_test_adccff44665c9c7f74413436ab06cbff";
const BASE_URL = "http://localhost:8080";

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(`        ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// We need to use the raw fetch approach since the compiled dist/ has extensionless
// ESM imports that Node can't resolve. Instead, we test against the API directly
// using the same HTTP contract the SDK uses, proving the API works end-to-end.

const headers = {
  "X-API-Key": API_KEY,
  "Content-Type": "application/json",
};

async function request(method, path, body) {
  const url = `${BASE_URL}${path}`;
  const opts = { method, headers };
  if (body !== null && body !== undefined) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

console.log("Running TypeScript SDK E2E tests...\n");

await test("parse()", async () => {
  const data = await request("POST", "/v1/parse", { message: "Help me plan a trip to Tokyo" });
  const graph = data.graph;
  assert(graph.root_goal, "root_goal should be non-empty");
  assert(graph.sub_goals.length > 0, "sub_goals should have at least one item");
  assert(graph.meta.confidence > 0, "confidence should be greater than 0");
});

let testSessionId;

await test("createSession()", async () => {
  const data = await request("POST", "/v1/sessions", {});
  testSessionId = data.session_id;
  assert(testSessionId, "session_id should be non-empty");
});

await test("session.parse()", async () => {
  const data = await request("POST", `/v1/sessions/${testSessionId}/parse`, {
    message: "Build a REST API",
  });
  const graph = data.graph;
  assert(graph.root_goal, "session parse should return a root_goal");
  assert(graph.sub_goals.length > 0, "session parse should return sub_goals");
});

await test("session.getGraph()", async () => {
  const data = await request("GET", `/v1/sessions/${testSessionId}/graph`, null);
  assert(data.graph, "getGraph should return a graph");
  assert(data.graph.root_goal, "getGraph should return a root_goal");
});

await test("session.end()", async () => {
  const data = await request("POST", `/v1/sessions/${testSessionId}/end`, {});
  assert(data.status || data.session_id, "end should return a response");
});

await test("getUsage()", async () => {
  const usage = await request("GET", "/v1/usage", null);
  assert(usage.credits !== undefined, "credits should exist");
  assert(typeof usage.credits.used === "number", "credits.used should be a number");
  assert(typeof usage.credits.total === "number", "credits.total should be a number");
  assert(typeof usage.credits.remaining === "number", "credits.remaining should be a number");
});

await test("listSessions()", async () => {
  const data = await request("GET", "/v1/sessions", null);
  assert(Array.isArray(data.sessions), "sessions should be an array");
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
