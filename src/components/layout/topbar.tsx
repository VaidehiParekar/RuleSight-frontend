import { LogOut } from "lucide-react";
import { useNavigate } from "react-router";

import { useAuth, useSession } from "@/app/auth-context";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { IconButton } from "@/components/ui/button";

interface TopbarProps {
  navOpen: boolean;
  onToggleNavigation: () => void;
  onOpenSearch: () => void;
}

export function Topbar({ navOpen, onToggleNavigation, onOpenSearch }: TopbarProps) {
  const { signOut } = useAuth();
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
      <SignedInAs />
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

/** Who is signed in. Read-only: the account is chosen at sign-in, not switched here. */
function SignedInAs() {
  const { actor } = useSession();
  return (
    <div className="signed-in-as" title={`Signed in as ${actor.name}, ${actor.role}`}>
      <span className="avatar" aria-hidden="true">
        {actor.initials}
      </span>
      <span className="actor-copy">
        <small>{actor.role}</small>
        <strong>{actor.name}</strong>
      </span>
    </div>
  );
}
