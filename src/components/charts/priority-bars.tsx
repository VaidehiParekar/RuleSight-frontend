import type { Priority } from "@/types/domain";

export interface PriorityBarRow {
  label: string;
  counts: Record<Priority, number>;
}

const PRIORITIES: Priority[] = ["P1", "P2", "P3"];

/** Horizontal bars, one per category, split into P1/P2/P3 segments. */
export function PriorityBars({ rows, label }: { rows: PriorityBarRow[]; label: string }) {
  const max = Math.max(1, ...rows.map((row) => row.counts.P1 + row.counts.P2 + row.counts.P3));
  return (
    <figure className="chart">
      <div className="bar-chart" role="img" aria-label={label}>
        {rows.map((row) => {
          const total = row.counts.P1 + row.counts.P2 + row.counts.P3;
          return (
            <div className="bar-row" key={row.label}>
              <span>{row.label}</span>
              <div className="bar-track">
                {PRIORITIES.map((priority) =>
                  row.counts[priority] > 0 ? (
                    <i
                      key={priority}
                      className={`${priority.toLowerCase()}bar`}
                      style={{ width: `${String((row.counts[priority] / max) * 100)}%` }}
                      title={`${row.label}, ${priority}: ${String(row.counts[priority])}`}
                    />
                  ) : null,
                )}
              </div>
              <b>{total}</b>
            </div>
          );
        })}
      </div>
      <figcaption className="mini-legend">
        {PRIORITIES.map((priority) => (
          <span key={priority}>
            <i className={`${priority.toLowerCase()}bar`} aria-hidden="true" />
            {priority}
          </span>
        ))}
      </figcaption>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Type</th>
            {PRIORITIES.map((priority) => (
              <th scope="col" key={priority}>
                {priority}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {PRIORITIES.map((priority) => (
                <td key={priority}>{row.counts[priority]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
