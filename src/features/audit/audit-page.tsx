import { Lock } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { QueryView } from "@/components/feedback/query-view";
import { PageFrame } from "@/components/layout/page-frame";
import { FilterGroup, type FilterOption } from "@/components/ui/filter-group";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { useAudit } from "@/hooks/use-rulesight";
import { formatDate, formatTime } from "@/lib/format";
import type { AuditEntry } from "@/types/domain";

const ALL_ACTORS = "all";

const ENTITY_FILTERS = [
  { value: "all", label: "All entities" },
  { value: "obligation", label: "Obligations" },
  { value: "mapping", label: "Mappings" },
  { value: "gap", label: "Gaps" },
  { value: "remediation", label: "Remediation" },
  { value: "document", label: "Documents" },
] as const;

/** Actor names come from the audit entries themselves, since users live in the backend. */
type ActorFilter = string;
type EntityFilter = (typeof ENTITY_FILTERS)[number]["value"];

/** Insert-only ledger of every write, with the actor and the before/after values. */
export function AuditPage() {
  const audit = useAudit();
  const [actor, setActor] = useState<ActorFilter>(ALL_ACTORS);
  const [entity, setEntity] = useState<EntityFilter>("all");
  const [query, setQuery] = useState("");
  const actorFilters = useMemo<FilterOption<ActorFilter>[]>(() => {
    const names = [...new Set((audit.data ?? []).map((item) => item.actor))].sort((a, b) =>
      a.localeCompare(b),
    );
    return [
      { value: ALL_ACTORS, label: "Everyone" },
      ...names.map((name) => ({ value: name, label: name })),
    ];
  }, [audit.data]);

  return (
    <PageFrame
      eyebrow="Audit log · insert only"
      title="Audit log"
      subtitle={
        <span className="inline-icon">
          <Lock size={13} aria-hidden="true" /> Audit entries cannot be edited or deleted. Every
          write records who acted, what changed and why.
        </span>
      }
    >
      <Sheet className="table-sheet">
        <div className="table-toolbar wrap">
          <SearchField value={query} onChange={setQuery} placeholder="Search the audit log" />
          <FilterGroup label="Actor" value={actor} options={actorFilters} onChange={setActor} />
          <FilterGroup
            label="Entity"
            value={entity}
            options={ENTITY_FILTERS}
            onChange={setEntity}
          />
        </div>
        <QueryView query={audit} what="the audit log" rows={8}>
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
      if (actor !== ALL_ACTORS && item.actor !== actor) return false;
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
      <table className="data-table">
        <caption className="sr-only">Audit entries, newest first</caption>
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">Actor</th>
            <th scope="col">Action</th>
            <th scope="col">Entity</th>
            <th scope="col" className="hide-sm">
              Change
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item) => (
            <tr key={item.id}>
              <td>
                <span className="stack">
                  <span>{formatDate(item.at)}</span>
                  <span className="mono muted">{formatTime(item.at)}</span>
                </span>
              </td>
              <td>
                <span className="actor-cell">
                  <span
                    className={item.actor === "Pipeline" ? "avatar square" : "avatar"}
                    aria-hidden="true"
                  >
                    {item.actor === "Pipeline"
                      ? "AG"
                      : item.actor
                          .split(" ")
                          .map((part) => part.charAt(0))
                          .join("")}
                  </span>
                  <span className="stack">
                    <span>{item.actor}</span>
                    <span className="muted">{item.actor_role}</span>
                  </span>
                </span>
              </td>
              <td>
                {item.action}
                {item.reason ? <em className="audit-reason">“{item.reason}”</em> : null}
              </td>
              <td>
                <span className="mono">{item.entity_code}</span>
              </td>
              <td className="hide-sm">
                {item.before || item.after ? (
                  <span className="mono diff">
                    <span className="before">
                      {item.before
                        ? Object.entries(item.before)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(", ")
                        : "—"}
                    </span>
                    <span aria-hidden="true"> → </span>
                    <span className="sr-only"> changed to </span>
                    <span className="after">
                      {item.after
                        ? Object.entries(item.after)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(", ")
                        : "—"}
                    </span>
                  </span>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
