import { Activity, Check, Upload } from "lucide-react";
import { useMemo, useState } from "react";

import { useSession } from "@/app/auth-context";
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
import { useDocuments, useStartPipelineRun } from "@/hooks/use-rulesight";
import { formatDateTime } from "@/lib/format";
import { DOC_STATUS, DOC_TYPE } from "@/lib/labels";
import { PERMISSIONS } from "@/lib/roles";
import type { DocType, SourceDocument } from "@/types/domain";

const TYPE_ORDER: DocType[] = ["regulation", "policy", "rcm", "evidence"];

export function DocumentsPage() {
  const documents = useDocuments();
  const startRun = useStartPipelineRun();
  const { can } = useSession();
  const { notify } = useToast();
  const canRunPipeline = can(PERMISSIONS.runPipeline);
  const canUpload = can(PERMISSIONS.uploadDocuments);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SourceDocument | null>(null);
  const [query, setQuery] = useState("");

  const count = documents.data?.length ?? 0;

  return (
    <PageFrame
      eyebrow={`Library · ${String(count)} documents`}
      title="Documents"
      subtitle="Real RBI source text and fictional Nova Trust Bank materials, with provenance kept visible."
      action={
        <>
          {canRunPipeline ? (
            <Button
              icon={<Activity size={15} />}
              disabled={startRun.isPending}
              onClick={() => {
                startRun.mutate(undefined, {
                  onSuccess: (run) => {
                    setActiveRunId(run.id);
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
          ) : null}
          {canUpload ? (
            <Button
              variant="primary"
              icon={<Upload size={15} />}
              onClick={() => {
                setUploadOpen(true);
              }}
            >
              Upload document
            </Button>
          ) : null}
        </>
      }
    >
      {activeRunId ? (
        <PipelinePanel
          runId={activeRunId}
          onClose={() => {
            setActiveRunId(null);
          }}
        />
      ) : null}

      <Sheet className="table-sheet">
        <div className="table-toolbar">
          <div>
            <span className="eyebrow">Source register</span>
            <h2>Document corpus</h2>
          </div>
          <SearchField value={query} onChange={setQuery} placeholder="Search documents" />
        </div>
        <QueryView query={documents} what="documents" rows={6}>
          {(items) => (
            <DocumentTable
              documents={items}
              query={query}
              onSelect={(doc) => {
                setSelected(doc);
              }}
            />
          )}
        </QueryView>
      </Sheet>

      {uploadOpen ? (
        <UploadDialog
          documents={documents.data ?? []}
          onClose={() => {
            setUploadOpen(false);
          }}
          onUploaded={(doc) => {
            setUploadOpen(false);
            notify({
              title: "Document added to the processing queue",
              detail: `${doc.title} will show Ready when extraction finishes.`,
            });
          }}
        />
      ) : null}

      {selected ? (
        <DocumentDrawer
          document={selected}
          documents={documents.data ?? []}
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
      <table className="data-table">
        <caption className="sr-only">Document corpus, grouped by type</caption>
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">Type</th>
            <th scope="col">Version</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        {TYPE_ORDER.map((type) => {
          const rows = filtered.filter((doc) => doc.doc_type === type);
          if (rows.length === 0) return null;
          return (
            <tbody key={type}>
              <tr className="group-row">
                <th scope="rowgroup" colSpan={4}>
                  {DOC_TYPE[type]} · {rows.length}
                </th>
              </tr>
              {rows.map((doc) => (
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
                          <StatusTag tone="accent" outline>
                            Fictional bank
                          </StatusTag>
                        ) : (
                          <StatusTag tone="primary" outline>
                            RBI · Real text
                          </StatusTag>
                        )}
                        <span className="mono">{doc.reference}</span>
                      </span>
                    </div>
                  </td>
                  <td>{DOC_TYPE[doc.doc_type]}</td>
                  <td>
                    <span className={doc.status === "superseded" ? "mono struck" : "mono"}>
                      {doc.version_label}
                    </span>
                  </td>
                  <td>
                    <LabelTag
                      value={DOC_STATUS[doc.status]}
                      outline={doc.status === "superseded"}
                    />
                  </td>
                </tr>
              ))}
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
      <dl className="definition-list">
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
        <dt>Obligations extracted</dt>
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
          <Check size={16} aria-hidden="true" />
          <div>
            <strong>Marked withdrawn by the change agent</strong>
            <span>{document.withdrawn_note}</span>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
