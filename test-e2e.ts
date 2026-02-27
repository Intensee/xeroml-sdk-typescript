// End-to-end tests for the XeroML TypeScript SDK against a live local server.
// Run with: npx tsx test-e2e.ts

import { XeroML } from "./src/index";

const API_KEY = "xml_test_adccff44665c9c7f74413436ab06cbff";
const BASE_URL = "http://localhost:8080";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  FAIL: ${name}`);
    console.error(`        ${err.message}`);
    failed++;
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const client = new XeroML({ apiKey: API_KEY, baseURL: BASE_URL, timeout: 60_000 });

  console.log("Running TypeScript SDK E2E tests...\n");

  await test("parse()", async () => {
    const graph = await client.parse("Help me plan a trip to Tokyo");
    assert(graph.root_goal, "root_goal should be non-empty");
    assert(graph.sub_goals.length > 0, "sub_goals should have at least one item");
    assert(graph.meta.confidence > 0, "confidence should be greater than 0");
  });

  await test("session workflow: createSession -> parse -> getGraph -> end", async () => {
    const session = await client.createSession();
    assert(session.sessionId, "sessionId should be non-empty");

    const graph = await session.parse("Build a REST API");
    assert(graph.root_goal, "session parse should return a root_goal");
    assert(graph.sub_goals.length > 0, "session parse should return sub_goals");

    const graph2 = await session.getGraph();
    assert(graph2, "getGraph should return a graph");
    assert(graph2.root_goal, "getGraph should return a root_goal");

    await session.end();
  });

  await test("getUsage()", async () => {
    const usage = await client.getUsage();
    assert(usage.credits !== undefined, "credits should exist");
    assert(typeof usage.credits.used === "number", "credits.used should be a number");
    assert(typeof usage.credits.total === "number", "credits.total should be a number");
    assert(typeof usage.credits.remaining === "number", "credits.remaining should be a number");
  });

  await test("listSessions()", async () => {
    const sessions = await client.listSessions();
    assert(Array.isArray(sessions), "listSessions should return an array");
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
