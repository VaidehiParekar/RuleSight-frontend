import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

export interface ListboxOption {
  value: string;
  label: string;
}

interface ListboxProps {
  options: readonly ListboxOption[];
  value: string;
  onChange: (value: string) => void;
  id?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  "aria-describedby"?: string | undefined;
  "aria-invalid"?: boolean | undefined;
}

const MAX_HEIGHT = 260;
const GAP = 4;

interface Placement {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

/**
 * Where the list should sit: below the trigger, or above it when there is no room below.
 * Measured from the viewport, so it is correct wherever the trigger sits in the page.
 */
function placementFor(rect: DOMRect): Placement {
  const below = window.innerHeight - rect.bottom - GAP;
  const above = rect.top - GAP;
  const flip = below < 160 && above > below;
  const base = { left: rect.left, width: rect.width };
  return flip
    ? {
        ...base,
        bottom: window.innerHeight - rect.top + GAP,
        maxHeight: Math.min(MAX_HEIGHT, above - 8),
      }
    : { ...base, top: rect.bottom + GAP, maxHeight: Math.min(MAX_HEIGHT, below - 8) };
}

/**
 * Themed replacement for <select>, whose popup the browser draws in system colours.
 * The list is portalled to <body>, so a dialog's blur or transform cannot move it.
 */
export function Listbox({
  options,
  value,
  onChange,
  id,
  disabled,
  className,
  ...aria
}: ListboxProps) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState<Placement | null>(null);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex];

  const place = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPlacement(placementFor(rect));
  };

  const openList = () => {
    place();
    setActive(Math.max(selectedIndex, 0));
    setOpen(true);
  };

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const choose = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    close(true);
  };

  // Keep the list attached to the trigger while anything scrolls or the window resizes.
  useEffect(() => {
    if (!open) return undefined;
    const onOutside = (event: Event) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onOutside);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
    // place reads refs only; it is stable in behaviour for the life of the open list.
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const item = listRef.current?.children[active] as HTMLElement | undefined;
    // jsdom has no scrollIntoView.
    if (typeof item?.scrollIntoView === "function") item.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((index) => Math.min(index + 1, last));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        close(true);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  const popup =
    open && placement
      ? createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="listbox-popup"
            style={{
              left: placement.left,
              width: placement.width,
              top: placement.top,
              bottom: placement.bottom,
              maxHeight: placement.maxHeight,
            }}
          >
            {options.map((option, index) => (
              <li
                key={option.value}
                id={`${listId}-${String(index)}`}
                role="option"
                aria-selected={option.value === value}
                className={cn(
                  "listbox-option",
                  index === active && "active",
                  option.value === value && "selected",
                )}
                onPointerEnter={() => {
                  setActive(index);
                }}
                onClick={() => {
                  choose(index);
                }}
              >
                {option.label}
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${String(active)}` : undefined}
        disabled={disabled}
        className={cn("control listbox-trigger", className)}
        onClick={() => {
          if (open) close(false);
          else openList();
        }}
        onKeyDown={onKeyDown}
        {...aria}
      >
        <span className="listbox-value">{selected?.label ?? ""}</span>
        <ChevronDown size={14} className="listbox-chevron" aria-hidden="true" />
      </button>
      {popup}
    </>
  );
}
