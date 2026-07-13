"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";

type PanelShellProps = {
  title: string;
  subtitle?: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function PanelShell({
  title,
  subtitle,
  description,
  onClose,
  children,
}: PanelShellProps) {
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);
  const supportingText = subtitle ?? description;

  const requestClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 300);
  }, [closing, onClose]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [requestClose]);

  const visible = entered && !closing;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        onClick={requestClose}
        aria-label="Fechar painel"
        className={`absolute inset-0 bg-transparent ${
          visible ? "" : "pointer-events-none"
        }`}
      />
      <aside
        className={`agenda-side-panel absolute inset-x-0 bottom-0 flex h-[92dvh] w-full flex-col rounded-t-xl border-t border-border bg-background shadow-2xl transition-transform duration-300 ease-out will-change-transform sm:inset-y-0 sm:left-auto sm:right-0 sm:h-auto sm:w-[min(100vw,30rem)] sm:rounded-none sm:border-l sm:border-t-0 lg:w-[29rem] xl:w-[30rem] ${
          visible
            ? "translate-y-0 sm:translate-x-0 sm:translate-y-0"
            : "translate-y-full sm:translate-x-full sm:translate-y-0"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-muted-foreground/25 sm:hidden" />
          <button
            type="button"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            onClick={requestClose}
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            {supportingText ? (
              <p className="truncate text-sm text-muted-foreground">{supportingText}</p>
            ) : null}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          {children}
        </div>
      </aside>
    </div>
  );
}
