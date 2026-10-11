import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NavLink } from "react-router";

import { BrandMark } from "@/components/layout/brand-mark";
import { IconButton } from "@/components/ui/button";
import { useGaps } from "@/hooks/use-rulesight";
import { NAV_GROUPS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onNavigate: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onToggleCollapsed, onNavigate }: SidebarProps) {
  const gaps = useGaps();
  const openP1 =
    gaps.data?.filter((gap) => gap.priority === "P1" && gap.status !== "dismissed").length ?? 0;

  return (
    <aside className={cn("sidebar", mobileOpen && "mobile-open")}>
      <div className="brand">
        <BrandMark />
        <span>RuleSight</span>
        <IconButton
          label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="collapse-button"
          onClick={onToggleCollapsed}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </IconButton>
      </div>
      <nav aria-label="Primary">
        {NAV_GROUPS.map((group) => (
          <div className="nav-group" key={group.label}>
            <span className="nav-label">{group.label}</span>
            <ul>
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === "/"}
                    className={({ isActive }) => cn("nav-item", isActive && "active")}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon size={17} aria-hidden="true" />
                    <span>{item.label}</span>
                    {item.path === "/gaps" && openP1 > 0 ? (
                      <b aria-label={`${String(openP1)} open P1 gaps`}>{openP1}</b>
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
        <span>Fictional institution</span>
        <span>RBI corpus · 3 documents</span>
      </footer>
    </aside>
  );
}
