import type { ReactNode } from "react";

export interface Kpi {
  label: string;
  value: ReactNode;
  note: ReactNode;
}

/** Ruled row of key figures. Folio numbers echo a printed report. */
export function KpiStrip({ items, label }: { items: Kpi[]; label: string }) {
  return (
    <section className="kpi-strip" aria-label={label}>
      {items.map((item, index) => (
        <div className="kpi" key={item.label}>
          <div className="kpi-top">
            <span className="eyebrow">{item.label}</span>
            <span className="folio" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>
          <strong>{item.value}</strong>
          <span>{item.note}</span>
        </div>
      ))}
    </section>
  );
}
