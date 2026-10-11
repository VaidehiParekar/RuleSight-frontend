import { useEffect, useState } from "react";
import { Outlet } from "react-router";

import { CommandPalette } from "@/components/layout/command-palette";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

/** Application shell: skip link, sidebar navigation, top bar, search and the routed page. */
export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      } else if (event.key === "/" && !isTyping(event.target)) {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key === "Escape") {
        setNavOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Sidebar
        mobileOpen={navOpen}
        onNavigate={() => {
          setNavOpen(false);
        }}
      />
      {navOpen ? (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => {
            setNavOpen(false);
          }}
        />
      ) : null}
      <div className="workspace">
        <Topbar
          navOpen={navOpen}
          onToggleNavigation={() => {
            setNavOpen((open) => !open);
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
