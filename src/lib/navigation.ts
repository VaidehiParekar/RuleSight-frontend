import {
  Activity,
  BookOpenText,
  CircleAlert,
  ClipboardCheck,
  FileDiff,
  Files,
  LayoutDashboard,
  ListChecks,
  Network,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: LucideIcon;
}

export interface NavGroup {
  readonly label: string;
  readonly items: readonly NavItem[];
}

/** Primary navigation, grouped as in the design. Paths mirror src/features. */
export const NAV_GROUPS: readonly NavGroup[] = [
  { label: "Overview", items: [{ label: "Dashboard", path: "/", icon: LayoutDashboard }] },
  {
    label: "Library",
    items: [
      { label: "Documents", path: "/documents", icon: Files },
      { label: "Changes", path: "/changes", icon: FileDiff },
    ],
  },
  {
    label: "Analysis",
    items: [
      { label: "Obligations", path: "/obligations", icon: BookOpenText },
      { label: "Controls", path: "/controls", icon: ShieldCheck },
      { label: "Gaps", path: "/gaps", icon: CircleAlert },
      { label: "Remediation", path: "/remediation", icon: ClipboardCheck },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Graph", path: "/graph", icon: Network },
      { label: "Agent runs", path: "/runs", icon: Activity },
      { label: "Audit log", path: "/audit", icon: ListChecks },
    ],
  },
];

export const NAV_ITEMS: readonly NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
