import { Menu } from "lucide-react";

import { StatusTag } from "@/components/data-display/status-tag";
import { ActorSelect } from "@/components/layout/actor-select";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { IconButton } from "@/components/ui/button";
import { env } from "@/lib/env";

export function Topbar({ onOpenNavigation }: { onOpenNavigation: () => void }) {
  return (
    <header className="topbar">
      <IconButton label="Open navigation" className="mobile-menu" onClick={onOpenNavigation}>
        <Menu size={19} />
      </IconButton>
      <span className="context-line">
        Nova Trust Bank <i aria-hidden="true" /> RBI regulatory corpus
      </span>
      <div className="topbar-actions">
        {env.VITE_USE_MOCKS ? (
          <span title="Data comes from src/mocks, built from backend/demo_data. Nothing is sent to the API.">
            <StatusTag tone="warning" outline>
              Mock data
            </StatusTag>
          </span>
        ) : null}
        <ThemeToggle />
        <ActorSelect />
      </div>
    </header>
  );
}
