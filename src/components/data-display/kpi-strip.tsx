import type { ReactNode } from "react";

export interface Kpi {
  label: string;
  value: ReactNode;
  note: ReactNode;
  /** When set, the card is a button that opens the related screen. */
  onClick?: () => void;
}

/** Row of key-figure cards: uppercase label, big number, one line of context. */
export function KpiStrip({ items, label }: { items: Kpi[]; label: string }) {
  return (
    <section className="kpi-strip" aria-label={label}>
      {items.map((item) => {
        const body = (
          <>
            <span className="kpi-label">{item.label}</span>
            <strong>{item.value}</strong>
            <span>{item.note}</span>
          </>
        );
        return item.onClick ? (
          <button type="button" className="kpi" key={item.label} onClick={item.onClick}>
            {body}
          </button>
        ) : (
          <div className="kpi" key={item.label}>
            {body}
          </div>
        );
      })}
    </section>
  );
}
