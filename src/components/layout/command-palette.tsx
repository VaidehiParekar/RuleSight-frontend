import { Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";

import { useGaps, useObligations } from "@/hooks/use-rulesight";
import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface Entry {
  id: string;
  group: "Pages" | "Gaps" | "Obligations";
  label: string;
  hint: string;
  to: string;
}

const MAX_RESULTS = 12;

/** Ctrl+K search across pages, gaps and obligations. Arrow keys move, Enter opens, Esc closes. */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const gaps = useGaps();
  const obligations = useObligations();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const entries = useMemo<Entry[]>(
    () => [
      ...NAV_ITEMS.map((item) => ({
        id: `page-${item.path}`,
        group: "Pages" as const,
        label: item.label,
        hint: item.path,
        to: item.path,
      })),
      ...(gaps.data ?? []).map((gap) => ({
        id: `gap-${gap.id}`,
        group: "Gaps" as const,
        label: `${gap.code} · ${gap.title}`,
        hint: gap.priority,
        to: `/gaps/${gap.id}`,
      })),
      ...(obligations.data ?? []).map((item) => ({
        id: `ob-${item.id}`,
        group: "Obligations" as const,
        label: `${item.code} · ${item.summary}`,
        hint: item.clause_ref,
        to: `/obligations?select=${item.id}`,
      })),
    ],
    [gaps.data, obligations.data],
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? entries.filter(
          (entry) =>
            entry.label.toLowerCase().includes(needle) || entry.hint.toLowerCase().includes(needle),
        )
      : entries.filter((entry) => entry.group === "Pages");
    return matches.slice(0, MAX_RESULTS);
  }, [entries, query]);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();
    return () => {
      previous?.focus();
    };
  }, []);

  const open = (entry: Entry | undefined) => {
    if (!entry) return;
    onClose();
    void navigate(entry.to);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      open(results[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  const activeEntry = results[active];

  return (
    <div className="modal-backdrop palette-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search RuleSight"
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="palette-input">
          <Search size={16} aria-hidden="true" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={activeEntry ? `${listId}-${activeEntry.id}` : undefined}
            aria-label="Search pages, gaps and obligations"
            placeholder="Search pages, gaps and obligations"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
          <kbd>Esc</kbd>
        </div>
        <ul id={listId} role="listbox" aria-label="Results" className="palette-list">
          {results.length === 0 ? (
            <li className="palette-empty" role="presentation">
              No matches for “{query}”.
            </li>
          ) : (
            results.map((entry, index) => (
              <li
                key={entry.id}
                id={`${listId}-${entry.id}`}
                role="option"
                aria-selected={index === active}
                className={cn("palette-item", index === active && "active")}
                onMouseEnter={() => {
                  setActive(index);
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  open(entry);
                }}
              >
                <span className="palette-group">{entry.group}</span>
                <span className="palette-label">{entry.label}</span>
                <span className="palette-hint mono">{entry.hint}</span>
              </li>
            ))
          )}
        </ul>
        <div className="palette-foot" aria-hidden="true">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> move
          </span>
          <span>
            <kbd>Enter</kbd> open
          </span>
        </div>
      </div>
    </div>
  );
}
