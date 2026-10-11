import { LogOut, Menu, Search } from "lucide-react";
import { useNavigate } from "react-router";

import { useAuth, useSession } from "@/app/auth-context";
import { StatusTag } from "@/components/data-display/status-tag";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { IconButton } from "@/components/ui/button";
import { mockDataEnabled } from "@/lib/env";

interface TopbarProps {
  onOpenNavigation: () => void;
  onOpenSearch: () => void;
}

export function Topbar({ onOpenNavigation, onOpenSearch }: TopbarProps) {
  const { signOut } = useAuth();
  const { actor, user } = useSession();
  const navigate = useNavigate();
  return (
    <header className="topbar">
      <IconButton label="Open navigation" className="mobile-menu" onClick={onOpenNavigation}>
        <Menu size={19} />
      </IconButton>
      <button type="button" className="search-trigger" onClick={onOpenSearch}>
        <Search size={15} aria-hidden="true" />
        <span>Search pages, gaps, obligations</span>
        <kbd aria-hidden="true">Ctrl K</kbd>
      </button>
      <div className="topbar-actions">
        {mockDataEnabled ? (
          <span title="Data comes from src/mocks, built from backend/demo_data. Nothing is sent to the API.">
            <StatusTag tone="warning" outline>
              Mock data
            </StatusTag>
          </span>
        ) : null}
        <ThemeToggle />
        <div className="user-badge" title={user.email}>
          <span className="avatar" aria-hidden="true">
            {actor.initials}
          </span>
          <span className="actor-copy">
            <strong>{actor.name}</strong>
            <small>{actor.role}</small>
          </span>
        </div>
        <IconButton
          label="Sign out"
          onClick={() => {
            signOut();
            void navigate("/login", { replace: true });
          }}
        >
          <LogOut size={16} />
        </IconButton>
      </div>
    </header>
  );
}
