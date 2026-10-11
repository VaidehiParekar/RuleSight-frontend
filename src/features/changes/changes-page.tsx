import { ChevronDown, FileQuestion, Upload } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";

import { KpiStrip } from "@/components/data-display/kpi-strip";
import { LabelTag } from "@/components/data-display/status-tag";
import { QueryView } from "@/components/feedback/query-view";
import { PageFrame } from "@/components/layout/page-frame";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useChangeComparison } from "@/hooks/use-rulesight";
import { CHANGE_TYPE, SIGNIFICANCE } from "@/lib/labels";
import type { RegulatoryChange } from "@/types/domain";

/** Obligation-level comparison of NSM v1 (2024 circular) and v2 (2026 Master Direction). */
export function ChangesPage() {
  const comparison = useChangeComparison();

  return (
    <PageFrame
      eyebrow="Change intelligence · obligation-level comparison"
      title="Changes"
      subtitle="What changed between versions, what was withdrawn, and which controls and gaps it affects."
    >
      <QueryView query={comparison} what="the comparison" rows={8}>
        {(data) => {
          const changes = data.changes ?? [];
          const modified = changes.filter((item) => item.change_type === "modified");
          const withdrawn = changes.filter((item) => item.change_type === "withdrawn");
          const consolidated = changes.find((item) => item.change_type === "consolidated");
          const newGaps = new Set(
            changes.flatMap((item) => item.impact?.gaps ?? []).filter(Boolean),
          );
          const missingCirculars = data.missing_circulars ?? [];
          return (
            <>
              <Sheet className="compare-head">
                <div>
                  <span className="eyebrow">Earlier version</span>
                  <strong className="serif struck">
                    {data.old_document?.title ?? "Earlier version"}
                  </strong>
                  <span className="mono">
                    {data.old_document?.version_label ?? ""} · {data.old_document?.reference ?? ""}
                  </span>
                </div>
                <span className="compare-arrow" aria-hidden="true">
                  →
                </span>
                <div>
                  <span className="eyebrow">Later version</span>
                  <strong className="serif">
                    {data.new_document?.title ?? "Later version"}
                  </strong>
                  <span className="mono">
                    {data.new_document?.version_label ?? ""} · {data.new_document?.reference ?? ""}
                  </span>
                </div>
              </Sheet>

              <KpiStrip
                label="Change summary"
                items={[
                  { label: "Modified", value: modified.length, note: "Requirement replaced" },
                  {
                    label: "Withdrawn",
                    value: withdrawn.length,
                    note: "Circular marked superseded",
                  },
                  {
                    label: "Carried over",
                    value: consolidated?.carried_over?.length ?? 0,
                    note: "Consolidated, not new",
                  },
                  {
                    label: "New gaps",
                    value: newGaps.size,
                    note: [...newGaps].join(", ") || "None",
                  },
                ]}
              />

              {missingCirculars.length > 0 ? (
                <div className="notice warning corpus-gap" role="note">
                  <FileQuestion size={18} aria-hidden="true" />
                  <div>
                    <strong>The v2 Annex withdraws 5 circulars. Only 1 is in the corpus.</strong>
                    <span>
                      Not ingested:{" "}
                      {missingCirculars
                        .map((item) => `${item.date} (row ${String(item.row)})`)
                        .join(", ")}
                      . The 24 Apr 2025 circular, “Revised Timeline for Implementation”, is missing,
                      so the timeline history may be incomplete. RuleSight has not inferred what these
                      circulars say.
                    </span>
                    <ul className="missing-list">
                      {missingCirculars.map((item) => (
                        <li key={item.row}>
                          <span className="mono">{item.reference}</span> · {item.date} ·{" "}
                          {item.subject}
                        </li>
                      ))}
                    </ul>
                    <Link className="button accent small" to="/documents">
                      <Upload size={14} /> Upload missing circular
                    </Link>
                  </div>
                </div>
              ) : null}

              <section className="change-list" aria-label="Changes">
                {changes
                  .filter((item) => item.change_type !== "consolidated")
                  .map((item) => (
                    <ChangeCard key={item.id} change={item} />
                  ))}
                {consolidated ? <ConsolidatedRow change={consolidated} /> : null}
              </section>
            </>
          );
        }}
      </QueryView>
    </PageFrame>
  );
}

function markPhrases(text: string, phrases: string[] | undefined, className: string): ReactNode {
  if (!text) return text;
  if (!phrases || phrases.length === 0) return text;
  const validPhrases = phrases.filter(Boolean);
  const phrase = validPhrases.find((candidate) => text.includes(candidate));
  if (!phrase) return text;
  const index = text.indexOf(phrase);
  return (
    <>
      {text.slice(0, index)}
      <mark className={className}>{phrase}</mark>
      {markPhrases(
        text.slice(index + phrase.length),
        validPhrases.filter((candidate) => candidate !== phrase),
        className,
      )}
    </>
  );
}

function ChangeCard({ change }: { change: RegulatoryChange }) {
  const code = change.code ?? change.clause_ref ?? change.id.toUpperCase();
  const changeType = CHANGE_TYPE[change.change_type] ?? {
    label: change.change_type,
    tone: "neutral",
  };
  const significance = SIGNIFICANCE[change.significance] ?? {
    label: change.significance,
    tone: "neutral",
  };

  const beforeSide =
    change.before ??
    (change.old_text
      ? { ref: `Earlier · ${change.clause_ref ?? "previous"}`, text: change.old_text }
      : null);
  const afterSide =
    change.after ??
    (change.new_text
      ? { ref: `Later · ${change.clause_ref ?? "current"}`, text: change.new_text }
      : null);

  const obligations = change.impact?.obligations ?? [];
  const controls = change.impact?.controls ?? [];
  const gaps = change.impact?.gaps ?? [];
  const graphEntities = change.impact?.graph_affected_entities ?? [];
  const totalImpacts = obligations.length + controls.length + gaps.length + graphEntities.length;

  return (
    <Sheet className="change-card">
      <header>
        <span className="mono">{code}</span>
        <LabelTag value={changeType} />
        <LabelTag value={significance} outline />
      </header>
      <h2>{change.title}</h2>
      <p className="change-summary">{change.summary}</p>
      {beforeSide && afterSide ? (
        <div className="compare-columns">
          <div className="compare-side before">
            <span className="eyebrow">Before · {beforeSide.ref}</span>
            <blockquote>
              {markPhrases(beforeSide.text, change.removed_phrases, "removed")}
            </blockquote>
          </div>
          <div className="compare-side after">
            <span className="eyebrow">After · {afterSide.ref}</span>
            <blockquote>{markPhrases(afterSide.text, change.added_phrases, "added")}</blockquote>
          </div>
        </div>
      ) : null}
      <footer className="impact">
        <span className="eyebrow">Impact</span>
        {totalImpacts === 0 ? (
          <span className="muted">No obligations or controls affected.</span>
        ) : (
          <>
            {obligations.map((itemCode) => (
              <Link key={itemCode} className="id-link" to={`/obligations?select=${itemCode.toLowerCase()}`}>
                {itemCode}
              </Link>
            ))}
            {controls.map((itemCode) => (
              <Link key={itemCode} className="id-link" to="/controls">
                {itemCode}
              </Link>
            ))}
            {gaps.map((itemCode) => (
              <Link key={itemCode} className="id-link critical" to={`/gaps/${itemCode.toLowerCase()}`}>
                {itemCode} · new gap
              </Link>
            ))}
            {graphEntities.map((itemCode) => (
              <span key={itemCode} className="id-link">
                {itemCode}
              </span>
            ))}
          </>
        )}
      </footer>
    </Sheet>
  );
}

function ConsolidatedRow({ change }: { change: RegulatoryChange }) {
  const [open, setOpen] = useState(false);
  const carriedOver = change.carried_over ?? [];
  const code = change.code ?? change.clause_ref ?? change.id.toUpperCase();
  const changeType = CHANGE_TYPE[change.change_type] ?? {
    label: change.change_type,
    tone: "neutral",
  };

  return (
    <Sheet className="change-card consolidated">
      <header>
        <span className="mono">{code}</span>
        <LabelTag value={changeType} />
      </header>
      <h2>{change.title}</h2>
      <p className="change-summary">{change.summary}</p>
      <Button
        size="sm"
        variant="ghost"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        <ChevronDown size={14} className={open ? "rotate" : undefined} /> {open ? "Hide" : "Show"}{" "}
        the {carriedOver.length} requirements
      </Button>
      {open ? (
        <ul className="carried-list">
          {carriedOver.map((itemCode) => (
            <li key={itemCode}>
              <Link className="id-link" to={`/obligations?select=${itemCode.toLowerCase()}`}>
                {itemCode}
              </Link>{" "}
              carried over from DCM(NPD) No.S488 dated 01.07.2022 (not in corpus)
            </li>
          ))}
        </ul>
      ) : null}
    </Sheet>
  );
}
