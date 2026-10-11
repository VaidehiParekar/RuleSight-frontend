export interface MeterItem {
  key: string;
  label: string;
  /** 0 to 1 */
  value: number;
}

/** Bullet-style bars on a shared 0–1 axis, each with its value printed. */
export function MeterList({ items, label }: { items: MeterItem[]; label: string }) {
  return (
    <dl className="accuracy-chart" aria-label={label}>
      {items.map((item) => (
        <div className="accuracy-row" key={item.key}>
          <dt>{item.label}</dt>
          <dd>
            <span className="meter" aria-hidden="true">
              <i style={{ width: `${String(Math.round(item.value * 100))}%` }} />
            </span>
            <b>{item.value.toFixed(2)}</b>
          </dd>
        </div>
      ))}
    </dl>
  );
}
