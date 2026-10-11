import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { PriorityChip } from "@/components/data-display/priority-chip";
import { LabelTag, StatusTag } from "@/components/data-display/status-tag";
import { EmptyState } from "@/components/feedback/empty-state";
import { QueryView } from "@/components/feedback/query-view";
import { PageFrame } from "@/components/layout/page-frame";
import { Button, TextButton } from "@/components/ui/button";
import { FilterGroup } from "@/components/ui/filter-group";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { useControls, useGaps, useObligations, useRemediations } from "@/hooks/use-rulesight";
import { formatScore } from "@/lib/format";
import { GAP_STATUS, GAP_TYPE, REMEDIATION_STATUS } from "@/lib/labels";
import type { Control, Gap, Obligation, Remediation } from "@/types/domain";

const PAGE_SIZE = 10;

const PRIORITY_FILTERS = [
  { value: "all", label: "All" },
  { value: "P1", label: "P1" },
  { value: "P2", label: "P2" },
  { value: "P3", label: "P3" },
] as const;

const ORIGIN_FILTERS = [
  { value: "all", label: "Any origin" },
  { value: "initial", label: "Initial" },
  { value: "change", label: "From change" },
] as const;

type PriorityFilter = (typeof PRIORITY_FILTERS)[number]["value"];
type OriginFilter = (typeof ORIGIN_FILTERS)[number]["value"];

export function GapsPage() {
  const gaps = useGaps();
  const obligations = useObligations();
  const remediations = useRemediations();
  const controls = useControls();

  return (
    <PageFrame
      title="Gaps"
      subtitle="Obligations not fully met by the bank's controls, sorted by risk score"
    >
      <QueryView
        query={gaps}
        what="gaps"
        rows={8}
        empty={
          <Sheet>
            <EmptyState
              title="No gaps found yet"
              description="Gaps appear after the pipeline compares extracted obligations with your controls and evidence. Upload a regulation and your control matrix, then run the pipeline."
              action={
                <Link className="button small" to="/documents">
                  Go to documents
                </Link>
              }
            />
          </Sheet>
        }
      >
        {(items) => (
          <GapsRegister
            items={items}
            obligations={obligations.data ?? []}
            remediations={remediations.data ?? []}
            controls={controls.data ?? []}
          />
        )}
      </QueryView>
    </PageFrame>
  );
}

function GapsRegister({
  items,
  obligations,
  remediations,
  controls,
}: {
  items: Gap[];
  obligations: Obligation[];
  remediations: Remediation[];
  controls: Control[];
}) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const priority = (params.get("priority") ?? "all") as PriorityFilter;
  const origin = (params.get("origin") ?? "all") as OriginFilter;

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
    setPage(1);
  };
  const clearAll = () => {
    setParams(new URLSearchParams(), { replace: true });
    setQuery("");
    setPage(1);
  };

  const obligationById = useMemo(
    () => new Map(obligations.map((item) => [item.id, item])),
    [obligations],
  );
  const remediationByGap = useMemo(
    () => new Map(remediations.map((item) => [item.gap_id, item])),
    [remediations],
  );
  const controlCode = useMemo(
    () => new Map(controls.map((item) => [item.id, item.code])),
    [controls],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (priority !== "all" && item.priority !== priority) return false;
      if (origin !== "all" && item.origin !== origin) return false;
      const obligation = obligationById.get(item.obligation_id);
      return `${item.code} ${item.title} ${obligation?.clause_ref ?? ""}`
        .toLowerCase()
        .includes(needle);
    });
  }, [items, query, priority, origin, obligationById]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <div className="toolbar">
        <SearchField
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder="Search gaps"
        />
        <FilterGroup
          label="Priority"
          value={priority}
          options={PRIORITY_FILTERS}
          onChange={(value) => {
            setFilter("priority", value);
          }}
        />
        <FilterGroup
          label="Origin"
          value={origin}
          options={ORIGIN_FILTERS}
          onChange={(value) => {
            setFilter("origin", value);
          }}
        />
        <TextButton onClick={clearAll}>Clear all</TextButton>
        <span className="result-count">
          {filtered.length} {filtered.length === 1 ? "gap" : "gaps"}
        </span>
      </div>

      <Sheet className="table-sheet">
        {filtered.length === 0 ? (
          <EmptyState
            title="No gaps match these filters."
            action={
              <Button size="sm" onClick={clearAll}>
                Clear all filters
              </Button>
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="data-table gaps-table">
              <caption className="sr-only">Open compliance gaps, sorted by risk score</caption>
              <thead>
                <tr>
                  <th scope="col">Gap</th>
                  <th scope="col">Obligation and source</th>
                  <th scope="col" className="hide-sm">
                    Type · controls
                  </th>
                  <th scope="col" className="numeric">
                    Risk
                  </th>
                  <th scope="col" className="hide-sm">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  const obligation = obligationById.get(item.obligation_id);
                  const remediation = remediationByGap.get(item.id);
                  const factors = item.risk_factors;
                  const controlCodes = item.control_ids
                    .map((id) => controlCode.get(id) ?? id.toUpperCase())
                    .join(", ");
                  return (
                    <tr
                      key={item.id}
                      className="clickable"
                      onClick={() => {
                        void navigate(`/gaps/${item.id}`);
                      }}
                    >
                      <td>
                        <span className="gap-cell">
                          <PriorityChip value={item.priority} />
                          <span className="mono">{item.code}</span>
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="row-link"
                          onClick={(event) => {
                            event.stopPropagation();
                            void navigate(`/gaps/${item.id}`);
                          }}
                        >
                          <strong className="cell-main">{item.title}</strong>
                        </button>
                        <div className="tag-row cell-meta">
                          <span className="cell-sub mono">
                            {obligation
                              ? `${obligation.source_label} · ${obligation.clause_ref}`
                              : "—"}
                          </span>
                          {item.origin === "change" ? (
                            <StatusTag tone="accent" small>
                              From change
                            </StatusTag>
                          ) : null}
                        </div>
                      </td>
                      <td className="hide-sm">
                        <div className="cell-stack">
                          <StatusTag tone="plain">{GAP_TYPE[item.gap_type].label}</StatusTag>
                          <span className="cell-sub mono">{controlCodes || "None"}</span>
                        </div>
                      </td>
                      <td
                        className="numeric score"
                        title={`criticality ${String(factors.criticality)} × severity ${String(factors.severity)} × urgency ${String(factors.urgency)} = ${formatScore(item.risk_score)} → ${item.priority} (rule ${factors.rule_version})`}
                      >
                        {formatScore(item.risk_score)}
                      </td>
                      <td className="hide-sm">
                        <div className="cell-stack">
                          <LabelTag
                            value={GAP_STATUS[item.status]}
                            struck={item.status === "dismissed"}
                          />
                          <span className="cell-sub">
                            Plan:{" "}
                            {remediation ? (
                              <span
                                className={`text-${REMEDIATION_STATUS[remediation.status].tone}`}
                              >
                                {REMEDIATION_STATUS[remediation.status].label}
                              </span>
                            ) : (
                              "None"
                            )}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <nav className="pagination" aria-label="Pagination">
          <span>
            {filtered.length
              ? `Showing ${String((currentPage - 1) * PAGE_SIZE + 1)}–${String(Math.min(currentPage * PAGE_SIZE, filtered.length))} of ${String(filtered.length)} gaps`
              : ""}
          </span>
          <Button
            size="sm"
            disabled={currentPage === 1}
            onClick={() => {
              setPage(currentPage - 1);
            }}
          >
            ← Previous
          </Button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
            <button
              key={number}
              type="button"
              className="page-number"
              aria-current={number === currentPage ? "page" : undefined}
              aria-label={`Page ${String(number)}`}
              onClick={() => {
                setPage(number);
              }}
            >
              {number}
            </button>
          ))}
          <Button
            size="sm"
            disabled={currentPage === pageCount}
            onClick={() => {
              setPage(currentPage + 1);
            }}
          >
            Next →
          </Button>
        </nav>
      </Sheet>
      <p className="page-note">
        Hover a risk score to see its factors. Select a row to open the full trace.
      </p>
    </>
  );
}
