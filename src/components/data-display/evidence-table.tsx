import type { Evidence } from "@/types/domain";

/** Rows from an evidence file, with the cells that support the finding flagged. */
export function EvidenceTable({ evidence }: { evidence: Evidence }) {
  const flagged = new Set(
    evidence.flagged_cells.map(([row, col]) => `${String(row)}:${String(col)}`),
  );
  return (
    <div className="evidence-block">
      <header className="evidence-head">
        <span className="mono">{evidence.code}</span>
        <strong>{evidence.title}</strong>
      </header>
      <div className="evidence table-scroll">
        <p className="evidence-file mono">{evidence.file_name}</p>
        <table className="data-table compact">
          <caption className="sr-only">{evidence.title}</caption>
          <thead>
            <tr>
              {evidence.columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {evidence.rows.map((row, rowIndex) => (
              <tr key={row.join("|")}>
                {row.map((cell, colIndex) => {
                  const isFlagged = flagged.has(`${String(rowIndex)}:${String(colIndex)}`);
                  return (
                    <td
                      key={`${String(colIndex)}-${cell}`}
                      className={isFlagged ? "flagged" : undefined}
                    >
                      {cell}
                      {isFlagged ? <span className="sr-only"> (flagged)</span> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="evidence-summary">{evidence.summary}</p>
    </div>
  );
}
