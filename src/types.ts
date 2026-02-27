// @xeroml/sdk — TypeScript types matching API Pydantic models exactly

// ── IntentGraph types ──────────────────────────────────

export interface LatentStates {
  goal_intent: string;
  action_readiness: "exploring" | "deciding" | "executing";
  ambiguity_level: "clear" | "partial" | "conflicting";
  risk_sensitivity: "low" | "medium" | "high";
  intent_scope: "single" | "compound" | "multi_step";
}

export interface IntentMeta {
  source: string;
  confidence: number;
  negotiation_history: string[];
  latent_states: LatentStates;
}

export interface SubGoal {
  id: string;
  goal: string;
  status: "pending" | "active" | "done" | "blocked" | "abandoned" | "background";
  priority: number;
  success_criteria: string[];
  constraints: string[];
  uncertainty: number;
  context_requirements: string[];
  modality: string;
  dependencies: string[];
  children: SubGoal[];
}

export interface IntentGraph {
  schema_version: string;
  root_goal: string;
  sub_goals: SubGoal[];
  meta: IntentMeta;
}

// ── Drift ──────────────────────────────────────────────

export interface DriftReport {
  detected: boolean;
  drift_type: string | null;
  severity: number;
  description: string;
  previous_goal: string | null;
  current_goal: string | null;
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
