import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

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

/** Themed replacement for <select>, whose popup the browser draws in system colours. */
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
  const [position, setPosition] = useState<CSSProperties>({});

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex];

  const openList = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom;
    const flip = below < 200 && rect.top > below;
    setPosition({
      left: rect.left,
      width: rect.width,
      ...(flip
        ? {
            bottom: window.innerHeight - rect.top + 4,
            maxHeight: Math.min(MAX_HEIGHT, rect.top - 12),
          }
        : { top: rect.bottom + 4, maxHeight: Math.min(MAX_HEIGHT, below - 12) }),
    });
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

  useEffect(() => {
    if (!open) return undefined;
    const dismiss = (event: Event) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    const dismissAlways = () => {
      setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("resize", dismissAlways);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("resize", dismissAlways);
      window.removeEventListener("scroll", dismiss, true);
    };
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
      {open ? (
        <ul ref={listRef} id={listId} role="listbox" className="listbox-popup" style={position}>
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
        </ul>
      ) : null}
    </>
  );
}
