"use client";

import { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronRightIcon,
} from "lucide-react";

function toDateInputValue(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function selectedDateToLocalDate(value: string) {
  return new Date(`${value}T12:00:00-03:00`);
}

function formatMonthTitle(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(selectedDateToLocalDate(value));
}

function formatDayLabel(value: string) {
  if (!value) return "Escolha uma data";

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(selectedDateToLocalDate(value));
}

function addMonths(value: string, amount: number) {
  const date = selectedDateToLocalDate(value || toDateInputValue(new Date()));
  return toDateInputValue(
    new Date(date.getFullYear(), date.getMonth() + amount, 1),
  );
}

function getMonthDays(value: string) {
  const base = selectedDateToLocalDate(value || toDateInputValue(new Date()));
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const leading = first.getDay();
  const days: { label: string; value: string; muted: boolean }[] = [];

  for (let index = leading - 1; index >= 0; index -= 1) {
    const date = new Date(year, month, -index);
    days.push({
      label: String(date.getDate()),
      value: toDateInputValue(date),
      muted: true,
    });
  }

  for (let day = 1; day <= last.getDate(); day += 1) {
    const date = new Date(year, month, day);
    days.push({
      label: String(day),
      value: toDateInputValue(date),
      muted: false,
    });
  }

  while (days.length % 7 !== 0) {
    const date = new Date(year, month + 1, days.length % 7);
    days.push({
      label: String(date.getDate()),
      value: toDateInputValue(date),
      muted: true,
    });
  }

  return days;
}

export function CalendarDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(
    value || toDateInputValue(new Date()),
  );
  const today = toDateInputValue(new Date());
  const monthDays = getMonthDays(visibleMonth);

  return (
    <details className="group rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            <CalendarDays className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold capitalize">
              {formatDayLabel(value)}
            </p>
            <p className="text-xs text-muted-foreground">
              Toque para alterar a data
            </p>
          </div>
        </div>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
      </summary>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="font-semibold capitalize">
            {formatMonthTitle(visibleMonth)}
          </p>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => (
            <span key={`${day}-${index}`} className="py-1">
              {day}
            </span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1 text-center text-sm">
          {monthDays.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => onChange(day.value)}
              className={`rounded-full py-1.5 transition-colors hover:bg-muted ${
                day.value === value
                  ? "bg-primary text-primary-foreground hover:bg-primary"
                  : day.value === today
                    ? "font-semibold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"
                    : day.muted
                      ? "text-muted-foreground/50"
                      : "text-foreground"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}
