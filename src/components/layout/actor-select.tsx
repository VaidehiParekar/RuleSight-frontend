import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { useActor } from "@/app/actor-context";
import { useToast } from "@/components/feedback/toast-context";
import { cn } from "@/lib/utils";
import type { Actor } from "@/types/domain";

/** "Acting as" control. The choice is sent as X-Actor and recorded in the audit log. */
export function ActorSelect() {
  const { actor, actors, setActorId } = useActor();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return undefined;
    listRef.current?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const openList = () => {
    setActive(
      Math.max(
        0,
        actors.findIndex((candidate) => candidate.id === actor.id),
      ),
    );
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const pick = (next: Actor | undefined) => {
    close();
    if (!next || next.id === actor.id) return;
    setActorId(next.id);
    notify({
      title: `Now acting as ${next.name}`,
      detail: "New actions are recorded under this name.",
      tone: "neutral",
    });
  };

  const onListKey = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, actors.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(actors[active]);
    } else if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      close();
    }
  };

  return (
    <div className="actor-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="actor-button"
        aria-label={`Acting as ${actor.name}, ${actor.role}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          if (open) close();
          else openList();
        }}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            openList();
          }
        }}
      >
        <span className="avatar" aria-hidden="true">
          {actor.initials}
        </span>
        <span className="actor-copy" aria-hidden="true">
          <small>Acting as · {actor.role}</small>
          <strong>{actor.name}</strong>
        </span>
        <ChevronDown size={13} className="actor-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div className="actor-popover">
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Acting as"
            tabIndex={-1}
            aria-activedescendant={`${listId}-${String(active)}`}
            onKeyDown={onListKey}
          >
            {actors.map((candidate, index) => (
              <li
                key={candidate.id}
                id={`${listId}-${String(index)}`}
                role="option"
                aria-selected={candidate.id === actor.id}
                className={cn("actor-option", index === active && "active")}
                onPointerEnter={() => {
                  setActive(index);
                }}
                onClick={() => {
                  pick(candidate);
                }}
              >
                <span className="avatar" aria-hidden="true">
                  {candidate.initials}
                </span>
                <span>
                  <strong>{candidate.name}</strong>
                  <small>{candidate.role}</small>
                </span>
              </li>
            ))}
          </ul>
          <p>
            The dashboard and queue change with the role. Every action is recorded under this name.
          </p>
        </div>
      ) : null}
    </div>
  );
}
