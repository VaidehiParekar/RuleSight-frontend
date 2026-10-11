import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { QuoteBlock } from "@/components/data-display/quote-block";
import { LabelTag, StatusTag } from "@/components/data-display/status-tag";
import { EmptyState } from "@/components/feedback/empty-state";
import { QueryView } from "@/components/feedback/query-view";
import { useToast } from "@/components/feedback/toast-context";
import { PageFrame } from "@/components/layout/page-frame";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FilterGroup } from "@/components/ui/filter-group";
import { ReasonDialog } from "@/components/ui/reason-dialog";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { useObligations, useUpdateObligation } from "@/hooks/use-rulesight";
import { APPLICABILITY_LABEL, REVIEW_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Obligation } from "@/types/domain";

type SourceFilter = "all" | "kyc" | "nsm";
type ReviewFilter = "all" | "suggested" | "accepted" | "not_applicable";

const SOURCE_FILTERS = [
  { value: "all", label: "All sources" },
  { value: "kyc", label: "KYC MD 2016" },
  { value: "nsm", label: "NSM MD 2026" },
] as const;

const REVIEW_FILTERS = [
  { value: "all", label: "Any status" },
  { value: "suggested", label: "Awaiting review" },
  { value: "accepted", label: "Accepted" },
  { value: "not_applicable", label: "Not applicable" },
] as const;

function subtitle(items: Obligation[] | undefined): string {
  if (!items) return "Extracted obligations, with the verbatim source beside every field";
  const documents = new Set(items.map((item) => item.document_id)).size;
  const pending = items.filter((item) => item.review_status === "suggested").length;
  return `${String(items.length)} extracted from ${String(documents)} RBI documents · ${String(pending)} awaiting review`;
}

/** Single-key shortcuts must not fire while typing or while a dialog is open. */
function shortcutAllowed(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  ) {
    return false;
  }
  return document.querySelector("[role=dialog]") === null;
}

function matchesReview(item: Obligation, filter: ReviewFilter): boolean {
  if (filter === "all") return true;
  if (filter === "not_applicable") return item.applicability === "not_applicable";
  return item.review_status === filter;
}

export function ObligationsPage() {
  const obligations = useObligations();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const source = (params.get("source") ?? "all") as SourceFilter;
  const review = (params.get("review") ?? "all") as ReviewFilter;
  const selectedId = params.get("select");

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <PageFrame title="Obligations" subtitle={subtitle(obligations.data)}>
      <QueryView query={obligations} what="obligations" rows={8}>
        {(items) => (
          <ObligationsWorkspace
            items={items}
            query={query}
            onQuery={setQuery}
            source={source}
            review={review}
            selectedId={selectedId}
            onSource={(value) => {
              setParam("source", value);
            }}
            onReview={(value) => {
              setParam("review", value);
            }}
            onSelect={(id) => {
              setParam("select", id);
            }}
          />
        )}
      </QueryView>
    </PageFrame>
  );
}

interface WorkspaceProps {
  items: Obligation[];
  query: string;
  onQuery: (value: string) => void;
  source: SourceFilter;
  review: ReviewFilter;
  selectedId: string | null;
  onSource: (value: SourceFilter) => void;
  onReview: (value: ReviewFilter) => void;
  onSelect: (id: string) => void;
}

function ObligationsWorkspace({
  items,
  query,
  onQuery,
  source,
  review,
  selectedId,
  onSource,
  onReview,
  onSelect,
}: WorkspaceProps) {
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (source === "kyc" && item.document_id !== "doc-kyc") return false;
      if (source === "nsm" && item.document_id !== "doc-nsm-v2") return false;
      if (!matchesReview(item, review)) return false;
      return `${item.code} ${item.summary} ${item.clause_ref} ${item.topic}`
        .toLowerCase()
        .includes(needle);
    });
  }, [items, query, source, review]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!shortcutAllowed(event) || (event.key !== "j" && event.key !== "k")) return;
      const index = filtered.findIndex((item) => item.id === selected?.id);
      const next =
        filtered[
          event.key === "j" ? Math.min(filtered.length - 1, index + 1) : Math.max(0, index - 1)
        ];
      if (next) {
        event.preventDefault();
        onSelect(next.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [filtered, selected, onSelect]);

  return (
    <>
      <div className="toolbar">
        <SearchField value={query} onChange={onQuery} placeholder="Search obligations" />
        <FilterGroup label="Source" value={source} options={SOURCE_FILTERS} onChange={onSource} />
        <FilterGroup
          label="Review status"
          value={review}
          options={REVIEW_FILTERS}
          onChange={onReview}
        />
        <span className="result-count">{filtered.length} obligations</span>
      </div>
      <div className="split-view">
        <Sheet className="table-sheet">
          {filtered.length === 0 ? (
            <EmptyState
              title="No obligations match these filters."
              description="Clear the search or choose another status."
            />
          ) : (
            <div className="table-scroll">
              <table className="data-table selectable">
                <caption className="sr-only">Extracted obligations</caption>
                <thead>
                  <tr>
                    <th scope="col">Code</th>
                    <th scope="col">Obligation</th>
                    <th scope="col">Crit.</th>
                    <th scope="col" className="hide-sm">
                      Applicability
                    </th>
                    <th scope="col">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className={cn(item.id === selected?.id && "selected")}
                      aria-selected={item.id === selected?.id}
                      onClick={() => {
                        onSelect(item.id);
                      }}
                    >
                      <td>
                        <div className="mono code-cell">{item.code}</div>
                        <div className="cell-sub mono">{item.clause_ref}</div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="row-link"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelect(item.id);
                          }}
                        >
                          <strong className="cell-main">{item.summary}</strong>
                        </button>
                        <div className="cell-sub">
                          {item.topic} · {item.frequency ?? "Not specified"}
                        </div>
                        {item.applicability === "not_applicable" ? (
                          <p className="inline-reason">{item.applicability_reason}</p>
                        ) : null}
                      </td>
                      <td>
                        <Criticality value={item.criticality} />
                      </td>
                      <td className="hide-sm">
                        <StatusTag
                          tone={item.applicability === "applicable" ? "primary" : "neutral"}
                        >
                          {APPLICABILITY_LABEL[item.applicability]}
                        </StatusTag>
                      </td>
                      <td>
                        <LabelTag value={REVIEW_STATUS[item.review_status]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="kbd-hints" aria-label="Keyboard shortcuts">
            <span>
              <kbd>j</kbd> <kbd>k</kbd> move
            </span>
            <span>
              <kbd>a</kbd> accept
            </span>
            <span>
              <kbd>e</kbd> edit
            </span>
            <span>
              <kbd>r</kbd> reject
            </span>
          </div>
        </Sheet>
        {selected ? <SourcePanel key={selected.id} obligation={selected} /> : null}
      </div>
    </>
  );
}

function Criticality({ value }: { value: 1 | 2 | 3 }) {
  return (
    <span
      className="criticality"
      role="img"
      aria-label={`Criticality ${String(value)} of 3`}
      title={`Criticality ${String(value)} of 3`}
    >
      {"▮".repeat(value)}
      {"▯".repeat(3 - value)}
    </span>
  );
}

function SourcePanel({ obligation }: { obligation: Obligation }) {
  const update = useUpdateObligation();
  const { notify } = useToast();
  const [editing, setEditing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [draft, setDraft] = useState({
    action: obligation.action,
    frequency: obligation.frequency ?? "",
    deadline: obligation.deadline ?? "",
    threshold: obligation.threshold ?? "",
  });

  const fields: [string, string | null][] = [
    ["Actor", obligation.actor],
    ["Action", obligation.action],
    ["Condition", obligation.condition],
    ["Frequency", obligation.frequency],
    ["Deadline", obligation.deadline],
    ["Threshold", obligation.threshold],
  ];

  const accept = () => {
    update.mutate(
      { id: obligation.id, update: { review_status: "accepted" } },
      {
        onSuccess: () => {
          notify({ title: `${obligation.code} accepted` });
        },
      },
    );
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (editing || !shortcutAllowed(event)) return;
      if (event.key === "a" && obligation.review_status !== "accepted" && !update.isPending) {
        event.preventDefault();
        accept();
      } else if (event.key === "e") {
        event.preventDefault();
        setEditing(true);
      } else if (event.key === "r" && obligation.review_status !== "rejected") {
        event.preventDefault();
        setRejecting(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  });

  return (
    <Sheet className="source-panel" aria-label={`Source for ${obligation.code}`}>
      <div className="source-head">
        <span className="eyebrow">Source</span>
        <span className="mono">{obligation.code}</span>
      </div>
      <QuoteBlock
        text={obligation.source_quote}
        highlight={obligation.key_phrase}
        source={`${obligation.source_label} · ${obligation.clause_ref}${obligation.page ? ` · p. ${String(obligation.page)}` : ""}`}
        verified={obligation.quote_verified}
      />
      {obligation.applicability === "not_applicable" ? (
        <p className="empty-block neutral">
          <strong>Not applicable.</strong> {obligation.applicability_reason}
        </p>
      ) : null}

      {editing ? (
        <form
          className="edit-form"
          onSubmit={(event) => {
            event.preventDefault();
            update.mutate(
              {
                id: obligation.id,
                update: {
                  review_status: "edited",
                  fields: {
                    action: draft.action,
                    frequency: draft.frequency || null,
                    deadline: draft.deadline || null,
                    threshold: draft.threshold || null,
                  },
                },
              },
              {
                onSuccess: () => {
                  setEditing(false);
                  notify({ title: `${obligation.code} saved as edited` });
                },
              },
            );
          }}
        >
          <Field label="Action" full>
            {(props) => (
              <Textarea
                {...props}
                rows={2}
                value={draft.action}
                onChange={(event) => {
                  setDraft({ ...draft, action: event.target.value });
                }}
              />
            )}
          </Field>
          <Field label="Frequency">
            {(props) => (
              <Input
                {...props}
                value={draft.frequency}
                onChange={(event) => {
                  setDraft({ ...draft, frequency: event.target.value });
                }}
              />
            )}
          </Field>
          <Field label="Deadline">
            {(props) => (
              <Input
                {...props}
                value={draft.deadline}
                onChange={(event) => {
                  setDraft({ ...draft, deadline: event.target.value });
                }}
              />
            )}
          </Field>
          <Field label="Threshold" full>
            {(props) => (
              <Input
                {...props}
                value={draft.threshold}
                onChange={(event) => {
                  setDraft({ ...draft, threshold: event.target.value });
                }}
              />
            )}
          </Field>
          <div className="action-row">
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={update.isPending}>
              Save as edited
            </Button>
          </div>
        </form>
      ) : (
        <dl className="definition-list">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd className={value ? undefined : "not-specified"}>{value ?? "Not specified"}</dd>
            </div>
          ))}
        </dl>
      )}

      {!editing ? (
        <div className="source-actions">
          <Button
            variant="primary"
            size="sm"
            disabled={update.isPending || obligation.review_status === "accepted"}
            onClick={accept}
          >
            Accept
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditing(true);
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-critical"
            disabled={obligation.review_status === "rejected"}
            onClick={() => {
              setRejecting(true);
            }}
          >
            Reject
          </Button>
          <span className="muted">
            {obligation.review_status === "suggested"
              ? "Extracted by agent"
              : REVIEW_STATUS[obligation.review_status].label}
          </span>
        </div>
      ) : null}

      {rejecting ? (
        <ReasonDialog
          title={`Reject obligation ${obligation.code}`}
          body="The obligation is excluded from mapping and gap detection."
          confirmLabel="Reject obligation"
          pending={update.isPending}
          onCancel={() => {
            setRejecting(false);
          }}
          onConfirm={(reason) => {
            update.mutate(
              { id: obligation.id, update: { review_status: "rejected", reason } },
              {
                onSuccess: () => {
                  setRejecting(false);
                  notify({
                    title: `${obligation.code} rejected`,
                    detail: "The reason is in the audit log.",
                  });
                },
              },
            );
          }}
        />
      ) : null}
    </Sheet>
  );
}
