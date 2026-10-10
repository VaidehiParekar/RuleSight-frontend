export interface NavItem {
  readonly label: string;
  readonly path: string;
  /** Scaffold-only flag: true when the feature has a real screen (none yet beyond the dashboard). */
  readonly implemented: boolean;
}

/** Primary navigation. Paths mirror the feature folders under src/features. */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Dashboard", path: "/", implemented: true },
  { label: "Documents", path: "/documents", implemented: false },
  { label: "Regulations", path: "/regulations", implemented: false },
  { label: "Obligations", path: "/obligations", implemented: false },
  { label: "Controls", path: "/controls", implemented: false },
  { label: "Evidence", path: "/evidence", implemented: false },
  { label: "Assessments", path: "/assessments", implemented: false },
  { label: "Findings", path: "/findings", implemented: false },
  { label: "Remediation", path: "/remediation", implemented: false },
  { label: "Audit", path: "/audit", implemented: false },
];
