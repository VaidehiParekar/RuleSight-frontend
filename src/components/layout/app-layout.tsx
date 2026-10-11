import { useEffect, useState } from "react";
import { Outlet } from "react-router";

import { CommandPalette } from "@/components/layout/command-palette";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { cn } from "@/lib/utils";

/** Application shell: skip link, sidebar navigation, top bar, search and the routed page. */
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className={cn("app-shell", collapsed && "collapsed")}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapsed={() => {
          setCollapsed((value) => !value);
        }}
        onNavigate={() => {
          setMobileOpen(false);
        }}
      />
      {mobileOpen ? (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => {
            setMobileOpen(false);
          }}
        />
      ) : null}
      <div className="workspace">
        <Topbar
          onOpenNavigation={() => {
            setMobileOpen(true);
          }}
          onOpenSearch={() => {
            setSearchOpen(true);
          }}
        />
        <Outlet />
      </div>
      {searchOpen ? (
        <CommandPalette
          onClose={() => {
            setSearchOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
