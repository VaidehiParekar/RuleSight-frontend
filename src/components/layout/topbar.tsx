import { LogOut } from "lucide-react";
import { useNavigate } from "react-router";

import { useActor } from "@/app/actor-context";
import { ActorSelect } from "@/components/layout/actor-select";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { IconButton } from "@/components/ui/button";

interface TopbarProps {
  navOpen: boolean;
  onToggleNavigation: () => void;
  onOpenSearch: () => void;
}

export function Topbar({ navOpen, onToggleNavigation, onOpenSearch }: TopbarProps) {
  const { signOut } = useActor();
  const navigate = useNavigate();
  return (
    <header className="topbar">
      <button
        type="button"
        className="mobile-menu"
        aria-label={navOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={navOpen}
        onClick={onToggleNavigation}
      >
        Menu
      </button>
      <button type="button" className="search-trigger" onClick={onOpenSearch}>
        <span>Search clauses, obligations, gaps</span>
        <kbd aria-hidden="true">/</kbd>
      </button>
      <span className="spacer" />
      <ThemeToggle />
      <ActorSelect />
      <IconButton
        label="Sign out"
        onClick={() => {
          signOut();
          void navigate("/login", { replace: true });
        }}
      >
        <LogOut size={16} />
      </IconButton>
    </header>
  );
}
