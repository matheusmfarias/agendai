"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function PanelShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex h-[92dvh] w-full sm:inset-y-0 sm:left-auto sm:right-0 sm:h-auto sm:w-[min(100vw,38rem)] lg:w-[36rem] xl:w-[40rem]">
      <aside
        className={`agenda-side-panel pointer-events-auto relative flex h-full w-full flex-col rounded-t-3xl border-t border-border bg-background shadow-2xl transition-transform duration-300 ease-out will-change-transform sm:rounded-none sm:border-l sm:border-t-0 ${
          entered
            ? "translate-y-0 sm:translate-x-0 sm:translate-y-0"
            : "translate-y-full sm:translate-x-full sm:translate-y-0"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-muted-foreground/25 sm:hidden" />
          <button
            type="button"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold tracking-tight">
              {title}
            </h2>
            {subtitle ? (
              <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
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
