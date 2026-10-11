import { Upload } from "lucide-react";
import { useState, type SyntheticEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { useUploadDocument } from "@/hooks/use-rulesight";
import { describeError } from "@/lib/errors";
import { DOC_TYPE } from "@/lib/labels";
import type { DocType, SourceDocument } from "@/types/domain";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".md", ".txt", ".csv"];

interface UploadDialogProps {
  documents: SourceDocument[];
  onClose: () => void;
  onUploaded: (doc: SourceDocument) => void;
}

interface FormErrors {
  file?: string;
  title?: string;
}

/** Validates type and size in the browser; the API validates again and dedupes by SHA-256. */
export function UploadDialog({ documents, onClose, onUploaded }: UploadDialogProps) {
  const upload = useUploadDocument();
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocType>("regulation");
  const [title, setTitle] = useState("");
  const [regulator, setRegulator] = useState("RBI");
  const [version, setVersion] = useState("");
  const [supersedes, setSupersedes] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const candidates = documents.filter(
    (doc) => doc.doc_type === docType && doc.status !== "superseded",
  );

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (!file) {
      nextErrors.file = "Choose a file to upload.";
    } else if (!ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      nextErrors.file = "Only PDF, Markdown, text and CSV files are accepted.";
    } else if (file.size > MAX_BYTES) {
      nextErrors.file = "The file is larger than 10 MB.";
    }
    if (!title.trim()) {
      nextErrors.title = "Enter the official document title.";
    }
    setErrors(nextErrors);
    if (!file || Object.keys(nextErrors).length > 0) return;

    upload.mutate(
      {
        file_name: file.name,
        file_size: file.size,
        doc_type: docType,
        title: title.trim(),
        regulator: docType === "regulation" ? regulator.trim() || null : null,
        version_label: version.trim(),
        supersedes_id: supersedes || null,
      },
      { onSuccess: onUploaded },
    );
  };

  return (
    <Dialog
      eyebrow="Add to corpus"
      title="Upload document"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="upload-form" disabled={upload.isPending}>
            {upload.isPending ? "Uploading…" : "Upload and process"}
          </Button>
        </>
      }
    >
      <form id="upload-form" noValidate onSubmit={submit}>
        <label className={errors.file ? "dropzone invalid" : "dropzone"}>
          <Upload size={22} aria-hidden="true" />
          <strong>Drop a PDF, Markdown, text or CSV file</strong>
          <span>or choose a file · 10 MB maximum</span>
          <input
            type="file"
            accept={ALLOWED_EXTENSIONS.join(",")}
            aria-label="Document file"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
            }}
          />
          {file ? <em>{file.name}</em> : null}
        </label>
        {errors.file ? (
          <p className="field-message error" role="alert">
            {errors.file}
          </p>
        ) : null}

        <div className="form-grid">
          <Field label="Document type">
            {(props) => (
              <Select
                {...props}
                value={docType}
                onChange={(event) => {
                  setDocType(event.target.value as DocType);
                  setSupersedes("");
                }}
              >
                {(Object.keys(DOC_TYPE) as DocType[]).map((type) => (
                  <option key={type} value={type}>
                    {DOC_TYPE[type]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label="Regulator"
            hint={docType === "regulation" ? undefined : "Only used for regulations"}
          >
            {(props) => (
              <Input
                {...props}
                value={regulator}
                disabled={docType !== "regulation"}
                onChange={(event) => {
                  setRegulator(event.target.value);
                }}
              />
            )}
          </Field>
          <Field label="Title" error={errors.title} full>
            {(props) => (
              <Input
                {...props}
                value={title}
                placeholder="Official document title"
                onChange={(event) => {
                  setTitle(event.target.value);
                }}
              />
            )}
          </Field>
          <Field label="Version label">
            {(props) => (
              <Input
                {...props}
                value={version}
                placeholder="e.g. v2 · 2 Oct 2026"
                onChange={(event) => {
                  setVersion(event.target.value);
                }}
              />
            )}
          </Field>
          <Field label="Supersedes" hint="Triggers change and impact analysis">
            {(props) => (
              <Select
                {...props}
                value={supersedes}
                onChange={(event) => {
                  setSupersedes(event.target.value);
                }}
              >
                <option value="">Does not supersede</option>
                {candidates.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title} · {doc.version_label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        {upload.isError ? (
          <p className="field-message error" role="alert">
            {describeError(upload.error).message}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
