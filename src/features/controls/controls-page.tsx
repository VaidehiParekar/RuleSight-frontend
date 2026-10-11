import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { GraphPath } from "@/components/data-display/graph-path";
import { QuoteBlock } from "@/components/data-display/quote-block";
import { LabelTag } from "@/components/data-display/status-tag";
import { QueryView } from "@/components/feedback/query-view";
import { useToast } from "@/components/feedback/toast-context";
import { PageFrame } from "@/components/layout/page-frame";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { Tabs } from "@/components/ui/tabs";
import { useControls, useMappings, useObligations, useUpdateMapping } from "@/hooks/use-rulesight";
import { COVERAGE, MAPPING_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Control, Mapping, Obligation } from "@/types/domain";

type Tab = "controls" | "matrix";

export function ControlsPage() {
  const controls = useControls();
  const mappings = useMappings();
  const obligations = useObligations();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "matrix" ? "matrix" : "controls";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  return (
    <PageFrame
      title="Controls"
      subtitle="The bank's controls and how each RBI obligation maps to them. Mappings show the graph path and critic result, never a confidence score."
    >
      <Tabs
        label="Controls views"
        value={tab}
        tabs={[
          { value: "controls", label: "Control register" },
          { value: "matrix", label: "Mapping matrix" },
        ]}
        onChange={(value) => {
          setParams(value === "matrix" ? { tab: "matrix" } : {}, { replace: true });
        }}
      />
      <Sheet className="table-sheet" role="tabpanel">
        <QueryView query={controls} what="controls" rows={8}>
          {(controlItems) =>
            tab === "controls" ? (
              <ControlRegister
                controls={controlItems}
                mappings={mappings.data ?? []}
                query={query}
                onQuery={setQuery}
                onSelect={setSelectedId}
              />
            ) : (
              <MappingMatrix
                controls={controlItems}
                mappings={mappings.data ?? []}
                obligations={obligations.data ?? []}
                onSelect={setSelectedId}
              />
            )
          }
        </QueryView>
      </Sheet>
      {selectedId && controls.data ? (
        <ControlDrawer
          control={controls.data.find((item) => item.id === selectedId) ?? null}
          mappings={(mappings.data ?? []).filter((item) => item.control_id === selectedId)}
          obligations={obligations.data ?? []}
          onClose={() => {
            setSelectedId(null);
          }}
        />
      ) : null}
    </PageFrame>
  );
}

function ControlRegister({
  controls,
  mappings,
  query,
  onQuery,
  onSelect,
}: {
  controls: Control[];
  mappings: Mapping[];
  query: string;
  onQuery: (value: string) => void;
  onSelect: (id: string) => void;
}) {
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return controls.filter((item) =>
      `${item.code} ${item.name} ${item.owner} ${item.rbi_reference}`
        .toLowerCase()
        .includes(needle),
    );
  }, [controls, query]);
  return (
    <>
      <div className="table-toolbar">
        <div>
          <span className="eyebrow">Risk control matrix</span>
          <h2>{controls.length} controls</h2>
        </div>
        <SearchField value={query} onChange={onQuery} placeholder="Search controls" />
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <caption className="sr-only">Nova Trust controls</caption>
          <thead>
            <tr>
              <th scope="col">Control</th>
              <th scope="col" className="hide-sm">
                Owner
              </th>
              <th scope="col" className="hide-md">
                Frequency
              </th>
              <th scope="col" className="hide-md">
                Type
              </th>
              <th scope="col" className="hide-sm">
                RBI reference
              </th>
              <th scope="col" className="numeric">
                Mapped
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((control) => (
              <tr
                key={control.id}
                className="clickable"
                onClick={() => {
                  onSelect(control.id);
                }}
              >
                <td>
                  <button
                    type="button"
                    className="row-link"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(control.id);
                    }}
                  >
                    <span className="mono">{control.code}</span>
                    <strong>{control.name}</strong>
                  </button>
                </td>
                <td className="hide-sm">{control.owner}</td>
                <td className="hide-md">{control.frequency}</td>
                <td className="hide-md">
                  {control.control_type} · {control.automation}
                </td>
                <td className="hide-sm">
                  <span className="mono muted">{control.rbi_reference}</span>
                </td>
                <td className="numeric">
                  {mappings.filter((item) => item.control_id === control.id).length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MappingMatrix({
  controls,
  mappings,
  obligations,
  onSelect,
}: {
  controls: Control[];
  mappings: Mapping[];
  obligations: Obligation[];
  onSelect: (id: string) => void;
}) {
  const applicable = obligations.filter((item) => item.applicability === "applicable");
  return (
    <>
      <div className="table-toolbar">
        <div>
          <span className="eyebrow">Obligation × control</span>
          <h2>Mapping matrix</h2>
        </div>
        <div className="matrix-legend" aria-label="Legend">
          {(["covered", "partial", "insufficient_info", "none"] as const).map((key) => (
            <span key={key} className={`glyph ${COVERAGE[key].tone}`}>
              {COVERAGE[key].glyph} {COVERAGE[key].label}
            </span>
          ))}
        </div>
      </div>
      <div className="table-scroll">
        <table className="data-table matrix">
          <caption className="sr-only">
            Coverage of each applicable obligation by each control
          </caption>
          <thead>
            <tr>
              <th scope="col">Obligation</th>
              {controls.map((control) => (
                <th scope="col" key={control.id} className="matrix-col">
                  <button
                    type="button"
                    className="link-button mono"
                    onClick={() => {
                      onSelect(control.id);
                    }}
                  >
                    {control.code}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {applicable.map((obligation) => {
              const rowMappings = mappings.filter((item) => item.obligation_id === obligation.id);
              return (
                <tr key={obligation.id}>
                  <th scope="row">
                    <span className="mono">{obligation.code}</span>
                    <span className="matrix-summary">{obligation.summary}</span>
                  </th>
                  {controls.map((control) => {
                    const mapping = rowMappings.find((item) => item.control_id === control.id);
                    if (!mapping) {
                      const orphan = rowMappings.length === 0 && obligation.coverage === "none";
                      return (
                        <td key={control.id} className="matrix-cell">
                          {orphan && control === controls[0] ? (
                            <span
                              className="glyph critical"
                              title="No control covers this obligation"
                            >
                              ○ none
                            </span>
                          ) : null}
                        </td>
                      );
                    }
                    const coverage = COVERAGE[mapping.coverage];
                    return (
                      <td key={control.id} className="matrix-cell">
                        <span
                          className={cn("glyph", coverage.tone)}
                          title={`${obligation.code} → ${control.code}: ${coverage.label}`}
                        >
                          {coverage.glyph}
                          <span className="sr-only">{coverage.label}</span>
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ControlDrawer({
  control,
  mappings,
  obligations,
  onClose,
}: {
  control: Control | null;
  mappings: Mapping[];
  obligations: Obligation[];
  onClose: () => void;
}) {
  const update = useUpdateMapping();
  const { notify } = useToast();
  if (!control) return null;
  return (
    <Drawer
      eyebrow={`${control.code} · ${control.source_document} ${control.source_section}`}
      title={control.name}
      onClose={onClose}
    >
      <QuoteBlock
        text={control.description}
        source={`${control.source_document} · Fictional bank`}
        size="compact"
      />
      <dl className="definition-list">
        <div>
          <dt>Owner</dt>
          <dd>{control.owner}</dd>
        </div>
        <div>
          <dt>Frequency</dt>
          <dd>{control.frequency}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>
            {control.control_type} · {control.automation}
          </dd>
        </div>
        <div>
          <dt>Evidence expected</dt>
          <dd>{control.evidence_expected}</dd>
        </div>
        <div>
          <dt>RBI reference</dt>
          <dd className="mono">{control.rbi_reference}</dd>
        </div>
      </dl>
      <h3 className="drawer-section">Mapped obligations · {mappings.length}</h3>
      {mappings.length === 0 ? (
        <p className="muted">No obligations are mapped to this control.</p>
      ) : null}
      {mappings.map((mapping) => {
        const obligation = obligations.find((item) => item.id === mapping.obligation_id);
        return (
          <article className="mapping-card" key={mapping.id}>
            <header>
              <span className="mono">{obligation?.code}</span>
              <strong>{obligation?.summary}</strong>
            </header>
            <p className="tag-row">
              <LabelTag value={COVERAGE[mapping.coverage]} />
              <LabelTag
                value={MAPPING_STATUS[mapping.status]}
                outline={mapping.status === "suggested"}
              />
            </p>
            <GraphPath path={mapping.graph_path} critic={mapping.critic} />
            <p className="rationale">{mapping.rationale}</p>
            <div className="action-row">
              <Button
                size="sm"
                variant="primary"
                icon={<Check size={14} />}
                disabled={mapping.status === "accepted" || update.isPending}
                onClick={() => {
                  update.mutate(
                    { id: mapping.id, status: "accepted" },
                    {
                      onSuccess: () => {
                        notify({
                          title: `Mapping ${obligation?.code ?? ""} → ${control.code} accepted`,
                        });
                      },
                    },
                  );
                }}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={<X size={14} />}
                disabled={mapping.status === "rejected" || update.isPending}
                onClick={() => {
                  update.mutate(
                    { id: mapping.id, status: "rejected" },
                    {
                      onSuccess: () => {
                        notify({
                          title: `Mapping ${obligation?.code ?? ""} → ${control.code} rejected`,
                          tone: "neutral",
                        });
                      },
                    },
                  );
                }}
              >
                Reject
              </Button>
            </div>
          </article>
        );
      })}
    </Drawer>
  );
}
