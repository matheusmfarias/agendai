"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

type SelectOption = {
  value: string;
  label: string;
  disabled: boolean;
};

type SelectProps = Omit<
  React.ComponentPropsWithoutRef<"select">,
  "onChange" | "children"
> & {
  children: React.ReactNode;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  dropdownStrategy?: "fixed" | "absolute";
};

function getOptions(children: React.ReactNode): SelectOption[] {
  return React.Children.toArray(children)
    .filter(React.isValidElement)
    .filter((child) => child.type === "option")
    .map((child) => {
      const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement>;
      return {
        value: String(props.value ?? ""),
        label:
          typeof props.children === "string"
            ? props.children
            : React.Children.toArray(props.children).join(""),
        disabled: Boolean(props.disabled),
      };
    });
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function getScrollableAncestors(element: HTMLElement | null) {
  const ancestors: HTMLElement[] = [];
  let current = element?.parentElement ?? null;

  while (current && current !== document.body) {
    const styles = window.getComputedStyle(current);
    const canScrollY =
      /(auto|scroll|overlay)/.test(styles.overflowY) &&
      current.scrollHeight > current.clientHeight;
    const canScrollX =
      /(auto|scroll|overlay)/.test(styles.overflowX) &&
      current.scrollWidth > current.clientWidth;

    if (canScrollY || canScrollX) {
      ancestors.push(current);
    }

    current = current.parentElement;
  }

  return ancestors;
}

const Select = React.forwardRef<HTMLInputElement, SelectProps>(function Select(
  {
    className,
    children,
    defaultValue,
    value,
    name,
    id,
    disabled,
    required,
    onChange,
    onBlur,
    dropdownStrategy = "fixed",
  },
  ref,
) {
  const options = getOptions(children);
  const isControlled = value !== undefined;
  const initialValue =
    value !== undefined
      ? String(value)
      : defaultValue !== undefined
        ? String(defaultValue)
        : (options[0]?.value ?? "");
  const [internalValue, setInternalValue] = React.useState(initialValue);
  const [open, setOpen] = React.useState(false);
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>(
    {},
  );
  const [search, setSearch] = React.useState("");
  const [mounted, setMounted] = React.useState(false);
  const wrapperRef = React.useRef<HTMLSpanElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const currentValue = isControlled ? String(value) : internalValue;
  const selectedOption =
    options.find((option) => option.value === currentValue) ?? options[0];
  const hasValue = Boolean(currentValue);
  const normalizedSearch = normalizeSearch(search);
  const filteredOptions = normalizedSearch
    ? options.filter((option) =>
        normalizeSearch(option.label).includes(normalizedSearch),
      )
    : options;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isControlled && defaultValue !== undefined) {
      setInternalValue(String(defaultValue));
    }
  }, [defaultValue, isControlled]);

  React.useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !wrapperRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  React.useEffect(() => {
    if (open) {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (rect) {
        if (dropdownStrategy === "absolute") {
          setDropdownStyle({
            left: 0,
            top: rect.height + 8,
            width: rect.width,
            maxHeight: 320,
          });
        } else {
          const gap = 8;
          const preferredHeight = 320;
          const spaceBelow = window.innerHeight - rect.bottom - gap;
          const spaceAbove = rect.top - gap;
          const openAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
          const maxHeight = Math.max(
            120,
            Math.min(preferredHeight, openAbove ? spaceAbove : spaceBelow),
          );
          const top = openAbove
            ? Math.max(gap, rect.top - maxHeight - gap)
            : rect.bottom + gap;
          setDropdownStyle({
            left: rect.left,
            top,
            width: rect.width,
            maxHeight,
          });
        }
      }
      setSearch("");
      window.setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [dropdownStrategy, open, options.length]);

  React.useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const lockedAncestors = getScrollableAncestors(wrapperRef.current);
    const previousAncestorStyles = lockedAncestors.map((element) => ({
      element,
      overflow: element.style.overflow,
      overflowX: element.style.overflowX,
      overflowY: element.style.overflowY,
      overscrollBehavior: element.style.overscrollBehavior,
    }));

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    lockedAncestors.forEach((element) => {
      element.style.overflow = "hidden";
      element.style.overscrollBehavior = "contain";
    });

    function preventPageScroll(event: WheelEvent | TouchEvent) {
      const target = event.target as Node;
      if (!dropdownRef.current?.contains(target)) {
        event.preventDefault();
      }
    }

    document.addEventListener("wheel", preventPageScroll, {
      passive: false,
      capture: true,
    });
    document.addEventListener("touchmove", preventPageScroll, {
      passive: false,
      capture: true,
    });

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      previousAncestorStyles.forEach(
        ({ element, overflow, overflowX, overflowY, overscrollBehavior }) => {
          element.style.overflow = overflow;
          element.style.overflowX = overflowX;
          element.style.overflowY = overflowY;
          element.style.overscrollBehavior = overscrollBehavior;
        },
      );
      document.removeEventListener("wheel", preventPageScroll, {
        capture: true,
      });
      document.removeEventListener("touchmove", preventPageScroll, {
        capture: true,
      });
    };
  }, [open]);

  function emitChange(nextValue: string) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onChange?.({
      target: { name, value: nextValue },
      currentTarget: { name, value: nextValue },
    } as React.ChangeEvent<HTMLSelectElement>);
  }

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      className={cn(
        "z-[90] overflow-hidden overscroll-contain rounded-xl border border-border bg-popover shadow-xl",
        dropdownStrategy === "absolute" ? "absolute" : "fixed",
      )}
      style={dropdownStyle}
      onWheel={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
    >
      <div className="border-b border-border p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
              }
            }}
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/20"
            placeholder="Pesquisar..."
          />
        </div>
      </div>

      <div
        role="listbox"
        className="space-y-0.5 overflow-y-auto overscroll-contain p-1"
        style={{
          maxHeight:
            typeof dropdownStyle.maxHeight === "number"
              ? Math.max(0, dropdownStyle.maxHeight - 58)
              : undefined,
        }}
      >
        {filteredOptions.length ? (
          filteredOptions.map((option) => {
            const selected = option.value === currentValue;

            return (
              <button
                key={`${option.value}-${option.label}`}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  selected
                    ? "bg-muted font-semibold text-foreground"
                    : "text-foreground hover:bg-muted/70",
                )}
                onClick={() => {
                  emitChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {selected ? <Check className="size-4 shrink-0" /> : null}
              </button>
            );
          })
        ) : (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nenhum resultado encontrado.
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <span ref={wrapperRef} className="relative block w-full">
      <input
        ref={ref}
        type="hidden"
        name={name}
        value={currentValue}
        required={required}
        disabled={disabled}
        readOnly
      />
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onBlur={() => {
          onBlur?.({
            target: { name, value: currentValue },
            currentTarget: { name, value: currentValue },
          } as React.FocusEvent<HTMLSelectElement>);
        }}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-input bg-background px-3 py-2 text-left text-sm text-foreground shadow-sm outline-none transition-colors hover:border-primary/30 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-50",
          className,
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            !hasValue && "text-muted-foreground",
          )}
        >
          {selectedOption?.label ?? "Selecione"}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
          {hasValue && !required ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Limpar seleção"
              className="rounded-full p-0.5 hover:bg-muted hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                emitChange("");
              }}
            >
              <X className="size-4" />
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              open && "rotate-180",
            )}
          />
        </span>
      </button>

      {dropdownStrategy === "fixed" && mounted
        ? createPortal(dropdown, document.body)
        : dropdown}
    </span>
  );
});

export { Select };
