import { useMemo, useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { QueryView } from "@/components/feedback/query-view";
import { PageFrame } from "@/components/layout/page-frame";
import { FilterGroup, type FilterOption } from "@/components/ui/filter-group";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { useAudit } from "@/hooks/use-rulesight";
import { formatStamp } from "@/lib/format";
import type { AuditEntry } from "@/types/domain";

/** One chip per person (or the pipeline) that appears in the ledger. */
function actorFilters(items: AuditEntry[]): FilterOption<ActorFilter>[] {
  const actors = [...new Set(items.map((item) => item.actor))].sort((a, b) => a.localeCompare(b));
  return [{ value: "all", label: "Everyone" }, ...actors.map((name) => ({ value: name, label: name }))];
}

const ENTITY_FILTERS = [
  { value: "all", label: "All entities" },
  { value: "obligation", label: "Obligations" },
  { value: "mapping", label: "Mappings" },
  { value: "gap", label: "Gaps" },
  { value: "remediation", label: "Remediation" },
  { value: "document", label: "Documents" },
] as const;

/** "all", or an actor name as recorded in the ledger. */
type ActorFilter = string;
type EntityFilter = (typeof ENTITY_FILTERS)[number]["value"];

function initials(name: string): string {
  return name === "Pipeline"
    ? "PL"
    : name
        .split(" ")
        .map((part) => part.charAt(0))
        .join("");
}

/** Insert-only ledger of every write, with the actor and the before/after values. */
export function AuditPage() {
  const audit = useAudit();
  const [actor, setActor] = useState<ActorFilter>("all");
  const [entity, setEntity] = useState<EntityFilter>("all");
  const [query, setQuery] = useState("");

  return (
    <PageFrame
      title="Audit log"
      subtitle="Audit entries cannot be edited or deleted. Times in IST."
    >
      <div className="toolbar">
        <SearchField value={query} onChange={setQuery} placeholder="Search the audit log" />
        <FilterGroup
          label="Actor"
          value={actor}
          options={actorFilters(audit.data ?? [])}
          onChange={setActor}
        />
        <FilterGroup label="Entity" value={entity} options={ENTITY_FILTERS} onChange={setEntity} />
      </div>
      <Sheet className="table-sheet">
        <QueryView
          query={audit}
          what="the audit log"
          rows={8}
          empty={
            <EmptyState
              title="No audit entries yet"
              description="Every upload, pipeline run, review and approval is recorded here with who did it and why."
            />
          }
        >
          {(items) => <AuditTable items={items} actor={actor} entity={entity} query={query} />}
        </QueryView>
      </Sheet>
    </PageFrame>
  );
}

function AuditTable({
  items,
  actor,
  entity,
  query,
}: {
  items: AuditEntry[];
  actor: ActorFilter;
  entity: EntityFilter;
  query: string;
}) {
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (actor !== "all" && item.actor !== actor) return false;
      if (entity !== "all" && item.entity_type !== entity) return false;
      return `${item.action} ${item.entity_code} ${item.reason ?? ""}`
        .toLowerCase()
        .includes(needle);
    });
  }, [items, actor, entity, query]);

  if (filtered.length === 0) {
    return <EmptyState title="No audit entries match these filters." />;
  }

  return (
    <div className="table-scroll">
      <table className="data-table audit-table">
        <caption className="sr-only">Audit ledger, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Actor</th>
            <th scope="col">Action</th>
            <th scope="col">Entity</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item) => {
            const pipeline = item.actor === "Pipeline";
            return (
              <tr key={item.id}>
                <td className="mono muted nowrap">{formatStamp(item.at)}</td>
                <td>
                  <span className="actor-cell" title={item.actor_role}>
                    <span
                      className={pipeline ? "avatar small square" : "avatar small"}
                      aria-hidden="true"
                    >
                      {initials(item.actor)}
                    </span>
                    {item.actor}
                  </span>
                </td>
                <td>
                  {item.action}
                  {item.before && item.after ? (
                    <span className="mono muted">
                      {" "}
                      ({Object.values(item.before).join(", ")} →{" "}
                      {Object.values(item.after).join(", ")})
                    </span>
                  ) : null}
                  {item.reason ? <em className="audit-reason">“{item.reason}”</em> : null}
                </td>
                <td>
                  <span className="id-link">{item.entity_code}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
