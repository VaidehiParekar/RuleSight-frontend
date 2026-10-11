/** Cyan square with a navy rule through it, like a highlighted line in a document. */
export function BrandMark() {
  return (
    <svg aria-hidden="true" className="mark" viewBox="0 0 16 16">
      <rect width="16" height="16" rx="3" fill="var(--cyan)" />
      <rect x="3" y="7.25" width="10" height="1.5" fill="var(--navy)" />
    </svg>
  );
}

/** Mark, name and tagline, as in the sidebar and on the sign-in hero. */
export function BrandLockup() {
  return (
    <>
      <BrandMark />
      <span className="brand-copy">
        <span className="brand-name">RuleSight</span>
        <span className="brand-tagline">Regulation, traced.</span>
      </span>
    </>
  );
}
