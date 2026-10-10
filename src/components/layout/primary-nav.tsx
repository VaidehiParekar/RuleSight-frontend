import { NavLink } from "react-router";

import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/navigation";

/** Primary navigation. NavLink sets aria-current="page" on the active item. */
export function PrimaryNav() {
  return (
    <nav aria-label="Primary" className="overflow-x-auto">
      <ul className="flex gap-1 whitespace-nowrap">
        {NAV_ITEMS.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                cn(
                  "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
