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
          const modified = data.changes.filter((item) => item.change_type === "modified");
          const withdrawn = data.changes.filter((item) => item.change_type === "withdrawn");
          const consolidated = data.changes.find((item) => item.change_type === "consolidated");
          const newGaps = new Set(data.changes.flatMap((item) => item.impact.gaps));
          return (
            <>
              <Sheet className="compare-head">
                <div>
                  <span className="eyebrow">Earlier version</span>
                  <strong className="serif struck">{data.old_document.title}</strong>
                  <span className="mono">
                    {data.old_document.version_label} · {data.old_document.reference}
                  </span>
                </div>
                <span className="compare-arrow" aria-hidden="true">
                  →
                </span>
                <div>
                  <span className="eyebrow">Later version</span>
                  <strong className="serif">{data.new_document.title}</strong>
                  <span className="mono">
                    {data.new_document.version_label} · {data.new_document.reference}
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
                    value: consolidated?.carried_over.length ?? 0,
                    note: "Consolidated, not new",
                  },
                  {
                    label: "New gaps",
                    value: newGaps.size,
                    note: [...newGaps].join(", ") || "None",
                  },
                ]}
              />

              <div className="notice warning corpus-gap" role="note">
                <FileQuestion size={18} aria-hidden="true" />
                <div>
                  <strong>The v2 Annex withdraws 5 circulars. Only 1 is in the corpus.</strong>
                  <span>
                    Not ingested:{" "}
                    {data.missing_circulars
                      .map((item) => `${item.date} (row ${String(item.row)})`)
                      .join(", ")}
                    . The 24 Apr 2025 circular, “Revised Timeline for Implementation”, is missing,
                    so the timeline history may be incomplete. RuleSight has not inferred what these
                    circulars say.
                  </span>
                  <ul className="missing-list">
                    {data.missing_circulars.map((item) => (
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

              <section className="change-list" aria-label="Changes">
                {data.changes
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

function markPhrases(text: string, phrases: string[], className: string): ReactNode {
  const phrase = phrases.find((candidate) => text.includes(candidate));
  if (!phrase) return text;
  const index = text.indexOf(phrase);
  return (
    <>
      {text.slice(0, index)}
      <mark className={className}>{phrase}</mark>
      {markPhrases(
        text.slice(index + phrase.length),
        phrases.filter((candidate) => candidate !== phrase),
        className,
      )}
    </>
  );
}

function ChangeCard({ change }: { change: RegulatoryChange }) {
  return (
    <Sheet className="change-card">
      <header>
        <span className="mono">{change.code}</span>
        <LabelTag value={CHANGE_TYPE[change.change_type]} />
        <LabelTag value={SIGNIFICANCE[change.significance]} outline />
      </header>
      <h2>{change.title}</h2>
      <p className="change-summary">{change.summary}</p>
      {change.before && change.after ? (
        <div className="compare-columns">
          <div className="compare-side before">
            <span className="eyebrow">Before · {change.before.ref}</span>
            <blockquote>
              {markPhrases(change.before.text, change.removed_phrases, "removed")}
            </blockquote>
          </div>
          <div className="compare-side after">
            <span className="eyebrow">After · {change.after.ref}</span>
            <blockquote>{markPhrases(change.after.text, change.added_phrases, "added")}</blockquote>
          </div>
        </div>
      ) : null}
      <footer className="impact">
        <span className="eyebrow">Impact</span>
        {change.impact.obligations.length +
          change.impact.controls.length +
          change.impact.gaps.length ===
        0 ? (
          <span className="muted">No obligations or controls affected.</span>
        ) : (
          <>
            {change.impact.obligations.map((code) => (
              <Link key={code} className="id-link" to={`/obligations?select=${code.toLowerCase()}`}>
                {code}
              </Link>
            ))}
            {change.impact.controls.map((code) => (
              <Link key={code} className="id-link" to="/controls">
                {code}
              </Link>
            ))}
            {change.impact.gaps.map((code) => (
              <Link key={code} className="id-link critical" to={`/gaps/${code.toLowerCase()}`}>
                {code} · new gap
              </Link>
            ))}
          </>
        )}
      </footer>
    </Sheet>
  );
}

function ConsolidatedRow({ change }: { change: RegulatoryChange }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet className="change-card consolidated">
      <header>
        <span className="mono">{change.code}</span>
        <LabelTag value={CHANGE_TYPE[change.change_type]} />
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
        the {change.carried_over.length} requirements
      </Button>
      {open ? (
        <ul className="carried-list">
          {change.carried_over.map((code) => (
            <li key={code}>
              <Link className="id-link" to={`/obligations?select=${code.toLowerCase()}`}>
                {code}
              </Link>{" "}
              carried over from DCM(NPD) No.S488 dated 01.07.2022 (not in corpus)
            </li>
          ))}
        </ul>
      ) : null}
    </Sheet>
  );
}
