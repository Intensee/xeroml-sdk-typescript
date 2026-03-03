// @xeroml/sdk — TypeScript types matching API Pydantic models (v4 / 0.4.0)

// ── IntentGraph v3 types ───────────────────────────────

export interface Constraint {
  text: string;
  source: "stated" | "assumed";
  turn: number;
}

export interface SuccessCriterion {
  text: string;
  source: "stated" | "assumed";
  turn: number;
}

export interface Unknown {
  question: string;
  impact: "high" | "medium" | "low";
}

export interface Goal {
  id: string;
  objective: string;
  status: "pending" | "active" | "done" | "blocked" | "abandoned";
  depends_on: string[];
  constraints: Constraint[];
  success_criteria: SuccessCriterion[];
  unknowns: Unknown[];
  outcome: string | null;
}

export interface HistoryEntry {
  turn: number;
  type: "created" | "refinement" | "correction" | "pivot" | "goal_added" | "goal_done";
  detail: string;
}

export interface IntentContext {
  motivation: string | null;
  background: string | null;
}

export interface IntentGraph {
  v: string;
  directive: string;
  directive_source: "computed" | "llm";
  objective: string;
  type: "build" | "fix" | "explain" | "explore" | "decide" | "action";
  confidence: number;
  phase: "clarifying" | "planning" | "executing" | "done";
  urgency: "low" | "normal" | "high" | "critical";
  context: IntentContext;
  constraints: Constraint[];
  rejected: string[];
  implicit: string[];
  success_criteria: SuccessCriterion[];
  unknowns: Unknown[];
  goals: Goal[];
  history: HistoryEntry[];
}

// ── Drift ──────────────────────────────────────────────

export interface DriftReport {
  detected: boolean;
  drift_type: string | null;
  severity: number;
  description: string;
  initial_objective: string | null;
  previous_objective: string | null;
  current_objective: string | null;
}

// ── API response types ─────────────────────────────────

export interface ParseResponse {
  graph: IntentGraph;
  session_id?: string | null;
  request_id: string;
  latency_ms: number;
}

export interface SessionParseResponse {
  graph: IntentGraph;
  session_id: string;
  turn_number: number;
  request_id: string;
  latency_ms: number;
}

export interface SessionInfo {
  session_id: string;
  status: string;
  created_at: string;
}

export interface SessionListItem {
  session_id: string;
  status: string;
  turn_count: number;
  created_at: string;
  updated_at: string;
}

export interface SessionListResponse {
  sessions: SessionListItem[];
}

export interface SessionGraphResponse {
  graph: IntentGraph | null;
  session_id: string;
  turn_count: number;
}

export interface GraphTurn {
  turn_number: number;
  graph: IntentGraph;
  root_goal: string;
  confidence: number;
  sub_goal_count: number;
  provider: string;
  latency_ms: number;
  created_at: string;
}

export interface DriftEvent {
  turn_number: number;
  drift_type: string;
  severity: number;
  description: string;
  initial_objective: string | null;
  previous_objective: string | null;
  current_objective: string | null;
  created_at: string;
}

export interface SessionHistoryResponse {
  session_id: string;
  status: string;
  turn_count: number;
  current_graph: IntentGraph | null;
  graphs: GraphTurn[];
  drift_events: DriftEvent[];
}

export interface UsageMonth {
  month: string;
  parse_calls: number;
  drift_checks: number;
  session_creates: number;
}

export interface UsageInfo {
  credits: {
    used: number;
    total: number;
    remaining: number;
  };
  tier: string;
  rate_limit: number;
  usage: UsageMonth[];
}

// ── Config ─────────────────────────────────────────────

export interface XeroMLConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
}

export interface ParseOptions {
  provider?: string;
}

export interface UpdateOptions {
  role?: string;
}
