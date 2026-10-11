import { useMemo, useState } from "react";

import { LabelTag, StatusTag } from "@/components/data-display/status-tag";
import { EmptyState } from "@/components/feedback/empty-state";
import { QueryView } from "@/components/feedback/query-view";
import { useToast } from "@/components/feedback/toast-context";
import { PageFrame } from "@/components/layout/page-frame";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { PipelinePanel } from "@/features/documents/pipeline-panel";
import { UploadDialog } from "@/features/documents/upload-dialog";
import { useDocuments, useRuns, useStartPipelineRun } from "@/hooks/use-rulesight";
import { formatDate, formatDateTime } from "@/lib/format";
import { DOC_STATUS, DOC_TYPE } from "@/lib/labels";
import type { DocType, SourceDocument } from "@/types/domain";

const TYPE_ORDER: DocType[] = ["regulation", "policy", "rcm", "evidence"];

const GROUP_LABEL: Record<DocType, string> = {
  regulation: "Regulations",
  policy: "Policies",
  rcm: "Risk control matrix",
  evidence: "Evidence",
};

export function DocumentsPage() {
  const documents = useDocuments();
  const runs = useRuns();
  const startRun = useStartPipelineRun();
  const { notify } = useToast();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [panelHidden, setPanelHidden] = useState(false);
  const [selected, setSelected] = useState<SourceDocument | null>(null);
  const [query, setQuery] = useState("");

  const items = documents.data ?? [];
  const real = items.filter((doc) => !doc.is_synthetic).length;
  const shownRunId = panelHidden ? null : (activeRunId ?? runs.data?.[0]?.id ?? null);

  return (
    <PageFrame
      title="Documents"
      subtitle={
        documents.data
          ? `${String(real)} RBI documents (real text) and ${String(items.length - real)} Nova Trust Bank documents (fictional)`
          : "Real RBI source text and fictional Nova Trust Bank materials"
      }
      action={
        <>
          <Button
            disabled={startRun.isPending}
            onClick={() => {
              startRun.mutate(undefined, {
                onSuccess: (run) => {
                  setActiveRunId(run.id);
                  setPanelHidden(false);
                  notify({
                    title: "Pipeline started",
                    detail: `Run ${run.run_id} is processing all ready documents.`,
                  });
                },
              });
            }}
          >
            Run pipeline
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setUploadOpen(true);
            }}
          >
            Upload document
          </Button>
        </>
      }
    >
      {shownRunId ? (
        <PipelinePanel
          runId={shownRunId}
          onClose={() => {
            setPanelHidden(true);
          }}
        />
      ) : null}

      <div className="toolbar">
        <SearchField value={query} onChange={setQuery} placeholder="Search documents" />
      </div>
      <Sheet className="table-sheet">
        <QueryView query={documents} what="documents" rows={6}>
          {(loaded) => <DocumentTable documents={loaded} query={query} onSelect={setSelected} />}
        </QueryView>
      </Sheet>

      {uploadOpen ? (
        <UploadDialog
          documents={items}
          onClose={() => {
            setUploadOpen(false);
          }}
          onUploaded={(doc) => {
            setUploadOpen(false);
            notify({
              title: `“${doc.title}” uploaded`,
              detail: "Processing has started. It shows Ready when extraction finishes.",
            });
          }}
        />
      ) : null}

      {selected ? (
        <DocumentDrawer
          document={selected}
          documents={items}
          onClose={() => {
            setSelected(null);
          }}
        />
      ) : null}
    </PageFrame>
  );
}

function DocumentTable({
  documents,
  query,
  onSelect,
}: {
  documents: SourceDocument[];
  query: string;
  onSelect: (doc: SourceDocument) => void;
}) {
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return documents.filter((doc) =>
      `${doc.title} ${doc.reference} ${doc.version_label}`.toLowerCase().includes(needle),
    );
  }, [documents, query]);
  const byId = useMemo(() => new Map(documents.map((doc) => [doc.id, doc])), [documents]);

  if (filtered.length === 0) {
    return (
      <EmptyState
        title="No documents match this search."
        description="Clear the search, or upload a regulation, policy, RCM or evidence file."
      />
    );
  }

  return (
    <div className="table-scroll">
      <table className="data-table documents-table">
        <caption className="sr-only">Document corpus, grouped by type</caption>
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">Version</th>
            <th scope="col" className="hide-sm">
              Supersedes
            </th>
            <th scope="col">Status</th>
            <th scope="col" className="numeric hide-sm">
              Added
            </th>
          </tr>
        </thead>
        {TYPE_ORDER.map((type) => {
          const rows = filtered.filter((doc) => doc.doc_type === type);
          if (rows.length === 0) return null;
          return (
            <tbody key={type}>
              <tr className="group-row">
                <th scope="rowgroup" colSpan={5}>
                  {GROUP_LABEL[type]}
                </th>
              </tr>
              {rows.map((doc) => {
                const supersedes = doc.supersedes_id ? byId.get(doc.supersedes_id) : undefined;
                return (
                  <tr
                    key={doc.id}
                    className="clickable"
                    onClick={() => {
                      onSelect(doc);
                    }}
                  >
                    <td>
                      <div className="doc-title">
                        <button
                          type="button"
                          className="link-button serif"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelect(doc);
                          }}
                        >
                          {doc.title}
                        </button>
                        <span className="doc-meta">
                          {doc.is_synthetic ? (
                            <StatusTag tone="accent" small>
                              Fictional bank
                            </StatusTag>
                          ) : (
                            <StatusTag tone="primary" outline small>
                              {doc.regulator ?? "RBI"} · Real text
                            </StatusTag>
                          )}
                          <span className="mono">{doc.reference}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={doc.status === "superseded" ? "mono muted struck" : "mono muted"}
                      >
                        {doc.version_label}
                      </span>
                    </td>
                    <td className="hide-sm">
                      {supersedes ? (
                        <span className="id-link primary">{supersedes.version_label}</span>
                      ) : (
                        <span className="mono muted">—</span>
                      )}
                    </td>
                    <td>
                      <span title={doc.withdrawn_note ?? undefined}>
                        <LabelTag value={DOC_STATUS[doc.status]} />
                      </span>
                    </td>
                    <td className="numeric muted nowrap hide-sm">{formatDate(doc.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

function DocumentDrawer({
  document,
  documents,
  onClose,
}: {
  document: SourceDocument;
  documents: SourceDocument[];
  onClose: () => void;
}) {
  const supersedes = documents.find((doc) => doc.id === document.supersedes_id);
  const supersededBy = documents.find((doc) => doc.supersedes_id === document.id);
  return (
    <Drawer eyebrow={DOC_TYPE[document.doc_type]} title={document.title} onClose={onClose}>
      <dl className="definition-list wide-terms">
        <dt>Reference</dt>
        <dd className="mono">{document.reference}</dd>
        <dt>Version</dt>
        <dd>{document.version_label}</dd>
        <dt>Status</dt>
        <dd>
          <LabelTag value={DOC_STATUS[document.status]} />
        </dd>
        <dt>Source</dt>
        <dd>
          {document.is_synthetic
            ? "Fictional bank document (is_synthetic = true)"
            : "Real RBI text"}
        </dd>
        <dt>Added</dt>
        <dd>{formatDateTime(document.created_at)}</dd>
        <dt>Obligations</dt>
        <dd>{document.doc_type === "regulation" ? document.obligation_count : "Not applicable"}</dd>
        <dt>SHA-256</dt>
        <dd className="mono">{document.sha256 || "Computed by the backend on upload"}</dd>
        {supersedes ? (
          <>
            <dt>Supersedes</dt>
            <dd>{supersedes.title}</dd>
          </>
        ) : null}
        {supersededBy ? (
          <>
            <dt>Superseded by</dt>
            <dd>{supersededBy.title}</dd>
          </>
        ) : null}
      </dl>
      {document.withdrawn_note ? (
        <div className="notice critical">
          <div>
            <strong>Marked withdrawn by the change agent</strong>
            <span>{document.withdrawn_note}</span>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
