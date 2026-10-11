/**
 * TEST-ONLY stand-in for the RuleSight API. Never import this from app code (an ESLint rule
 * and src/test/test-boundary.test.ts enforce that).
 *
 * installFakeApi() stubs global fetch and answers the /api/v1 routes the tests use, with a
 * small in-memory data set. It checks the bearer token and the role's permissions the way
 * the backend does, and every write appends an audit entry under the signed-in user.
 */
import { vi } from "vitest";

import type { UserResponse } from "@/services/types/api";
import type { ChangeComparison } from "@/types/api";
import type {
  AgentRun,
  Assessment,
  AuditEntry,
  Control,
  DashboardSummary,
  EvalReport,
  Evidence,
  Gap,
  GapType,
  KnowledgeGraph,
  Mapping,
  Obligation,
  Priority,
  Remediation,
  SourceDocument,
} from "@/types/domain";

// ---- Users -------------------------------------------------------------------------------------

const READ = [
  "documents:read",
  "obligations:read",
  "mappings:read",
  "controls:read",
  "gaps:read",
  "remediations:read",
  "changes:read",
  "changes:compare",
  "graph:read",
  "eval:read",
  "audit:read",
];
const ANALYST = [
  ...READ,
  "documents:upload",
  "obligations:edit",
  "mappings:verify",
  "remediations:create",
];
const OFFICER = [
  ...ANALYST,
  "pipeline:run",
  "gaps:signoff",
  "gaps:dismiss",
  "remediations:approve",
];

function testUser(id: string, fullName: string, role: string, permissions: string[]) {
  return {
    id,
    email: `${id}@example.test`,
    full_name: fullName,
    role,
    initials: fullName
      .split(" ")
      .map((part) => part.charAt(0))
      .join(""),
    is_active: true,
    created_at: "2030-01-01T00:00:00Z",
    last_login_at: null,
    permissions,
  } satisfies UserResponse;
}

/** Accounts the fake API knows. Every one signs in with TEST_PASSWORD. */
export const TEST_USERS = {
  officer: testUser("officer", "Olivia Officer", "compliance_officer", OFFICER),
  analyst: testUser("analyst", "Arjun Analyst", "compliance_analyst", ANALYST),
  auditor: testUser("auditor", "Asha Auditor", "auditor", READ),
  admin: testUser("admin", "Adam Admin", "admin", [...OFFICER, "users:manage"]),
} as const;

export type TestUserKey = keyof typeof TEST_USERS;
export const TEST_PASSWORD = "correct-horse";

export function tokenFor(user: TestUserKey): string {
  return `test-token-${TEST_USERS[user].id}`;
}

// ---- Data --------------------------------------------------------------------------------------

export interface FakeDb {
  documents: SourceDocument[];
  obligations: Obligation[];
  controls: Control[];
  mappings: Mapping[];
  evidence: Evidence[];
  assessments: Assessment[];
  gaps: Gap[];
  remediations: Remediation[];
  audit: AuditEntry[];
  runs: AgentRun[];
  evaluation: EvalReport;
  graph: KnowledgeGraph;
  comparison: ChangeComparison | null;
}

const CREATED = "2030-01-01T09:00:00Z";

function doc(id: string, overrides: Partial<SourceDocument>): SourceDocument {
  return {
    id,
    doc_type: "regulation",
    title: `Test document ${id}`,
    reference: `REF/${id}`,
    regulator: null,
    version_label: "v1",
    supersedes_id: null,
    is_synthetic: false,
    status: "ready",
    withdrawn_note: null,
    created_at: CREATED,
    sha256: "",
    chunk_count: 1,
    obligation_count: 0,
    ...overrides,
  };
}

function obligation(id: string, code: string, overrides: Partial<Obligation>): Obligation {
  return {
    id,
    code,
    document_id: "doc-reg-v2",
    source_label: "Test Regulation v2",
    clause_ref: "Para 1",
    page: null,
    source_quote: "The entity shall do the thing.",
    key_phrase: null,
    quote_verified: true,
    summary: `Summary of ${code}`,
    actor: "The entity",
    action: "Do the thing",
    condition: null,
    frequency: null,
    deadline: null,
    threshold: null,
    topic: "Test topic",
    criticality: 2,
    applicability: "applicable",
    applicability_reason: null,
    coverage: "none",
    review_status: "suggested",
    ...overrides,
  };
}

function gap(
  id: string,
  code: string,
  priority: Priority,
  factors: [number, number, number],
  overrides: Partial<Gap>,
): Gap {
  const [criticality, severity, urgency] = factors;
  return {
    id,
    code,
    obligation_id: "obl-1",
    gap_type: "operating",
    title: `Gap ${code}`,
    description: `Description of ${code}.`,
    control_ids: [],
    evidence_ids: [],
    origin: "initial",
    change_id: null,
    risk_factors: { criticality, severity, urgency, rule_version: "test" },
    risk_score: criticality * severity * urgency,
    priority,
    status: "potential",
    ...overrides,
  };
}

/** A small, consistent data set: one regulation in two versions, three gaps, one control. */
export function createFakeDb(): FakeDb {
  const documents = [
    doc("doc-reg-v1", {
      title: "Test Regulation v1",
      regulator: "TESTREG",
      status: "superseded",
    }),
    doc("doc-reg-v2", {
      title: "Test Regulation v2",
      regulator: "TESTREG",
      version_label: "v2",
      supersedes_id: "doc-reg-v1",
      obligation_count: 3,
    }),
    doc("doc-rcm", { doc_type: "rcm", title: "Test control matrix", is_synthetic: true }),
  ];
  const obligations = [
    obligation("obl-1", "TO-01", {
      source_quote: "Records shall be reviewed at least once every year by the reviewer.",
      key_phrase: "at least once every year",
      topic: "Periodic review",
      criticality: 3,
      deadline: "on or before the test deadline",
    }),
    obligation("obl-2", "TO-02", {
      applicability: "not_applicable",
      applicability_reason: "Clause 2 applies only to a different kind of entity.",
      coverage: "not_applicable",
    }),
    obligation("obl-3", "TO-03", { review_status: "accepted", coverage: "covered" }),
  ];
  const controls: Control[] = [
    {
      id: "ctl-1",
      code: "TC-01",
      name: "Test review control",
      description: "Reviewer checks records.",
      owner: "Test team",
      frequency: "Yearly",
      control_type: "Detective",
      automation: "Manual",
      source_document: "Test control matrix",
      source_section: "Row 1",
      evidence_expected: "Review log",
      rbi_reference: "Para 1",
      topic: "Periodic review",
    },
  ];
  const mappings: Mapping[] = [
    {
      id: "map-1",
      obligation_id: "obl-1",
      control_id: "ctl-1",
      coverage: "partial",
      rationale: "The control reviews records but not every year.",
      graph_path: ["TO-01", "Periodic review", "TC-01"],
      critic: "passed",
      status: "suggested",
    },
  ];
  const evidence: Evidence[] = [
    {
      id: "ev-1",
      code: "TE-01",
      title: "Test review log",
      file_name: "review-log.csv",
      control_codes: ["TC-01"],
      columns: ["Year", "Records reviewed"],
      rows: [["Year 1", "2,105"]],
      flagged_cells: [[0, 1]],
      summary: "Only part of the records were reviewed.",
    },
  ];
  const gaps = [
    gap("gap-1", "TG-01", "P1", [3, 2, 1], {
      title: "Records not reviewed every year",
      control_ids: ["ctl-1"],
      evidence_ids: ["ev-1"],
    }),
    gap("gap-2", "TG-02", "P2", [2, 2, 1], {
      obligation_id: "obl-3",
      gap_type: "design",
      title: "Review design incomplete",
      control_ids: ["ctl-1"],
    }),
    gap("gap-3", "TG-03", "P1", [2, 2, 2], {
      gap_type: "missing",
      title: "New requirement from the change",
      origin: "change",
      change_id: "chg-1",
    }),
  ];
  const remediations: Remediation[] = [
    {
      id: "rem-1",
      gap_id: "gap-1",
      action: "Review every record each year.",
      owner_team: "Test team",
      target_days: 30,
      closure_evidence: "Updated review log",
      status: "draft",
    },
    {
      id: "rem-2",
      gap_id: "gap-2",
      action: "Redesign the review.",
      owner_team: "Test team",
      target_days: 60,
      closure_evidence: "New procedure",
      status: "approved",
    },
  ];
  const runs: AgentRun[] = [
    {
      id: "run-1",
      run_id: "r1",
      started_at: CREATED,
      status: "done",
      trigger: "Test run",
      cache_hits: 0,
      nodes: [
        {
          node: "extract",
          status: "done",
          offset_ms: 0,
          duration_ms: 1200,
          llm_calls: 2,
          input_tokens: 100,
          output_tokens: 50,
          note: null,
          conditional: false,
        },
      ],
    },
  ];
  const consolidated = {
    id: "chg-2",
    code: "TCH-02",
    change_type: "consolidated" as const,
    title: "Consolidated requirements",
    summary: "Earlier requirements restated in v2.",
    significance: "administrative" as const,
    carried_over: ["TO-02", "TO-03"],
  };
  return {
    documents,
    obligations,
    controls,
    mappings,
    evidence,
    assessments: [
      {
        obligation_id: "obl-1",
        design: "adequate",
        design_note: "The design is fine.",
        operating: "partially_effective",
        operating_note: "Not every record was reviewed.",
        evidence_ids: ["ev-1"],
      },
    ],
    gaps,
    remediations,
    audit: [],
    runs,
    evaluation: { is_mock: true, scored_at: null, method: "", metrics: [] },
    graph: {
      nodes: [
        { id: "obl-1", type: "obligation", label: "TO-01", detail: "" },
        { id: "ctl-1", type: "control", label: "TC-01", detail: "" },
        { id: "gap-1", type: "gap", label: "TG-01", detail: "" },
      ],
      edges: [
        { source: "obl-1", target: "ctl-1", type: "MAPPED_TO" },
        { source: "obl-1", target: "gap-1", type: "HAS_GAP" },
      ],
    },
    comparison: {
      old_document: documents[0] as SourceDocument,
      new_document: documents[1] as SourceDocument,
      changes: [
        {
          id: "chg-1",
          code: "TCH-01",
          change_type: "modified",
          title: "Review frequency tightened",
          summary: "Reviews are now yearly.",
          significance: "high",
          before: { ref: "v1 Para 1", text: "Records shall be reviewed periodically." },
          after: { ref: "v2 Para 1", text: "Records shall be reviewed every year." },
          removed_phrases: ["periodically"],
          added_phrases: ["every year"],
          impact: { obligations: ["TO-01"], controls: ["TC-01"], gaps: ["TG-03"] },
        },
        {
          id: "chg-3",
          code: "TCH-03",
          change_type: "withdrawn",
          title: "Old circular withdrawn",
          summary: "v1 is withdrawn.",
          significance: "medium",
        },
        consolidated,
      ],
      missing_circulars: [
        { row: 1, reference: "TEST/CIRC/1", date: "1 Jan 2029", subject: "Missing test circular" },
      ],
    },
  };
}

/** A database with nothing in it, as on a fresh install. */
export function createEmptyFakeDb(): FakeDb {
  return {
    documents: [],
    obligations: [],
    controls: [],
    mappings: [],
    evidence: [],
    assessments: [],
    gaps: [],
    remediations: [],
    audit: [],
    runs: [],
    evaluation: { is_mock: true, scored_at: null, method: "", metrics: [] },
    graph: { nodes: [], edges: [] },
    comparison: null,
  };
}

// ---- Derived responses ---------------------------------------------------------------------------

function count<T>(items: T[], test: (item: T) => boolean): number {
  return items.filter(test).length;
}

function dashboardSummary(db: FakeDb): DashboardSummary {
  const applicable = db.obligations.filter((item) => item.applicability === "applicable");
  const open = db.gaps.filter((item) => item.status !== "dismissed");
  const priorities = (items: Gap[]) => ({
    P1: count(items, (item) => item.priority === "P1"),
    P2: count(items, (item) => item.priority === "P2"),
    P3: count(items, (item) => item.priority === "P3"),
  });
  const types = [...new Set(open.map((item) => item.gap_type))] as GapType[];
  return {
    obligations_total: db.obligations.length,
    obligations_applicable: applicable.length,
    obligations_not_applicable: db.obligations.length - applicable.length,
    coverage: {
      covered: count(applicable, (item) => item.coverage === "covered"),
      partial: count(applicable, (item) => item.coverage === "partial"),
      insufficient_info: count(applicable, (item) => item.coverage === "insufficient_info"),
      none: count(applicable, (item) => item.coverage === "none"),
    },
    open_gaps: open.length,
    gaps_by_priority: priorities(open),
    gaps_by_type: types.map((gap_type) => ({
      gap_type,
      counts: priorities(open.filter((item) => item.gap_type === gap_type)),
    })),
    risk_exposure: open.reduce((sum, item) => sum + item.risk_score, 0),
    remediation_approved: count(db.remediations, (item) => item.status === "approved"),
    remediation_total: db.remediations.length,
    next_deadline: { label: "No upcoming deadline", date: "", days_remaining: 0, context: "" },
    review: {
      obligations_suggested: count(db.obligations, (item) => item.review_status === "suggested"),
      obligations_accepted: count(db.obligations, (item) => item.review_status === "accepted"),
      obligations_edited: count(db.obligations, (item) => item.review_status === "edited"),
      obligations_rejected: count(db.obligations, (item) => item.review_status === "rejected"),
      mappings_to_review: count(db.mappings, (item) => item.status === "suggested"),
      quotes_verified: count(db.obligations, (item) => item.quote_verified),
      quotes_total: db.obligations.length,
    },
    critic_retries: 0,
    llm_calls: db.runs.reduce(
      (sum, run) => sum + run.nodes.reduce((n, node) => n + node.llm_calls, 0),
      0,
    ),
    last_run_at: db.runs[0]?.started_at ?? "",
  };
}

// ---- HTTP plumbing -------------------------------------------------------------------------------

class HttpError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function find<T extends { id: string }>(items: T[], id: string, what: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new HttpError(404, `${what} not found`);
  return item;
}

function parseBody(body: BodyInit | null | undefined): Record<string, unknown> {
  if (typeof body !== "string") return {};
  return JSON.parse(body) as Record<string, unknown>;
}

export interface FakeApi {
  db: FakeDb;
  /** Every request the app made, as "METHOD /path". */
  requests: string[];
}

/**
 * Stubs global fetch with the fake API. Pass `db` to start from other data (for example
 * createEmptyFakeDb()). The stub is removed by vi.restoreAllMocks() in the test setup.
 */
export function installFakeApi(options: { db?: FakeDb } = {}): FakeApi {
  const api: FakeApi = { db: options.db ?? createFakeDb(), requests: [] };
  const { db } = api;
  let sequence = 0;

  const record = (
    user: UserResponse,
    entry: Pick<AuditEntry, "action" | "entity_type" | "entity_code"> & Partial<AuditEntry>,
  ) => {
    sequence += 1;
    db.audit.unshift({
      id: `aud-${String(sequence)}`,
      at: new Date().toISOString(),
      actor: user.full_name,
      actor_role: user.role,
      reason: null,
      before: null,
      after: null,
      ...entry,
    });
  };

  const handle = (method: string, path: string, init: RequestInit | undefined): Response => {
    if (method === "POST" && path === "/auth/login") {
      const { email, password } = parseBody(init?.body);
      const user = Object.values(TEST_USERS).find((candidate) => candidate.email === email);
      if (!user || password !== TEST_PASSWORD) {
        throw new HttpError(401, "Invalid email or password.");
      }
      const key = (Object.keys(TEST_USERS) as TestUserKey[]).find(
        (candidate) => TEST_USERS[candidate].id === user.id,
      ) as TestUserKey;
      return json({ access_token: tokenFor(key), token_type: "bearer", user });
    }
    if (method === "GET" && path === "/health/ready") {
      return json({ status: "ready", database: "ok" });
    }

    const header = new Headers(init?.headers).get("Authorization") ?? "";
    const user = Object.values(TEST_USERS).find(
      (candidate) => header === `Bearer test-token-${candidate.id}`,
    );
    if (!user) throw new HttpError(401, "Not authenticated");
    const need = (permission: string) => {
      if (!user.permissions.includes(permission) && !user.permissions.includes("users:manage")) {
        throw new HttpError(403, "Permission denied");
      }
    };

    const route = `${method} ${path}`;
    let match: RegExpMatchArray | null;

    if (route === "GET /auth/me") return json(user);
    if (route === "GET /dashboard/summary") {
      need("obligations:read");
      return json(dashboardSummary(db));
    }
    if (route === "GET /documents") {
      need("documents:read");
      return json(db.documents);
    }
    if (route === "GET /obligations") {
      need("obligations:read");
      return json(db.obligations);
    }
    if ((match = /^PATCH \/obligations\/([^/]+)$/.exec(route))) {
      need("obligations:edit");
      const item = find(db.obligations, decodeURIComponent(match[1] ?? ""), "Obligation");
      const body = parseBody(init?.body) as { review_status: Obligation["review_status"] };
      const before = item.review_status;
      item.review_status = body.review_status;
      record(user, {
        action: `Set review status to ${body.review_status}`,
        entity_type: "obligation",
        entity_code: item.code,
        before: { review_status: before },
        after: { review_status: item.review_status },
      });
      return json(item);
    }
    if (route === "GET /controls") {
      need("controls:read");
      return json(db.controls);
    }
    if (route === "GET /mappings") {
      need("mappings:read");
      return json(db.mappings);
    }
    if ((match = /^PATCH \/mappings\/([^/]+)$/.exec(route))) {
      need("mappings:verify");
      const item = find(db.mappings, decodeURIComponent(match[1] ?? ""), "Mapping");
      item.status = (parseBody(init?.body) as { status: Mapping["status"] }).status;
      return json(item);
    }
    if (route === "GET /gaps") {
      need("gaps:read");
      return json([...db.gaps].sort((a, b) => b.risk_score - a.risk_score));
    }
    if ((match = /^GET \/gaps\/([^/]+)\/trace$/.exec(route))) {
      need("gaps:read");
      const item = find(db.gaps, decodeURIComponent(match[1] ?? ""), "Gap");
      const ob = find(db.obligations, item.obligation_id, "Obligation");
      const change = db.comparison?.changes.find((c) => c.id === item.change_id) ?? null;
      return json({
        gap: item,
        obligation: ob,
        document: find(db.documents, ob.document_id, "Document"),
        controls: db.controls.filter((c) => item.control_ids.includes(c.id)),
        mappings: db.mappings.filter((m) => m.obligation_id === ob.id),
        assessment: db.assessments.find((a) => a.obligation_id === ob.id) ?? null,
        evidence: db.evidence.filter((e) => item.evidence_ids.includes(e.id)),
        remediations: db.remediations.filter((r) => r.gap_id === item.id),
        change,
        audit: db.audit.filter((entry) => entry.entity_code === item.code),
      });
    }
    if ((match = /^PATCH \/gaps\/([^/]+)$/.exec(route))) {
      const body = parseBody(init?.body) as { status: Gap["status"]; reason: string | null };
      need(body.status === "dismissed" ? "gaps:dismiss" : "gaps:signoff");
      const item = find(db.gaps, decodeURIComponent(match[1] ?? ""), "Gap");
      const before = item.status;
      item.status = body.status;
      record(user, {
        action: body.status === "dismissed" ? "Dismissed gap" : `Set gap to ${body.status}`,
        entity_type: "gap",
        entity_code: item.code,
        reason: body.reason,
        before: { status: before },
        after: { status: item.status },
      });
      return json(item);
    }
    if (route === "GET /remediations") {
      need("remediations:read");
      return json(db.remediations);
    }
    if ((match = /^PATCH \/remediations\/([^/]+)$/.exec(route))) {
      const body = parseBody(init?.body) as { status: Remediation["status"]; reason?: string };
      need(
        body.status === "approved" || body.status === "rejected"
          ? "remediations:approve"
          : "remediations:create",
      );
      const item = find(db.remediations, decodeURIComponent(match[1] ?? ""), "Remediation");
      const owner = find(db.gaps, item.gap_id, "Gap");
      item.status = body.status;
      record(user, {
        action:
          body.status === "approved" ? "Approved remediation" : `Set remediation to ${body.status}`,
        entity_type: "remediation",
        entity_code: owner.code,
        reason: body.reason ?? null,
      });
      return json(item);
    }
    if (route === "GET /pipeline/runs") {
      need("documents:read");
      return json(db.runs);
    }
    if ((match = /^GET \/pipeline\/runs\/([^/]+)$/.exec(route))) {
      need("documents:read");
      return json(find(db.runs, decodeURIComponent(match[1] ?? ""), "Run"));
    }
    if (route === "GET /audit") {
      need("audit:read");
      return json(db.audit);
    }
    if (route === "GET /eval/latest") {
      need("eval:read");
      return json(db.evaluation);
    }
    if (route === "GET /graph") {
      need("graph:read");
      return json(db.graph);
    }
    if (route === "POST /changes/compare") {
      need("changes:compare");
      if (!db.comparison) {
        throw new HttpError(404, "No document supersedes another, so there is nothing to compare");
      }
      return json(db.comparison);
    }
    throw new HttpError(404, `The fake API has no route for ${route}`);
  };

  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, "http://localhost");
    const path = url.pathname.replace(/^\/api\/v1/, "");
    const method = (init?.method ?? "GET").toUpperCase();
    api.requests.push(`${method} ${path}`);
    try {
      return Promise.resolve(handle(method, path, init));
    } catch (error: unknown) {
      if (error instanceof HttpError) {
        return Promise.resolve(json({ detail: error.detail }, error.status));
      }
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  });

  return api;
}
