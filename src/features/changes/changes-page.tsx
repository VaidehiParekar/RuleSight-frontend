import { useState, type ReactNode } from "react";
import { Link } from "react-router";

import { LabelTag } from "@/components/data-display/status-tag";
import { QueryView } from "@/components/feedback/query-view";
import { PageFrame } from "@/components/layout/page-frame";
import { Sheet } from "@/components/ui/sheet";
import { useChangeComparison, useGaps, useObligations } from "@/hooks/use-rulesight";
import { CHANGE_TYPE, SIGNIFICANCE } from "@/lib/labels";
import type { Gap, Obligation, RegulatoryChange, SourceDocument } from "@/types/domain";

/** Obligation-level comparison of NSM v1 (2024 circular) and v2 (2026 Master Direction). */
export function ChangesPage() {
  const comparison = useChangeComparison();
  const gaps = useGaps();
  const obligations = useObligations();

  return (
    <PageFrame
      title="Changes"
      subtitle="Obligation-level comparison of two versions of an RBI instrument"
    >
      <QueryView query={comparison} what="the comparison" rows={8}>
        {(data) => {
          const modified = data.changes.filter((item) => item.change_type === "modified");
          const withdrawn = data.changes.filter((item) => item.change_type === "withdrawn");
          const consolidated = data.changes.find((item) => item.change_type === "consolidated");
          const newGaps = [...new Set(data.changes.flatMap((item) => item.impact.gaps))];
          const gapByCode = new Map((gaps.data ?? []).map((gap) => [gap.code, gap]));
          const summary: { label: string; n: number; glyph: string; tone: string; note: string }[] =
            [
              {
                label: "Modified",
                n: modified.length,
                glyph: "~",
                tone: "warning",
                note: modified.map((item) => item.code).join(", ") || "None",
              },
              {
                label: "Withdrawn",
                n: withdrawn.length,
                glyph: "−",
                tone: "critical",
                note: withdrawn.map((item) => item.code).join(", ") || "None",
              },
              {
                label: "Carried over",
                n: consolidated?.carried_over.length ?? 0,
                glyph: "=",
                tone: "neutral",
                note: consolidated ? `${consolidated.code} · not new` : "None",
              },
              {
                label: "Corpus gaps",
                n: data.missing_circulars.length,
                glyph: "?",
                tone: "warning",
                note: "Withdrawn circulars not ingested",
              },
              {
                label: "New gaps",
                n: newGaps.length,
                glyph: "+",
                tone: "critical",
                note:
                  newGaps
                    .map(
                      (code) =>
                        `${code}${gapByCode.get(code) ? ` · ${gapByCode.get(code)?.priority ?? ""}` : ""}`,
                    )
                    .join(", ") || "None",
              },
            ];
          const annexTotal = data.missing_circulars.length + withdrawn.length;
          return (
            <>
              <div className="compare-pickers">
                <VersionField label="Earlier version" document={data.old_document} />
                <VersionField label="Later version" document={data.new_document} />
              </div>

              <div className="summary-strip" role="list" aria-label="Change summary">
                {summary.map((item) => (
                  <div key={item.label} role="listitem">
                    <span className="eyebrow">{item.label}</span>
                    <strong>
                      {item.n}
                      <i className={`text-${item.tone}`} aria-hidden="true">
                        {item.glyph}
                      </i>
                    </strong>
                    <span>{item.note}</span>
                  </div>
                ))}
              </div>

              <section className="corpus-gap" role="note">
                <span className="q-mark" aria-hidden="true">
                  ?
                </span>
                <div>
                  <h3>Corpus gap: withdrawn circulars not in corpus</h3>
                  <p>
                    The v2 Annex withdraws {annexTotal} circulars. Only {withdrawn.length} is in the
                    corpus. Not ingested:{" "}
                    {data.missing_circulars.map((item) => item.date).join(", ")}. The 24 Apr 2025
                    circular, “Revised Timeline for Implementation”, is missing, so the timeline
                    history may be incomplete. RuleSight has not inferred what these circulars say.
                  </p>
                  <ul className="missing-list">
                    {data.missing_circulars.map((item) => (
                      <li key={item.row}>
                        <span className="mono">{item.reference}</span> · {item.date} ·{" "}
                        {item.subject}
                      </li>
                    ))}
                  </ul>
                  <Link className="button accent small" to="/documents">
                    Upload missing circular
                  </Link>
                </div>
              </section>

              <section className="change-list" aria-label="Changes">
                {data.changes
                  .filter((item) => item.change_type !== "consolidated")
                  .map((item) => (
                    <ChangeCard key={item.id} change={item} gapByCode={gapByCode} />
                  ))}
                {consolidated ? (
                  <ConsolidatedRow change={consolidated} obligations={obligations.data ?? []} />
                ) : null}
              </section>
            </>
          );
        }}
      </QueryView>
    </PageFrame>
  );
}

function VersionField({ label, document }: { label: string; document: SourceDocument }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <span className="control listbox-trigger" title={document.reference}>
        <span className="listbox-value">
          {document.title} · {document.version_label}
        </span>
      </span>
    </div>
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

function ChangeCard({
  change,
  gapByCode,
}: {
  change: RegulatoryChange;
  gapByCode: Map<string, Gap>;
}) {
  const compared = change.change_type === "modified" && change.before && change.after;
  const hasImpact =
    change.impact.obligations.length + change.impact.controls.length + change.impact.gaps.length >
    0;
  return (
    <Sheet className="change-card">
      <header className={compared ? "ruled" : undefined}>
        <LabelTag value={CHANGE_TYPE[change.change_type]} />
        <span className="mono muted">{change.code}</span>
        <strong>{change.title}</strong>
        <LabelTag value={SIGNIFICANCE[change.significance]} outline />
      </header>
      {compared && change.before && change.after ? (
        <div className="compare-columns">
          <div className="compare-side">
            <span className="eyebrow">Before · {change.before.ref}</span>
            <blockquote>
              {markPhrases(change.before.text, change.removed_phrases, "removed")}
            </blockquote>
          </div>
          <div className="compare-side">
            <span className="eyebrow">After · {change.after.ref}</span>
            <blockquote>
              {markPhrases(change.after.text, change.added_phrases, "added")}
              <span className="added-glyph" aria-label="added">
                +
              </span>
            </blockquote>
          </div>
        </div>
      ) : (
        <p className="change-summary">{change.summary}</p>
      )}
      {hasImpact ? (
        <footer className="impact">
          <span className="eyebrow">Impact</span>
          {change.impact.obligations.length ? (
            <span>
              Obligation{change.impact.obligations.length > 1 ? "s" : ""}{" "}
              {change.impact.obligations.map((code, index) => (
                <span key={code}>
                  {index ? ", " : ""}
                  <Link className="id-link" to={`/obligations?select=${code.toLowerCase()}`}>
                    {code}
                  </Link>
                </span>
              ))}
            </span>
          ) : null}
          {change.impact.controls.length ? (
            <span>
              Control{" "}
              {change.impact.controls.map((code) => (
                <Link key={code} className="id-link" to="/controls">
                  {code}
                </Link>
              ))}
            </span>
          ) : null}
          {change.impact.gaps.map((code) => (
            <span key={code}>
              New gap{" "}
              <Link className="id-link primary" to={`/gaps/${code.toLowerCase()}`}>
                {code}
                {gapByCode.get(code) ? ` · ${gapByCode.get(code)?.priority ?? ""}` : ""}
              </Link>
            </span>
          ))}
        </footer>
      ) : null}
    </Sheet>
  );
}

function ConsolidatedRow({
  change,
  obligations,
}: {
  change: RegulatoryChange;
  obligations: Obligation[];
}) {
  const [open, setOpen] = useState(false);
  const byCode = new Map(obligations.map((item) => [item.code, item]));
  return (
    <Sheet className="change-card">
      <button
        type="button"
        className="change-toggle"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        <LabelTag value={CHANGE_TYPE[change.change_type]} />
        <span className="mono muted">{change.code}</span>
        <span>{change.summary}</span>
        <span className="text-button">
          {open ? "Hide list" : `Show the ${String(change.carried_over.length)} requirements`}
        </span>
      </button>
      {open ? (
        <ul className="carried-list">
          {change.carried_over.map((code) => {
            const obligation = byCode.get(code);
            return (
              <li key={code}>
                <Link className="mono code-cell" to={`/obligations?select=${code.toLowerCase()}`}>
                  {code}
                </Link>
                <span className="mono muted">{obligation?.clause_ref ?? ""}</span>
                <span>{obligation?.summary ?? ""}</span>
                <span className="muted">Carried over</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Sheet>
  );
}
