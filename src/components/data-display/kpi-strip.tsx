import type { ReactNode } from "react";

export interface Kpi {
  label: string;
  value: ReactNode;
  note: ReactNode;
}

/** Row of key-figure cards: label, big number, one line of context. */
export function KpiStrip({ items, label }: { items: Kpi[]; label: string }) {
  return (
    <section className="kpi-strip" aria-label={label}>
      {items.map((item) => (
        <div className="kpi" key={item.label}>
          <span className="kpi-label">{item.label}</span>
          <strong>{item.value}</strong>
          <span>{item.note}</span>
        </div>
      ))}
    </section>
  );
}
