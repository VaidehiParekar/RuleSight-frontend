import { NavLink } from "react-router";

import { BrandLockup } from "@/components/layout/brand-mark";
import { useDocuments, useGaps } from "@/hooks/use-rulesight";
import { mockDataEnabled } from "@/lib/env";
import { NAV_GROUPS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface SidebarProps {
  mobileOpen: boolean;
  onNavigate: () => void;
}

export function Sidebar({ mobileOpen, onNavigate }: SidebarProps) {
  const gaps = useGaps();
  const documents = useDocuments();
  const openP1 =
    gaps.data?.filter((gap) => gap.priority === "P1" && gap.status !== "dismissed").length ?? 0;
  const regulations =
    documents.data?.filter((doc) => doc.doc_type === "regulation").length ?? undefined;

  return (
    <aside className={cn("sidebar", mobileOpen && "mobile-open")}>
      <div className="brand">
        <BrandLockup />
      </div>
      <nav aria-label="Main">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <span className="nav-label">{group.label}</span>
            <ul>
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === "/"}
                    className={({ isActive }) => cn("nav-item", isActive && "active")}
                    onClick={onNavigate}
                  >
                    <span>{item.label}</span>
                    {item.path === "/gaps" && openP1 > 0 ? (
                      <b aria-label={`${String(openP1)} open P1 gaps`}>{openP1} P1</b>
                    ) : null}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <footer>
        <strong>Nova Trust Bank</strong>
        <span>Fictional tenant</span>
        <span className="mono">
          RBI corpus{regulations === undefined ? "" : ` · ${String(regulations)} documents`}
        </span>
        {mockDataEnabled ? (
          <span
            className="fixtures"
            title="Screens are running on demo fixtures, not the live backend"
          >
            Demo fixtures
          </span>
        ) : null}
      </footer>
    </aside>
  );
}
