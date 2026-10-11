import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { PriorityChip } from "@/components/data-display/priority-chip";
import { LabelTag } from "@/components/data-display/status-tag";
import { EmptyState } from "@/components/feedback/empty-state";
import { QueryView } from "@/components/feedback/query-view";
import { PageFrame } from "@/components/layout/page-frame";
import { Button, IconButton } from "@/components/ui/button";
import { FilterGroup } from "@/components/ui/filter-group";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { useGaps, useObligations, useRemediations } from "@/hooks/use-rulesight";
import { formatScore } from "@/lib/format";
import { GAP_STATUS, GAP_TYPE, REMEDIATION_STATUS } from "@/lib/labels";
import type { Gap, Obligation, Remediation } from "@/types/domain";

const PAGE_SIZE = 10;

const PRIORITY_FILTERS = [
  { value: "all", label: "All priorities" },
  { value: "P1", label: "P1" },
  { value: "P2", label: "P2" },
  { value: "P3", label: "P3" },
] as const;

const STATUS_FILTERS = [
  { value: "all", label: "Any status" },
  { value: "potential", label: "Potential" },
  { value: "confirmed", label: "Confirmed" },
  { value: "needs_info", label: "Needs info" },
] as const;

const ORIGIN_FILTERS = [
  { value: "all", label: "Any origin" },
  { value: "change", label: "From change" },
] as const;

type PriorityFilter = (typeof PRIORITY_FILTERS)[number]["value"];
type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];
type OriginFilter = (typeof ORIGIN_FILTERS)[number]["value"];

export function GapsPage() {
  const gaps = useGaps();
  const obligations = useObligations();
  const remediations = useRemediations();

  return (
    <PageFrame
      eyebrow="Exposure register · sorted by risk score"
      title="Gaps"
      subtitle="Every finding traces to an RBI clause, a control decision and the evidence reviewed."
    >
      <Sheet className="table-sheet">
        <QueryView query={gaps} what="gaps" rows={8}>
          {(items) => (
            <GapsRegister
              items={items}
              obligations={obligations.data ?? []}
              remediations={remediations.data ?? []}
            />
          )}
        </QueryView>
      </Sheet>
    </PageFrame>
  );
}

function GapsRegister({
  items,
  obligations,
  remediations,
}: {
  items: Gap[];
  obligations: Obligation[];
  remediations: Remediation[];
}) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const priority = (params.get("priority") ?? "all") as PriorityFilter;
  const status = (params.get("status") ?? "all") as StatusFilter;
  const origin = (params.get("origin") ?? "all") as OriginFilter;

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
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

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (priority !== "all" && item.priority !== priority) return false;
      if (status !== "all" && item.status !== status) return false;
      if (origin === "change" && item.origin !== "change") return false;
      const obligation = obligationById.get(item.obligation_id);
      return `${item.code} ${item.title} ${obligation?.clause_ref ?? ""}`
        .toLowerCase()
        .includes(needle);
    });
  }, [items, query, priority, status, origin, obligationById]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <div className="table-toolbar wrap">
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
          label="Status"
          value={status}
          options={STATUS_FILTERS}
          onChange={(value) => {
            setFilter("status", value);
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
        <span className="result-count">{filtered.length} gaps</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No gaps match these filters."
          description="Clear a filter to see the full register."
          action={
            <Button
              size="sm"
              onClick={() => {
                setParams(new URLSearchParams(), { replace: true });
                setQuery("");
              }}
            >
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
                <th scope="col">Priority</th>
                <th scope="col">Finding</th>
                <th scope="col" className="hide-md">
                  Source
                </th>
                <th scope="col" className="hide-sm">
                  Type
                </th>
                <th scope="col" className="numeric">
                  Score
                </th>
                <th scope="col" className="hide-sm">
                  Status
                </th>
                <th scope="col" className="hide-md">
                  Remediation
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const obligation = obligationById.get(item.obligation_id);
                const remediation = remediationByGap.get(item.id);
                return (
                  <tr
                    key={item.id}
                    className="clickable"
                    onClick={() => {
                      void navigate(`/gaps/${item.id}`);
                    }}
                  >
                    <td>
                      <PriorityChip value={item.priority} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="row-link finding"
                        onClick={(event) => {
                          event.stopPropagation();
                          void navigate(`/gaps/${item.id}`);
                        }}
                      >
                        <span className="mono">{item.code}</span>
                        <strong>{item.title}</strong>
                      </button>
                    </td>
                    <td className="hide-md">
                      <span className="mono muted">
                        {obligation ? `${obligation.source_label} · ${obligation.clause_ref}` : "—"}
                      </span>
                    </td>
                    <td className="hide-sm">
                      <span className="gap-type">
                        {GAP_TYPE[item.gap_type].label}
                        {item.origin === "change" ? <small>From change</small> : null}
                      </span>
                    </td>
                    <td className="numeric">
                      <strong
                        className="score"
                        title={`criticality ${String(item.risk_factors.criticality)} × severity ${String(item.risk_factors.severity)} × urgency ${String(item.risk_factors.urgency)}`}
                      >
                        {formatScore(item.risk_score)}
                      </strong>
                    </td>
                    <td className="hide-sm">
                      <LabelTag value={GAP_STATUS[item.status]} />
                    </td>
                    <td className="hide-md">
                      {remediation ? (
                        <LabelTag value={REMEDIATION_STATUS[remediation.status]} />
                      ) : (
                        <span className="muted">None</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="pagination">
        <span>
          Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
          {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
        </span>
        <div>
          <IconButton
            label="Previous page"
            disabled={currentPage === 1}
            onClick={() => {
              setPage(currentPage - 1);
            }}
          >
            <ChevronLeft size={17} />
          </IconButton>
          <span>
            Page {currentPage} of {pageCount}
          </span>
          <IconButton
            label="Next page"
            disabled={currentPage === pageCount}
            onClick={() => {
              setPage(currentPage + 1);
            }}
          >
            <ChevronRight size={17} />
          </IconButton>
        </div>
      </div>
    </>
  );
}
