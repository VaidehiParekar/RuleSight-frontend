import { useState, type DragEvent, type SyntheticEvent } from "react";

import { useSession } from "@/app/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Listbox } from "@/components/ui/listbox";
import { useUploadDocument } from "@/hooks/use-rulesight";
import { describeError } from "@/lib/errors";
import { DOC_TYPE } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { DocType, SourceDocument } from "@/types/domain";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".md", ".txt", ".csv"];

interface UploadDialogProps {
  documents: SourceDocument[];
  onClose: () => void;
  onUploaded: (doc: SourceDocument) => void;
}

interface FormErrors {
  file?: string | undefined;
  title?: string | undefined;
  version?: string | undefined;
  regulator?: string | undefined;
}

/** The regulator of the most recently added regulation, to prefill the form. */
function latestRegulator(documents: SourceDocument[]): string {
  const latest = documents
    .filter((doc) => doc.doc_type === "regulation" && doc.regulator)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  return latest?.regulator ?? "";
}

function fileProblem(file: File): string | undefined {
  if (!ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))) {
    return "Use a PDF, Markdown, text or CSV file.";
  }
  if (file.size > MAX_BYTES) {
    return `This file is ${(file.size / 1048576).toFixed(1)} MB. The limit is 10 MB.`;
  }
  return undefined;
}

/** Validates type and size in the browser; the API validates again and dedupes by SHA-256. */
export function UploadDialog({ documents, onClose, onUploaded }: UploadDialogProps) {
  const { actor } = useSession();
  const upload = useUploadDocument();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [docType, setDocType] = useState<DocType>("regulation");
  const [title, setTitle] = useState("");
  const [regulator, setRegulator] = useState(() => latestRegulator(documents));
  const [version, setVersion] = useState("");
  const [supersedes, setSupersedes] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const candidates = documents.filter(
    (doc) => doc.doc_type === docType && doc.status !== "superseded",
  );

  const pickFile = (next: File | undefined) => {
    setDragging(false);
    if (!next) return;
    setFile(next);
    setErrors((current) => ({ ...current, file: fileProblem(next) }));
    if (!title.trim()) {
      setTitle(next.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
    }
  };

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: FormErrors = {
      file: file ? fileProblem(file) : "Choose a file to upload.",
      title: title.trim() ? undefined : "Enter a title.",
      version: version.trim() ? undefined : "Enter a version label, for example v2.",
      regulator:
        docType !== "regulation" || regulator.trim() ? undefined : "Enter the regulator.",
    };
    setErrors(nextErrors);
    if (
      !file ||
      nextErrors.file ||
      nextErrors.title ||
      nextErrors.version ||
      nextErrors.regulator
    ) {
      return;
    }

    upload.mutate(
      {
        file,
        file_name: file.name,
        file_size: file.size,
        doc_type: docType,
        title: title.trim(),
        regulator: docType === "regulation" ? regulator.trim() : null,
        version_label: version.trim(),
        supersedes_id: supersedes || null,
      },
      { onSuccess: onUploaded },
    );
  };

  const onDrag = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (!dragging) setDragging(true);
  };

  return (
    <Dialog
      title="Upload document"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={upload.isPending}>
            {upload.isPending ? "Uploading…" : "Upload and process"}
          </Button>
        </>
      }
    >
      <label
        className={cn("dropzone", dragging && "dragging", errors.file && "invalid")}
        onDragOver={onDrag}
        onDragLeave={() => {
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          pickFile(event.dataTransfer.files[0]);
        }}
      >
        <input
          type="file"
          accept={ALLOWED_EXTENSIONS.join(",")}
          aria-label="Document file"
          onChange={(event) => {
            pickFile(event.target.files?.[0]);
          }}
        />
        <strong>{file ? file.name : "Drop a PDF, Markdown, text or CSV file"}</strong>
        <span>
          {file
            ? `${(file.size / 1048576).toFixed(2)} MB · choose another file to replace it`
            : "or click to choose from your computer · 10 MB limit"}
        </span>
      </label>
      {errors.file ? (
        <p className="field-message error" role="alert">
          ✕ {errors.file}
        </p>
      ) : null}

      <div className="field">
        <span className="field-label" id="doc-type-label">
          Document type
        </span>
        <div className="segmented fill" role="radiogroup" aria-labelledby="doc-type-label">
          {(Object.keys(DOC_TYPE) as DocType[]).map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={docType === type}
              onClick={() => {
                setDocType(type);
                setSupersedes("");
              }}
            >
              {DOC_TYPE[type]}
            </button>
          ))}
        </div>
      </div>

      <Field label="Title" error={errors.title} full>
        {(props) => (
          <Input
            {...props}
            value={title}
            placeholder="Title as printed on the document"
            onChange={(event) => {
              setTitle(event.target.value);
              if (errors.title) setErrors({ ...errors, title: undefined });
            }}
          />
        )}
      </Field>

      <div className="form-grid">
        {docType === "regulation" ? (
          <Field label="Regulator" error={errors.regulator}>
            {(props) => (
              <Input
                {...props}
                value={regulator}
                placeholder="Issuing regulator, for example RBI"
                onChange={(event) => {
                  setRegulator(event.target.value);
                  if (errors.regulator) setErrors({ ...errors, regulator: undefined });
                }}
              />
            )}
          </Field>
        ) : null}
        <Field label="Version label" error={errors.version}>
          {(props) => (
            <Input
              {...props}
              value={version}
              placeholder="For example v2"
              onChange={(event) => {
                setVersion(event.target.value);
                if (errors.version) setErrors({ ...errors, version: undefined });
              }}
            />
          )}
        </Field>
      </div>

      <Field
        label="Supersedes"
        hint="Choosing a document here runs the change comparison after extraction."
        full
      >
        {(props) => (
          <Listbox
            {...props}
            value={supersedes}
            onChange={setSupersedes}
            options={[
              { value: "", label: "None" },
              ...candidates.map((doc) => ({
                value: doc.id,
                label: `${doc.title} · ${doc.version_label}`,
              })),
            ]}
          />
        )}
      </Field>

      <p className="recorded-as">
        Uploaded as{" "}
        <strong>
          {actor.name}, {actor.role}
        </strong>
        . The pipeline starts once the file is stored.
      </p>
      {upload.isError ? (
        <p className="field-message error" role="alert">
          {describeError(upload.error).message}
        </p>
      ) : null}
    </Dialog>
  );
}
