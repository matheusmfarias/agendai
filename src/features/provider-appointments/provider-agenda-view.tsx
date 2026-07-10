"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  CalendarDays,
  CalendarPlus,
  CircleDollarSign,
  ChevronLeft,
  ChevronRight,
  ChevronRightIcon,
  Clock3,
  Filter,
  LoaderCircle,
  Lock,
  Plus,
  ReceiptText,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { AppointmentForm } from "@/components/forms/appointment-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  APPOINTMENT_ORIGIN_LABELS,
  APPOINTMENT_STATUS_LABELS,
} from "@/features/appointments/appointment-constants";
import type {
  AppointmentOrigin,
  AppointmentStatus,
} from "@/generated/prisma/client";
import { formatCurrency } from "@/lib/formatters";
import { formatDecimalInput } from "@/lib/input-formatters";
import { cn } from "@/lib/utils";
import type { FormActionState } from "@/types/form-state";

type AgendaAppointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  origin: AppointmentOrigin;
  estimatedPrice: string | null;
  finalPrice: string | null;
  checkout: CheckoutInfo | null;
  customer: { name: string; phone: string };
  service: { name: string };
};

type AgendaScheduleBlock = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdByName: string;
};

type CheckoutInfo = {
  eventId: string;
  paidAt: string;
  paymentMethod: string;
  amount: string;
  tip: string;
  discount: string;
  total: string;
};

type AgendaAppointmentDetail = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  origin: AppointmentOrigin;
  estimatedPrice: string | null;
  finalPrice: string | null;
  checkout: CheckoutInfo | null;
  customerNotes: string | null;
  internalNotes: string | null;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    categoryName: string;
    categoryActive: boolean;
    priceType: "FIXED" | "STARTING_AT" | "ON_REQUEST" | "HIDDEN";
    priceValue: string | null;
    customFields: {
      id: string;
      label: string;
      fieldType: "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT";
      options: string[];
      isRequired: boolean;
    }[];
  };
  customValues: {
    id: string;
    customFieldId: string;
    label: string;
    fieldType: string;
    value: string;
    serviceId: string;
    serviceName: string;
    serviceDurationMinutes: number;
  }[];
  events: {
    id: string;
    eventType: string;
    description: string;
    createdAt: string;
    metadata: unknown;
  }[];
  review: {
    rating: number;
    comment: string | null;
    createdAt: string;
  } | null;
};

type FilterOption = {
  id: string;
  name: string;
  phone?: string;
};

type AgendaServiceOption = {
  id: string;
  name: string;
  durationMinutes: number;
  priceType: "FIXED" | "STARTING_AT" | "ON_REQUEST" | "HIDDEN";
  priceValue: string | null;
  categoryName: string;
  categoryActive: boolean;
  customFields: AgendaAppointmentDetail["service"]["customFields"];
};

type AgendaViewMode = "day" | "week" | "month" | "agenda";

type WorkingHourRule = {
  weekday: number;
  startMinutes: number;
  endMinutes: number;
};

type ProviderAgendaViewProps = {
  selectedDate: string;
  viewMode: AgendaViewMode;
  initialStartTime?: string;
  isCreating: boolean;
  isCreatingScheduleBlock: boolean;
  appointments: AgendaAppointment[];
  scheduleBlocks: AgendaScheduleBlock[];
  workingHours: WorkingHourRule[];
  services: AgendaServiceOption[];
  customers: FilterOption[];
  filters: Record<string, string | undefined>;
  selectedAppointment: AgendaAppointmentDetail | null;
  selectedScheduleBlock: AgendaScheduleBlock | null;
  canEditAppointment: boolean;
  createAction: (
    state: FormActionState,
    data: FormData,
  ) => Promise<FormActionState>;
  updateAction: (
    state: FormActionState,
    data: FormData,
  ) => Promise<FormActionState>;
  statusAction: (
    state: FormActionState,
    data: FormData,
  ) => Promise<FormActionState>;
  checkoutAction: (
    state: FormActionState,
    data: FormData,
  ) => Promise<FormActionState>;
  createScheduleBlockAction: (
    state: FormActionState,
    data: FormData,
  ) => Promise<FormActionState>;
  updateScheduleBlockAction: (
    state: FormActionState,
    data: FormData,
  ) => Promise<FormActionState>;
  deleteScheduleBlockAction: (
    state: FormActionState,
    data: FormData,
  ) => Promise<FormActionState>;
};

const DEFAULT_DAY_START_MINUTES = 8 * 60;
const DEFAULT_DAY_END_MINUTES = 20 * 60;
const HOUR_HEIGHT = 112;
const SLOT_MINUTES = 15;
const DAY_VIEW_MIN_WIDTH = 720;
const WEEK_DAY_MIN_WIDTH = 220;
const COLLISION_CARD_MIN_WIDTH = 190;
const TIME_OPTIONS = Array.from({ length: 24 * 12 }, (_, index) =>
  timeFromMinutes(index * 5),
);

const VIEW_MODE_LABELS: Record<AgendaViewMode, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
  agenda: "Agenda",
};

const AGENDA_VIEW_MODE_COOKIE_NAME = "agendazap_provider_agenda_view_mode";

function storeAgendaViewMode(viewMode: AgendaViewMode) {
  if (typeof window === "undefined") return;

  document.cookie = `${AGENDA_VIEW_MODE_COOKIE_NAME}=${viewMode}; path=/app/appointments; max-age=31536000; samesite=lax`;
}

const STATUS_TONE: Record<AppointmentStatus, string> = {
  REQUESTED: "border-l-amber-500 bg-amber-50/90 text-amber-950",
  CONFIRMED: "border-l-primary bg-primary/8 text-foreground",
  WAITING_INFO: "border-l-sky-500 bg-sky-50/90 text-sky-950",
  RESCHEDULED: "border-l-violet-500 bg-violet-50/90 text-violet-950",
  CANCELED_BY_CUSTOMER:
    "border-l-muted-foreground/70 bg-muted/70 text-muted-foreground",
  CANCELED_BY_PROVIDER:
    "border-l-muted-foreground/70 bg-muted/70 text-muted-foreground",
  NO_SHOW: "border-l-rose-500 bg-rose-50/90 text-rose-950",
  IN_PROGRESS: "border-l-emerald-500 bg-emerald-50/90 text-emerald-950",
  FINISHED: "border-l-neutral-500 bg-stone-100 text-neutral-950",
};

const APPOINTMENT_ACCENTS = [
  "border-l-primary bg-primary/8",
  "border-l-amber-500 bg-amber-50/85",
  "border-l-lime-500 bg-lime-50/85",
  "border-l-sky-500 bg-sky-50/85",
  "border-l-violet-500 bg-violet-50/85",
  "border-l-rose-500 bg-rose-50/85",
];

type AppointmentCollisionLayout = {
  column: number;
  columns: number;
};

function hashText(value: string) {
  return Array.from(value).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
}

function appointmentTone(appointment: AgendaAppointment) {
  if (appointment.status !== "CONFIRMED")
    return STATUS_TONE[appointment.status];
  return APPOINTMENT_ACCENTS[
    hashText(appointment.service.name) % APPOINTMENT_ACCENTS.length
  ];
}

function isConfirmationRequest(status: AppointmentStatus) {
  return status === "REQUESTED" || status === "WAITING_INFO";
}

function ConfirmationRequestBadge({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full border border-amber-300/70 bg-amber-50/90 font-semibold uppercase tracking-[0.08em] text-amber-700 shadow-sm",
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        className,
      )}
    >
      Solicitação
    </span>
  );
}

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

function addDays(value: string, amount: number) {
  const date = selectedDateToLocalDate(value);
  date.setDate(date.getDate() + amount);
  return toDateInputValue(date);
}

function startOfWeek(value: string) {
  const date = selectedDateToLocalDate(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return toDateInputValue(date);
}

function weekDays(value: string) {
  const start = startOfWeek(value);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function addMonths(value: string, amount: number) {
  const date = selectedDateToLocalDate(value);
  return toDateInputValue(
    new Date(date.getFullYear(), date.getMonth() + amount, 1),
  );
}

function monthGridDays(value: string) {
  const base = selectedDateToLocalDate(value);
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return toDateInputValue(date);
  });
}

function localMinutes(value: Date | string) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );
  return hour * 60 + minute;
}

function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSelectedDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(selectedDateToLocalDate(value));
}

function formatMonthTitle(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(selectedDateToLocalDate(value));
}

function formatRangeLabel(start: string, end: string) {
  const startDate = selectedDateToLocalDate(start);
  const endDate = selectedDateToLocalDate(end);
  const sameMonth = startDate.getMonth() === endDate.getMonth();
  const startLabel = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    ...(sameMonth ? {} : { month: "short" }),
  }).format(startDate);
  const endLabel = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
  }).format(endDate);
  return `${startLabel} - ${endLabel}`;
}

function viewRangeLabel(viewMode: AgendaViewMode, selectedDate: string) {
  if (viewMode === "week") {
    const days = weekDays(selectedDate);
    return formatRangeLabel(days[0], days[6]);
  }

  if (viewMode === "month") return formatMonthTitle(selectedDate);

  if (viewMode === "agenda") {
    return formatRangeLabel(selectedDate, addDays(selectedDate, 6));
  }

  return formatSelectedDate(selectedDate);
}

function moveDateByView(
  viewMode: AgendaViewMode,
  selectedDate: string,
  direction: -1 | 1,
) {
  if (viewMode === "week" || viewMode === "agenda") {
    return addDays(selectedDate, direction * 7);
  }

  if (viewMode === "month") return addMonths(selectedDate, direction);

  return addDays(selectedDate, direction);
}

function queryFor(
  date: string,
  filters: Record<string, string | undefined>,
  viewMode: AgendaViewMode = "day",
) {
  const params = new URLSearchParams();
  params.set("startDate", date);
  params.set("endDate", date);
  if (viewMode !== "day") params.set("view", viewMode);

  for (const key of ["status", "serviceId", "customerId", "origin"]) {
    const value = filters[key];
    if (value) params.set(key, value);
  }

  return `/app/appointments?${params.toString()}`;
}

function cleanQueryFor(date: string, viewMode: AgendaViewMode = "day") {
  const params = new URLSearchParams();
  params.set("startDate", date);
  params.set("endDate", date);
  if (viewMode !== "day") params.set("view", viewMode);
  return `/app/appointments?${params.toString()}`;
}

function withPanel(href: string, panel: "new" | "block") {
  const [pathname, search = ""] = href.split("?");
  const params = new URLSearchParams(search);
  params.set("panel", panel);
  params.delete("appointmentId");
  params.delete("blockId");
  return `${pathname}?${params.toString()}`;
}

function toDateTimeLocalValue(date: string, startTime?: string) {
  if (startTime && /^\d{2}:\d{2}$/.test(startTime)) {
    return `${date}T${startTime}`;
  }

  const now = new Date();
  const today = toDateInputValue(now);
  const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15;
  const hour = roundedMinutes === 60 ? now.getHours() + 1 : now.getHours();
  const minute = roundedMinutes === 60 ? 0 : roundedMinutes;
  const defaultHour = date === today ? hour : 9;
  const defaultMinute = date === today ? minute : 0;

  return `${date}T${String(defaultHour).padStart(2, "0")}:${String(
    defaultMinute,
  ).padStart(2, "0")}`;
}

function isoToDateTimeLocalValue(value: string) {
  const date = new Date(value);
  return `${toDateInputValue(date)}T${formatTime(date)}`;
}

function splitDateTimeLocal(value: string) {
  const [date = "", time = ""] = value.split("T");
  return {
    date,
    time: time.slice(0, 5),
  };
}

function joinDateTimeLocal(date: string, time: string) {
  if (!date || !time) return "";
  return `${date}T${time}`;
}

function addMinutesToDateTimeLocal(value: string, minutes: number) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + minutes);
  return `${toDateInputValue(date)}T${formatTime(date)}`;
}

function timeFromMinutes(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function weekdayFromInputDate(value: string) {
  return selectedDateToLocalDate(value).getDay();
}

function scheduleRangeFor(
  selectedDate: string,
  viewMode: AgendaViewMode,
  workingHours: WorkingHourRule[],
) {
  const relevantWeekdays =
    viewMode === "week"
      ? new Set(weekDays(selectedDate).map(weekdayFromInputDate))
      : new Set([weekdayFromInputDate(selectedDate)]);

  const relevantRules = workingHours.filter(
    (rule) =>
      relevantWeekdays.has(rule.weekday) && rule.endMinutes > rule.startMinutes,
  );

  if (!relevantRules.length) {
    return {
      startMinutes: DEFAULT_DAY_START_MINUTES,
      endMinutes: DEFAULT_DAY_END_MINUTES,
    };
  }

  const earliest = Math.min(...relevantRules.map((rule) => rule.startMinutes));
  const latest = Math.max(...relevantRules.map((rule) => rule.endMinutes));
  const startMinutes = Math.max(0, Math.floor(earliest / 60) * 60);
  const endMinutes = Math.min(24 * 60, Math.ceil(latest / 60) * 60);

  return {
    startMinutes,
    endMinutes:
      endMinutes > startMinutes ? endMinutes : startMinutes + 60,
  };
}

function withPanelAndStartTime(href: string, startTime: string) {
  const [pathname, search = ""] = href.split("?");
  const params = new URLSearchParams(search);
  params.set("panel", "new");
  params.set("startTime", startTime);
  return `${pathname}?${params.toString()}`;
}

function withBlockPanelAndStartTime(href: string, startTime: string) {
  const [pathname, search = ""] = href.split("?");
  const params = new URLSearchParams(search);
  params.set("panel", "block");
  params.set("startTime", startTime);
  params.delete("appointmentId");
  params.delete("blockId");
  return `${pathname}?${params.toString()}`;
}

function withAppointmentDetail(href: string, appointmentId: string) {
  const [pathname, search = ""] = href.split("?");
  const params = new URLSearchParams(search);
  params.delete("panel");
  params.delete("startTime");
  params.delete("blockId");
  params.set("appointmentId", appointmentId);
  return `${pathname}?${params.toString()}`;
}

function withScheduleBlockDetail(href: string, blockId: string) {
  const [pathname, search = ""] = href.split("?");
  const params = new URLSearchParams(search);
  params.delete("panel");
  params.delete("startTime");
  params.delete("appointmentId");
  params.set("blockId", blockId);
  return `${pathname}?${params.toString()}`;
}

function hrefHasAppointmentDetail(href: string) {
  const [, search = ""] = href.split("?");
  return Boolean(new URLSearchParams(search).get("appointmentId"));
}

function hrefHasScheduleBlockPanel(href: string) {
  const [, search = ""] = href.split("?");
  const params = new URLSearchParams(search);
  return params.get("panel") === "block" || Boolean(params.get("blockId"));
}

function getMonthDays(value: string) {
  const base = selectedDateToLocalDate(value);
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const leading = first.getDay();
  const days: { label: string; value: string; muted: boolean }[] = [];

  for (let i = leading - 1; i >= 0; i -= 1) {
    const date = new Date(year, month, -i);
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

function CalendarDatePicker({
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
              {value ? formatSelectedDate(value) : "Escolha uma data"}
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

function appointmentCollisionLayouts(
  appointments: AgendaAppointment[],
  dayStartMinutes: number,
  dayEndMinutes: number,
) {
  const visibleAppointments = appointments
    .map((appointment) => {
      const start = localMinutes(appointment.startsAt);
      const end = localMinutes(appointment.endsAt);
      const clippedStart = Math.max(start, dayStartMinutes);
      const clippedEnd = Math.min(end, dayEndMinutes);

      if (clippedEnd <= dayStartMinutes || clippedStart >= dayEndMinutes) {
        return null;
      }

      return {
        appointment,
        start: clippedStart,
        end: clippedEnd,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((first, second) => first.start - second.start || first.end - second.end);

  const layouts = new Map<string, AppointmentCollisionLayout>();
  let group: typeof visibleAppointments = [];
  let groupEnd = -1;

  function flushGroup() {
    if (!group.length) return;

    const columnEnds: number[] = [];
    const assigned = group.map((item) => {
      const reusableColumn = columnEnds.findIndex((end) => end <= item.start);
      const column =
        reusableColumn >= 0 ? reusableColumn : columnEnds.length;
      columnEnds[column] = item.end;
      return { id: item.appointment.id, column };
    });
    const columns = Math.max(1, columnEnds.length);

    for (const item of assigned) {
      layouts.set(item.id, { column: item.column, columns });
    }

    group = [];
    groupEnd = -1;
  }

  for (const item of visibleAppointments) {
    if (!group.length || item.start < groupEnd) {
      group.push(item);
      groupEnd = Math.max(groupEnd, item.end);
      continue;
    }

    flushGroup();
    group.push(item);
    groupEnd = item.end;
  }

  flushGroup();
  return layouts;
}

function maxCollisionColumns(layouts: Map<string, AppointmentCollisionLayout>) {
  return Math.max(
    1,
    ...Array.from(layouts.values()).map((layout) => layout.columns),
  );
}

function collisionHorizontalStyle(
  layout: AppointmentCollisionLayout | undefined,
  gutterRem: number,
) {
  const columns = layout?.columns ?? 1;
  const column = layout?.column ?? 0;

  if (columns <= 1) {
    return {
      left: `${gutterRem}rem`,
      right: `${gutterRem}rem`,
    };
  }

  return {
    left: `calc(${(column / columns) * 100}% + ${gutterRem}rem)`,
    right: `calc(${((columns - column - 1) / columns) * 100}% + ${gutterRem}rem)`,
  };
}

function AppointmentBlock({
  appointment,
  href,
  onNavigate,
  dayStartMinutes,
  dayEndMinutes,
  collisionLayout,
  gutterRem = 0.75,
}: {
  appointment: AgendaAppointment;
  href: string;
  onNavigate: (href: string) => void;
  dayStartMinutes: number;
  dayEndMinutes: number;
  collisionLayout?: AppointmentCollisionLayout;
  gutterRem?: number;
}) {
  const start = localMinutes(appointment.startsAt);
  const end = localMinutes(appointment.endsAt);
  const clippedStart = Math.max(start, dayStartMinutes);
  const clippedEnd = Math.min(end, dayEndMinutes);

  if (clippedEnd <= dayStartMinutes || clippedStart >= dayEndMinutes) {
    return null;
  }

  const top = Math.max(
    0,
    ((clippedStart - dayStartMinutes) / 60) * HOUR_HEIGHT,
  );
  const duration = Math.max(15, clippedEnd - clippedStart);
  const height = Math.max(44, (duration / 60) * HOUR_HEIGHT);
  const singleLine = duration <= 30 || height < 64;
  const compact = height < 72;
  const dense = height < 50;
  const paid = Boolean(appointment.checkout);
  const confirmationRequest = isConfirmationRequest(appointment.status);
  const horizontalStyle = collisionHorizontalStyle(
    collisionLayout,
    gutterRem,
  );

  return (
    <Link
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(href);
      }}
      className={cn(
        "pointer-events-auto absolute left-3 right-3 z-10 overflow-hidden rounded-2xl border border-black/5 border-l-4 text-sm shadow-[0_4px_14px_rgba(35,31,26,0.06)] ring-1 ring-white/60 transition-transform hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(35,31,26,0.09)]",
        singleLine
          ? "flex items-center gap-2 px-2.5 py-1"
          : dense
            ? "px-2.5 py-1.5"
            : compact
              ? "px-3 py-2"
              : "px-3.5 py-2.5",
        appointmentTone(appointment),
      )}
      style={{ top, height, ...horizontalStyle }}
      title={`${formatTime(appointment.startsAt)} - ${formatTime(
        appointment.endsAt,
      )} · ${appointment.customer.name} · ${appointment.service.name}`}
    >
      {paid ? (
        <span
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-white",
            singleLine ? "order-last ml-auto" : "absolute right-1.5 top-1.5",
          )}
          title="Checkout realizado"
          aria-label="Checkout realizado"
        >
          <CircleDollarSign className="size-3.5" />
        </span>
      ) : null}
      {singleLine ? (
        <>
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-none">
          {formatTime(appointment.startsAt)} - {formatTime(appointment.endsAt)}
          <span className="mx-1.5 opacity-50">·</span>
          <span className="font-medium">{appointment.customer.name}</span>
          <span className="mx-1.5 opacity-50">·</span>
          <span className="font-medium">{appointment.service.name}</span>
          </span>
          {confirmationRequest && !paid ? (
            <ConfirmationRequestBadge compact className="ml-auto" />
          ) : null}
        </>
      ) : (
        <>
          <span className="flex items-start justify-between gap-2 pr-6">
            <span
              className={`font-semibold leading-tight ${
                compact ? "text-xs" : "text-sm"
              }`}
            >
              {formatTime(appointment.startsAt)} -{" "}
              {formatTime(appointment.endsAt)}
            </span>
            {confirmationRequest && !paid ? (
              <ConfirmationRequestBadge compact={compact} />
            ) : null}
          </span>
          <span
            className={`block truncate text-xs font-medium opacity-90 ${
              dense ? "mt-0" : "mt-0.5"
            }`}
          >
            {appointment.customer.name}
          </span>
          <span className="block truncate text-xs font-medium opacity-90">
            {appointment.service.name}
          </span>
        </>
      )}
    </Link>
  );
}

function AgendaFilters({
  filters,
  services,
  customers,
  viewMode,
  onNavigate,
}: {
  filters: Record<string, string | undefined>;
  services: FilterOption[];
  customers: FilterOption[];
  viewMode: AgendaViewMode;
  onNavigate: (href: string) => void;
}) {
  const filtersKey = [
    filters.startDate,
    filters.endDate,
    filters.status ?? "",
    filters.serviceId ?? "",
    filters.customerId ?? "",
    filters.origin ?? "",
  ].join(":");

  return (
    <form
      key={filtersKey}
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const params = new URLSearchParams();

        for (const [key, value] of formData.entries()) {
          const textValue = String(value);
          if (textValue) params.set(key, textValue);
        }

        onNavigate(`/app/appointments?${params.toString()}`);
      }}
    >
      <input type="hidden" name="startDate" value={filters.startDate} />
      <input type="hidden" name="endDate" value={filters.endDate} />
      {viewMode !== "day" ? (
        <input type="hidden" name="view" value={viewMode} />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="status">Status da reserva</Label>
        <Select id="status" name="status" defaultValue={filters.status}>
          <option value="">Todos</option>
          {Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="serviceId">Serviço</Label>
        <Select
          id="serviceId"
          name="serviceId"
          defaultValue={filters.serviceId}
        >
          <option value="">Todos</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="customerId">Cliente</Label>
        <Select
          id="customerId"
          name="customerId"
          defaultValue={filters.customerId}
        >
          <option value="">Todos</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="origin">Origem</Label>
        <Select id="origin" name="origin" defaultValue={filters.origin}>
          <option value="">Todas</option>
          {Object.entries(APPOINTMENT_ORIGIN_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onNavigate(
              cleanQueryFor(
                filters.startDate ?? toDateInputValue(new Date()),
                viewMode,
              ),
            );
          }}
        >
          Limpar
        </Button>
        <Button type="submit">Aplicar</Button>
      </div>
    </form>
  );
}

function NavButton({
  href,
  children,
  className,
  onNavigate,
  ariaLabel,
}: {
  href: string;
  children: React.ReactNode;
  className: string;
  onNavigate: (href: string) => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={className}
      onClick={() => onNavigate(href)}
    >
      {children}
    </button>
  );
}

function CalendarPanel({
  selectedDate,
  today,
  monthDays,
  appointmentDates,
  filters,
  viewMode,
  onNavigate,
}: {
  selectedDate: string;
  today: string;
  monthDays: { label: string; value: string; muted: boolean }[];
  appointmentDates: Set<string>;
  filters: Record<string, string | undefined>;
  viewMode: AgendaViewMode;
  onNavigate: (href: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold capitalize">
          {formatMonthTitle(selectedDate)}
        </p>
        <div className="flex items-center gap-1">
          <NavButton
            href={queryFor(addMonths(selectedDate, -1), filters, viewMode)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            ariaLabel="Mês anterior"
            onNavigate={onNavigate}
          >
            <ChevronLeft className="size-4" />
          </NavButton>
          <NavButton
            href={queryFor(addMonths(selectedDate, 1), filters, viewMode)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            ariaLabel="Próximo mês"
            onNavigate={onNavigate}
          >
            <ChevronRight className="size-4" />
          </NavButton>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => (
          <span key={`${day}-${index}`} className="py-1">
            {day}
          </span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1 text-center text-sm">
        {monthDays.map((day) => {
          const hasAppointment = appointmentDates.has(day.value);

          return (
            <NavButton
              key={day.value}
              href={queryFor(day.value, filters, viewMode)}
              onNavigate={onNavigate}
              className={`relative rounded-full py-1.5 transition-colors hover:bg-muted ${
                day.value === selectedDate
                  ? "bg-primary text-primary-foreground hover:bg-primary"
                  : day.value === today
                    ? "font-semibold text-primary ring-1 ring-primary/20 hover:bg-primary/5"
                    : day.muted
                      ? "text-muted-foreground/40"
                      : "text-foreground"
              }`}
            >
              {day.label}
              {hasAppointment ? (
                <span
                  className={`absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full ${
                    day.value === selectedDate ? "bg-white" : "bg-primary/70"
                  }`}
                />
              ) : null}
            </NavButton>
          );
        })}
      </div>
    </div>
  );
}

function appointmentsForDay(appointments: AgendaAppointment[], date: string) {
  return appointments.filter(
    (appointment) => toDateInputValue(new Date(appointment.startsAt)) === date,
  );
}

function ScheduleBlockItem({
  block,
  href,
  onNavigate,
  dayStartMinutes,
  dayEndMinutes,
  date,
  gutterRem = 0.75,
}: {
  block: AgendaScheduleBlock;
  href: string;
  onNavigate: (href: string) => void;
  dayStartMinutes: number;
  dayEndMinutes: number;
  date: string;
  gutterRem?: number;
}) {
  const blockStart = new Date(block.startsAt);
  const blockEnd = new Date(block.endsAt);
  const dayStart = new Date(`${date}T00:00:00-03:00`);
  const dayEnd = new Date(`${date}T23:59:59.999-03:00`);
  const clippedStartDate = blockStart > dayStart ? blockStart : dayStart;
  const clippedEndDate = blockEnd < dayEnd ? blockEnd : dayEnd;
  const start = localMinutes(clippedStartDate.toISOString());
  const end = localMinutes(clippedEndDate.toISOString());
  const clippedStart = Math.max(start, dayStartMinutes);
  const clippedEnd = Math.min(end, dayEndMinutes);

  if (clippedEnd <= dayStartMinutes || clippedStart >= dayEndMinutes) {
    return null;
  }

  const top = Math.max(
    0,
    ((clippedStart - dayStartMinutes) / 60) * HOUR_HEIGHT,
  );
  const duration = Math.max(15, clippedEnd - clippedStart);
  const height = Math.max(34, (duration / 60) * HOUR_HEIGHT);
  const singleLine = duration <= 30 || height < 58;

  return (
    <Link
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(href);
      }}
      className={cn(
        "pointer-events-auto absolute z-[12] overflow-hidden rounded-xl border-2 border-rose-500/85 bg-rose-100 text-rose-950 shadow-lg shadow-rose-950/10 ring-1 ring-rose-200/80 transition-transform hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-950/15",
        singleLine
          ? "flex items-center gap-2 px-2 py-1 text-[11px]"
          : "px-3 py-2 text-xs",
      )}
      style={{
        top,
        height,
        left: `${gutterRem}rem`,
        right: `${gutterRem}rem`,
      }}
      title={`${formatTime(block.startsAt)} - ${formatTime(block.endsAt)} · ${
        block.reason
      }`}
    >
      <span className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(244,63,94,0.13)_0,rgba(244,63,94,0.13)_8px,transparent_8px,transparent_16px)]" />
      <span className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-rose-600" />
      <Lock className="relative size-3.5 shrink-0" />
        <span className="relative min-w-0 flex-1 truncate font-semibold">
          Bloqueado
          <span className="mx-1 opacity-50">·</span>
          {formatTime(block.startsAt)} - {formatTime(block.endsAt)}
          <span className="mx-1 opacity-50">·</span>
          {block.reason}
        </span>
    </Link>
  );
}

function scheduleBlocksForDay(blocks: AgendaScheduleBlock[], date: string) {
  const dayStart = new Date(`${date}T00:00:00-03:00`);
  const dayEnd = new Date(`${date}T23:59:59.999-03:00`);

  return blocks.filter((block) => {
    const startsAt = new Date(block.startsAt);
    const endsAt = new Date(block.endsAt);
    return startsAt <= dayEnd && endsAt >= dayStart;
  });
}

function compactAppointmentPrice(appointment: AgendaAppointment) {
  const value = appointment.finalPrice ?? appointment.estimatedPrice;
  return value ? formatCurrency(value) : null;
}

function AgendaListView({
  selectedDate,
  appointments,
  hrefForDate,
  onNavigate,
}: {
  selectedDate: string;
  appointments: AgendaAppointment[];
  hrefForDate: (date: string) => string;
  onNavigate: (href: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, index) =>
    addDays(selectedDate, index),
  );

  return (
    <div className="min-h-full bg-card px-6 py-5">
      <div className="mx-auto max-w-3xl space-y-7">
        {days.map((day) => {
          const dayAppointments = appointmentsForDay(appointments, day);
          const total = dayAppointments.reduce((sum, appointment) => {
            const value = Number(
              appointment.finalPrice ?? appointment.estimatedPrice ?? 0,
            );
            return Number.isFinite(value) ? sum + value : sum;
          }, 0);

          return (
            <section key={day} className="border-b border-border pb-6">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold capitalize">
                    {day === selectedDate ? "Hoje" : formatSelectedDate(day)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dayAppointments.length}{" "}
                    {dayAppointments.length === 1
                      ? "agendamento"
                      : "agendamentos"}
                  </p>
                </div>
                {dayAppointments.length ? (
                  <div className="rounded-xl border border-border px-4 py-2 text-right">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                      Valor
                    </p>
                    <p className="text-sm font-bold">{formatCurrency(total)}</p>
                  </div>
                ) : null}
              </div>

              {dayAppointments.length ? (
                <div className="divide-y divide-border rounded-2xl border border-border">
                  {dayAppointments.map((appointment) => {
                    const href = withAppointmentDetail(
                      hrefForDate(day),
                      appointment.id,
                    );

                    return (
                      <Link
                        key={appointment.id}
                        href={href}
                        onClick={(event) => {
                          event.preventDefault();
                          onNavigate(href);
                        }}
                        className="grid grid-cols-[72px_1fr_auto] items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
                      >
                      <div>
                        <p className="font-semibold">
                          {formatTime(appointment.startsAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(
                            (new Date(appointment.endsAt).getTime() -
                              new Date(appointment.startsAt).getTime()) /
                              60000,
                          )}
                          min
                        </p>
                      </div>
                      <div className="border-l-4 border-amber-500 pl-3">
                        <p className="font-medium">
                          {appointment.customer.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {appointment.service.name}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">
                        {compactAppointmentPrice(appointment) ?? "—"}
                      </p>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                  Ainda não há agendamentos.
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function MobileDayAgenda({
  appointments,
  currentHref,
  onNavigate,
}: {
  appointments: AgendaAppointment[];
  currentHref: string;
  onNavigate: (href: string) => void;
}) {
  const sortedAppointments = [...appointments].sort(
    (first, second) =>
      new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime(),
  );

  return (
    <div className="space-y-3 bg-card p-4 md:hidden">
      {sortedAppointments.length ? (
        sortedAppointments.map((appointment) => {
          const price = compactAppointmentPrice(appointment);
          const paid = Boolean(appointment.checkout);
          const confirmationRequest = isConfirmationRequest(appointment.status);

          return (
            <Link
              key={appointment.id}
              href={withAppointmentDetail(currentHref, appointment.id)}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(withAppointmentDetail(currentHref, appointment.id));
              }}
              className={cn(
                "block rounded-2xl border border-border bg-background px-4 py-3 shadow-sm",
                appointmentTone(appointment),
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {formatTime(appointment.startsAt)} ·{" "}
                    {appointment.service.name}
                  </p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {appointment.customer.name}
                  </p>
                </div>
                {confirmationRequest && !paid ? (
                  <ConfirmationRequestBadge />
                ) : (
                  <span className="rounded-full bg-background/80 px-2 py-1 text-[11px] font-semibold shadow-sm">
                    {paid ? "Pago" : APPOINTMENT_STATUS_LABELS[appointment.status]}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{APPOINTMENT_ORIGIN_LABELS[appointment.origin]}</span>
                <span className="font-semibold text-foreground">
                  {price ?? "Sem valor"}
                </span>
              </div>
            </Link>
          );
        })
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
          <Lock className="mx-auto mb-2 size-5 text-muted-foreground" />
          <p className="text-sm font-semibold">Nenhum agendamento neste dia</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Toque em Novo para criar um horário manual.
          </p>
        </div>
      )}
    </div>
  );
}

function MonthView({
  selectedDate,
  appointments,
  today,
  hrefForDate,
  onNavigate,
  onDayClick,
}: {
  selectedDate: string;
  appointments: AgendaAppointment[];
  today: string;
  hrefForDate: (date: string) => string;
  onNavigate: (href: string) => void;
  onDayClick: (date: string) => void;
}) {
  const days = monthGridDays(selectedDate);
  const selectedMonth = selectedDateToLocalDate(selectedDate).getMonth();

  return (
    <div className="min-h-full min-w-[860px]">
      <div className="grid grid-cols-7 border-b border-border bg-card text-center text-sm font-medium">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
          <div key={day} className="px-3 py-3">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const date = selectedDateToLocalDate(day);
          const dayAppointments = appointmentsForDay(appointments, day);
          const isMuted = date.getMonth() !== selectedMonth;
          const isToday = day === today;

          return (
            <div
              role="button"
              tabIndex={0}
              key={day}
              className={`min-h-32 border-b border-r border-border p-3 ${
                isMuted ? "bg-muted/40 text-muted-foreground" : "bg-card"
              } text-left transition-colors hover:bg-primary/5`}
              onClick={() => onDayClick(day)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onDayClick(day);
                }
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <p
                  className={`text-sm font-semibold ${
                    isToday ? "text-rose-600" : ""
                  }`}
                >
                  {isToday ? "Hoje" : date.getDate()}
                </p>
                {dayAppointments.length ? (
                  <span className="text-[11px] text-muted-foreground">
                    {dayAppointments.length} ag.
                  </span>
                ) : null}
              </div>
              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map((appointment) => {
                  const href = withAppointmentDetail(
                    hrefForDate(day),
                    appointment.id,
                  );

                  return (
                  <Link
                    key={appointment.id}
                    href={href}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onNavigate(href);
                    }}
                    className="block truncate rounded-md bg-amber-200 px-2 py-1 text-[11px] font-medium text-amber-950 transition-opacity hover:opacity-80"
                  >
                    {formatTime(appointment.startsAt)} ·{" "}
                    {appointment.service.name}
                  </Link>
                );
                })}
                {dayAppointments.length > 3 ? (
                  <p className="text-[11px] text-muted-foreground">
                    +{dayAppointments.length - 3} mais
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  selectedDate,
  appointments,
  scheduleBlocks,
  today,
  hours,
  slots,
  slotHeight,
  timelineHeight,
  dayStartMinutes,
  dayEndMinutes,
  onSlotClick,
  hrefForDate,
  onNavigate,
}: {
  selectedDate: string;
  appointments: AgendaAppointment[];
  scheduleBlocks: AgendaScheduleBlock[];
  today: string;
  hours: number[];
  slots: { minutes: number; label: string; top: number }[];
  slotHeight: number;
  timelineHeight: number;
  dayStartMinutes: number;
  dayEndMinutes: number;
  onSlotClick: (date: string, label: string) => void;
  hrefForDate: (date: string) => string;
  onNavigate: (href: string) => void;
}) {
  const days = weekDays(selectedDate);
  const dayLayoutData = days.map((day) => {
    const dayAppointments = appointmentsForDay(appointments, day);
    const dayBlocks = scheduleBlocksForDay(scheduleBlocks, day);
    const collisionLayouts = appointmentCollisionLayouts(
      dayAppointments,
      dayStartMinutes,
      dayEndMinutes,
    );
    const columns = maxCollisionColumns(collisionLayouts);

    return {
      day,
      appointments: dayAppointments,
      blocks: dayBlocks,
      collisionLayouts,
      width: Math.max(WEEK_DAY_MIN_WIDTH, columns * COLLISION_CARD_MIN_WIDTH),
    };
  });
  const weekMinWidth =
    72 + dayLayoutData.reduce((total, item) => total + item.width, 0);
  const headerGridColumns = `72px ${dayLayoutData
    .map((item) => `minmax(${item.width}px, 1fr)`)
    .join(" ")}`;
  const bodyGridColumns = dayLayoutData
    .map((item) => `minmax(${item.width}px, 1fr)`)
    .join(" ");

  return (
    <div
      className="min-h-full"
      style={{ minWidth: weekMinWidth, width: `max(100%, ${weekMinWidth}px)` }}
    >
      <div
        className="grid border-b border-border bg-card"
        style={{ gridTemplateColumns: headerGridColumns }}
      >
        <div />
        {dayLayoutData.map(({ day, appointments: dayAppointments }) => {
          return (
            <div
              key={day}
              className={`border-l border-border px-3 py-3 text-center ${
                day === today ? "text-rose-600" : ""
              }`}
            >
              <p className="text-sm font-semibold capitalize">
                {formatSelectedDate(day)}
              </p>
              <p className="text-xs text-muted-foreground">
                {dayAppointments.length}{" "}
                {dayAppointments.length === 1 ? "agendamento" : "agendamentos"}
              </p>
            </div>
          );
        })}
      </div>

      <div className="relative" style={{ height: timelineHeight }}>
        {hours.slice(0, -1).map((hour, index) => (
          <div
            key={hour}
            className="absolute left-0 right-0 border-t border-border"
            style={{ top: index * HOUR_HEIGHT }}
          >
            <span className="absolute left-4 top-2  text-xs tabular-nums text-muted-foreground">
              {timeFromMinutes(hour)}
            </span>
          </div>
        ))}

        <div
          className="absolute inset-y-0 left-[72px] right-0 grid"
          style={{ gridTemplateColumns: bodyGridColumns }}
        >
          {dayLayoutData.map(({ day, appointments: dayAppointments, blocks: dayBlocks, collisionLayouts }) => {
            return (
            <div key={day} className="relative border-l border-border">
              {slots.map((slot) => (
                <button
                  key={`${day}-${slot.label}`}
                  type="button"
                  className="group absolute left-0 right-0 border-t border-dashed border-border/70 text-left transition-colors hover:bg-primary/5"
                  style={{ top: slot.top, height: slotHeight }}
                  onClick={() => onSlotClick(day, slot.label)}
                  aria-label={`Ações para ${formatSelectedDate(day)} ${slot.label}`}
                >
                  <span className="pointer-events-none ml-2 hidden translate-y-[-50%] rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-border group-hover:inline-block">
                    {slot.label}
                  </span>
                </button>
              ))}

              {dayBlocks.map((block) => (
                <ScheduleBlockItem
                  key={block.id}
                  block={block}
                  date={day}
                  href={withScheduleBlockDetail(hrefForDate(day), block.id)}
                  onNavigate={onNavigate}
                  dayStartMinutes={dayStartMinutes}
                  dayEndMinutes={dayEndMinutes}
                  gutterRem={0.25}
                />
              ))}

              {dayAppointments.map((appointment) => {
                const start = localMinutes(appointment.startsAt);
                const end = localMinutes(appointment.endsAt);
                const clippedStart = Math.max(start, dayStartMinutes);
                const clippedEnd = Math.min(end, dayEndMinutes);
                if (
                  clippedEnd <= dayStartMinutes ||
                  clippedStart >= dayEndMinutes
                ) {
                  return null;
                }
                const top =
                  ((clippedStart - dayStartMinutes) / 60) * HOUR_HEIGHT;
                const height = Math.max(
                  44,
                  ((clippedEnd - clippedStart) / 60) * HOUR_HEIGHT,
                );
                const duration = Math.max(15, clippedEnd - clippedStart);
                const singleLine = duration <= 30 || height < 64;
                const href = withAppointmentDetail(
                  hrefForDate(day),
                  appointment.id,
                );
                const collisionLayout = collisionLayouts.get(appointment.id);
                const paid = Boolean(appointment.checkout);
                const confirmationRequest = isConfirmationRequest(
                  appointment.status,
                );

                return (
                  <Link
                    key={appointment.id}
                    href={href}
                    onClick={(event) => {
                      event.preventDefault();
                      onNavigate(href);
                    }}
                    className={cn(
                      "absolute overflow-hidden rounded-lg border-l-4 text-[11px] leading-tight shadow-[0_4px_14px_rgba(35,31,26,0.06)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(35,31,26,0.09)]",
                      singleLine
                        ? "flex items-center gap-1.5 px-2 py-1"
                        : "px-2.5 py-1.5 pr-6",
                      appointmentTone(appointment),
                    )}
                    style={{
                      top,
                      height,
                      ...collisionHorizontalStyle(collisionLayout, 0.25),
                    }}
                    title={`${formatTime(appointment.startsAt)} - ${formatTime(
                      appointment.endsAt,
                    )} · ${appointment.customer.name} · ${
                      appointment.service.name
                    }`}
                  >
                    {paid ? (
                      <CircleDollarSign
                        className={cn(
                          "size-3.5 shrink-0 text-emerald-600",
                          singleLine
                            ? "order-last ml-auto"
                            : "absolute right-1 top-1",
                        )}
                      />
                    ) : null}
                    {singleLine ? (
                      <>
                        <p className="min-w-0 flex-1 truncate font-semibold leading-none">
                        {formatTime(appointment.startsAt)} -{" "}
                        {formatTime(appointment.endsAt)}
                        <span className="mx-1 opacity-50">·</span>
                        <span className="font-medium">
                          {appointment.customer.name}
                        </span>
                        <span className="mx-1 opacity-50">·</span>
                        <span className="font-medium">
                          {appointment.service.name}
                        </span>
                        </p>
                        {confirmationRequest && !paid ? (
                          <ConfirmationRequestBadge compact className="ml-auto" />
                        ) : null}
                      </>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-1.5">
                          <p className="font-bold leading-tight">
                            {formatTime(appointment.startsAt)} -{" "}
                            {formatTime(appointment.endsAt)}
                          </p>
                          {confirmationRequest && !paid ? (
                            <ConfirmationRequestBadge compact />
                          ) : null}
                        </div>
                        <p className="truncate leading-tight">
                          {appointment.customer.name}
                        </p>
                        <p className="truncate leading-tight">
                          {appointment.service.name}
                        </p>
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          );
          })}
        </div>
      </div>
    </div>
  );
}

function statusBadgeVariant(status: AppointmentStatus) {
  if (status === "FINISHED") return "success" as const;
  if (status.startsWith("CANCELED")) return "destructive" as const;
  if (status === "IN_PROGRESS") return "warning" as const;
  return "outline" as const;
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Dinheiro" },
  { value: "PIX", label: "Pix" },
  { value: "CREDIT_CARD", label: "Cartão de crédito" },
  { value: "DEBIT_CARD", label: "Débito" },
  { value: "BANK_TRANSFER", label: "Transferência" },
  { value: "OTHER", label: "Outro" },
] as const;

function paymentMethodLabel(value: string) {
  return (
    PAYMENT_METHODS.find((method) => method.value === value)?.label ?? value
  );
}

function formatDateShort(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function ScheduleBlockPanel({
  mode,
  block,
  selectedDate,
  initialStartTime,
  currentHref,
  isClosing,
  onClose,
  createAction,
  updateAction,
  deleteAction,
}: {
  mode: "create" | "edit";
  block?: AgendaScheduleBlock | null;
  selectedDate: string;
  initialStartTime?: string;
  currentHref: string;
  isClosing: boolean;
  onClose: () => void;
  createAction: (
    state: FormActionState,
    data: FormData,
  ) => Promise<FormActionState>;
  updateAction: (
    state: FormActionState,
    data: FormData,
  ) => Promise<FormActionState>;
  deleteAction: (
    state: FormActionState,
    data: FormData,
  ) => Promise<FormActionState>;
}) {
  const initialStart = block?.startsAt
    ? isoToDateTimeLocalValue(block.startsAt)
    : toDateTimeLocalValue(selectedDate, initialStartTime);
  const initialEnd = block?.endsAt
    ? isoToDateTimeLocalValue(block.endsAt)
    : addMinutesToDateTimeLocal(initialStart, 60);
  const initialStartParts = splitDateTimeLocal(initialStart);
  const initialEndParts = splitDateTimeLocal(initialEnd);
  const [blockDate, setBlockDate] = useState(initialStartParts.date);
  const [startTime, setStartTime] = useState(initialStartParts.time);
  const [endTime, setEndTime] = useState(initialEndParts.time);
  const [reason, setReason] = useState(block?.reason ?? "");
  const [state, setState] = useState<FormActionState>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function fieldError(name: string) {
    return state.fieldErrors?.[name]?.[0];
  }

  function submit() {
    const data = new FormData();
    if (mode === "edit" && block) data.set("id", block.id);
    data.set("startsAt", joinDateTimeLocal(blockDate, startTime));
    data.set("endsAt", joinDateTimeLocal(blockDate, endTime));
    data.set("reason", reason);
    data.set("returnTo", currentHref);

    startTransition(async () => {
      setState(await (mode === "edit" ? updateAction : createAction)({}, data));
    });
  }

  function remove() {
    if (!block) return;
    setShowDeleteConfirm(true);
  }

  function confirmRemove() {
    if (!block) return;
    const data = new FormData();
    data.set("id", block.id);
    data.set("returnTo", currentHref);
    startTransition(async () => {
      setState(await deleteAction({}, data));
    });
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex h-[88dvh] w-full sm:inset-y-0 sm:left-auto sm:right-0 sm:h-auto sm:w-[min(100vw,30rem)] lg:w-[29rem] xl:w-[30rem]">
      <aside
        className={`agenda-side-panel pointer-events-auto relative flex h-full w-full flex-col rounded-t-3xl border-t border-border bg-background shadow-2xl transition-transform duration-300 ease-out will-change-transform sm:rounded-none sm:border-l sm:border-t-0 ${
          isClosing
            ? "translate-y-full sm:translate-x-full sm:translate-y-0"
            : "translate-y-0 sm:translate-x-0 sm:translate-y-0"
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
              {mode === "edit" ? "Editar bloqueio" : "Novo bloqueio"}
            </h2>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mt-5 space-y-4">
            <CalendarDatePicker value={blockDate} onChange={setBlockDate} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="block-start-time">Hora de início</Label>
                <Select
                  id="block-start-time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                >
                  <option value="">Selecione o horário</option>
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </Select>
                {fieldError("startsAt") ? (
                  <p className="text-xs text-destructive">
                    {fieldError("startsAt")}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="block-end-time">Hora fim</Label>
                <Select
                  id="block-end-time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                >
                  <option value="">Selecione o horário</option>
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </Select>
                {fieldError("endsAt") ? (
                  <p className="text-xs text-destructive">
                    {fieldError("endsAt")}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="block-reason">Motivo</Label>
              <textarea
                id="block-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                className="min-h-28 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus:border-ring focus:ring-4 focus:ring-ring/15"
                placeholder="Ex.: Folga, compromisso externo, manutenção..."
              />
              {fieldError("reason") ? (
                <p className="text-xs text-destructive">
                  {fieldError("reason")}
                </p>
              ) : null}
            </div>

          <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-4 text-rose-950">
            <div className="flex items-start gap-3">
              <div>
                <h3 className="font-semibold">Bloqueio de horário</h3>
                <p className="mt-1 text-sm text-rose-900/80">
                  Bloqueios impedem que clientes encontrem horários livres
                  nesse intervalo.
                </p>
              </div>
            </div>
          </div>

            {block ? (
              <div className="rounded-2xl border border-border bg-muted/35 px-4 py-3 text-xs text-muted-foreground">
                Criado por{" "}
                <span className="font-semibold">{block.createdByName}</span>.
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-border bg-background px-5 py-4">
          {state.message ? (
            <div className="mb-3 rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              {state.message}
            </div>
          ) : null}
          <div
            className={cn(
              "grid gap-3",
              mode === "edit" ? "grid-cols-[auto_1fr_1fr]" : "grid-cols-2",
            )}
          >
            {mode === "edit" ? (
              <Button
                type="button"
                variant="outline"
                className="px-3 text-destructive hover:text-destructive"
                onClick={remove}
                disabled={isPending}
                aria-label="Remover bloqueio"
              >
                <Trash2 className="size-4" />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={submit} disabled={isPending}>
              {isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {mode === "edit" ? "Salvar" : "Criar bloqueio"}
            </Button>
          </div>
        </div>
      </aside>

      {showDeleteConfirm ? (
        <div
          className="pointer-events-auto absolute inset-0 z-[60] grid place-items-center bg-black/35 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-block-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <h3
              id="delete-block-title"
              className="text-lg font-semibold tracking-tight"
            >
              Excluir bloqueio?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Este período voltará a ficar disponível para novos agendamentos.
              Essa ação não poderá ser desfeita.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isPending}
              >
                Continuar editando
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmRemove}
                disabled={isPending}
              >
                {isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <p>Sim, excluir</p>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReceiptModal({
  appointment,
  onClose,
}: {
  appointment: AgendaAppointmentDetail;
  onClose: () => void;
}) {
  const checkout = appointment.checkout;
  if (!checkout) return null;

  const discount = Number(checkout.discount || 0);
  const tip = Number(checkout.tip || 0);

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/45 px-4 py-6 backdrop-blur-[1px] animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-title"
    >
      <div className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-background shadow-2xl">
        <button
          type="button"
          className="absolute left-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          onClick={onClose}
          aria-label="Fechar comprovante"
        >
          <X className="size-5" />
        </button>

        <div className="px-6 pb-8 pt-16">
          <div className="mb-5 flex items-center justify-between gap-3">
            <Badge variant="success" className="rounded-full px-4 py-1 text-sm">
              Pago
            </Badge>
            <p className="text-sm text-muted-foreground">
              {formatDateShort(checkout.paidAt)}
            </p>
          </div>

          <div className="mb-6">
            <h3 id="receipt-title" className="text-lg font-bold">
              Comprovante de pagamento
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              ID do agendamento: {appointment.id}
            </p>
          </div>

          <div className="mb-6 rounded-2xl border border-border p-4">
            <p className="font-semibold">{appointment.customer.name}</p>
            <p className="text-sm text-muted-foreground">
              {appointment.service.name} ·{" "}
              {formatSelectedDate(
                toDateInputValue(new Date(appointment.startsAt)),
              )}{" "}
              às {formatTime(appointment.startsAt)}
            </p>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex justify-between border-b border-border pb-3">
              <div>
                <p className="font-medium">{appointment.service.name}</p>
                <p className="text-xs text-muted-foreground">
                  {appointment.service.durationMinutes} min
                </p>
              </div>
              <p className="font-semibold">{formatCurrency(checkout.amount)}</p>
            </div>

            <div className="space-y-2 border-b border-border pb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(checkout.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Desconto</span>
                <span>{formatCurrency(discount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gorjeta</span>
                <span>{formatCurrency(tip)}</span>
              </div>
            </div>

            <div className="flex items-end justify-between">
              <span className="text-muted-foreground">Total pago</span>
              <span className="text-2xl font-bold">
                {formatCurrency(checkout.total)}
              </span>
            </div>

            <div className="rounded-2xl bg-muted px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Forma de pagamento
              </p>
              <p className="font-semibold">
                {paymentMethodLabel(checkout.paymentMethod)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pago em {formatDateShort(checkout.paidAt)} às{" "}
                {formatTime(checkout.paidAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="h-3 bg-[radial-gradient(circle_at_8px_0,transparent_7px,hsl(var(--background))_8px)] [background-size:16px_12px]" />
      </div>
    </div>
  );
}

function CheckoutPanel({
  appointment,
  onBack,
  action,
}: {
  appointment: AgendaAppointmentDetail;
  onBack: () => void;
  action: (state: FormActionState, data: FormData) => Promise<FormActionState>;
}) {
  const [state, setState] = useState<FormActionState>({});
  const [pending, startTransition] = useTransition();
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amount, setAmount] = useState(
    appointment.finalPrice ?? appointment.estimatedPrice ?? "0",
  );
  const [tip, setTip] = useState("0");
  const [discount, setDiscount] = useState("0");
  const total = Math.max(
    0,
    Number(amount || 0) + Number(tip || 0) - Number(discount || 0),
  );

  function submit() {
    const data = new FormData();
    data.set("id", appointment.id);
    data.set("paymentMethod", paymentMethod);
    data.set("amount", amount || "0");
    data.set("tip", tip || "0");
    data.set("discount", discount || "0");
    startTransition(async () => setState(await action({}, data)));
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
        <button
          type="button"
          className="mb-5 text-sm font-semibold text-primary"
          onClick={onBack}
        >
          ← Voltar ao agendamento
        </button>
        <h3 className="text-xl font-semibold tracking-tight">
          Informações de pagamento
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirme os valores e escolha como o cliente pagou.
        </p>

        <div className="mt-5 rounded-2xl border border-border p-4">
          <p className="font-semibold">{appointment.service.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatSelectedDate(
              toDateInputValue(new Date(appointment.startsAt)),
            )}{" "}
            · {formatTime(appointment.startsAt)}
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="checkoutAmount">Valor</Label>
            <Input
              id="checkoutAmount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="checkoutTip">Gorjeta</Label>
            <Input
              id="checkoutTip"
              type="number"
              min="0"
              step="0.01"
              value={tip}
              onChange={(event) => setTip(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="checkoutDiscount">Desconto</Label>
            <Input
              id="checkoutDiscount"
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-3 font-semibold">Método de pagamento</p>
          <div className="grid grid-cols-2 gap-3">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.value}
                type="button"
                className={`rounded-2xl border px-3 py-4 text-sm font-semibold transition-colors ${
                  paymentMethod === method.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card hover:bg-muted"
                }`}
                onClick={() => setPaymentMethod(method.value)}
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-background px-5 py-4">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total a receber</p>
            <p className="text-2xl font-bold">{formatCurrency(total)}</p>
          </div>
          <Badge variant="outline">
            {PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label}
          </Badge>
        </div>
        {state.message ? (
          <p className="mb-3 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.message}
          </p>
        ) : null}
        <Button
          type="button"
          className="w-full"
          disabled={pending}
          onClick={submit}
        >
          {pending ? "Confirmando..." : "Confirmar checkout"}
        </Button>
      </div>
    </div>
  );
}

function AppointmentDetailPanel({
  appointment,
  customers,
  services,
  isClosing,
  canEditAppointment,
  onClose,
  updateAction,
  statusAction,
  checkoutAction,
}: {
  appointment: AgendaAppointmentDetail;
  customers: { id: string; name: string; phone: string }[];
  services: AgendaServiceOption[];
  isClosing: boolean;
  canEditAppointment: boolean;
  onClose: () => void;
  updateAction: (
    state: FormActionState,
    data: FormData,
  ) => Promise<FormActionState>;
  statusAction: (
    state: FormActionState,
    data: FormData,
  ) => Promise<FormActionState>;
  checkoutAction: (
    state: FormActionState,
    data: FormData,
  ) => Promise<FormActionState>;
}) {
  const [activeTab, setActiveTab] = useState<"appointment" | "info">(
    "appointment",
  );
  const [editing, setEditing] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [confirmPending, startConfirmTransition] = useTransition();
  const isLocked = [
    "CANCELED_BY_CUSTOMER",
    "CANCELED_BY_PROVIDER",
    "NO_SHOW",
  ].includes(appointment.status);
  const estimatedPrice = appointment.estimatedPrice
    ? formatCurrency(appointment.estimatedPrice)
    : "—";
  const finalPrice = appointment.finalPrice
    ? formatCurrency(appointment.finalPrice)
    : "—";
  const formCustomers = customers.some(
    (customer) => customer.id === appointment.customer.id,
  )
    ? customers
    : [
        {
          id: appointment.customer.id,
          name: appointment.customer.name,
          phone: appointment.customer.phone,
        },
        ...customers,
      ];
  const formServices = services.some(
    (service) => service.id === appointment.service.id,
  )
    ? services
    : [
        {
          id: appointment.service.id,
          name: appointment.service.name,
          durationMinutes: appointment.service.durationMinutes,
          priceType: appointment.service.priceType,
          priceValue: appointment.service.priceValue,
          customFields: appointment.service.customFields,
          categoryName: appointment.service.categoryName,
          categoryActive: appointment.service.categoryActive,
        },
        ...services,
      ];
  const isFinished = appointment.status === "FINISHED";
  const customFieldValues = Object.fromEntries(
    appointment.customValues.map((item) => [item.customFieldId, item.value]),
  );
  const customValuesByService = appointment.customValues.reduce<
    {
      serviceId: string;
      serviceName: string;
      serviceDurationMinutes: number;
      values: typeof appointment.customValues;
    }[]
  >((groups, item) => {
    const group = groups.find((entry) => entry.serviceId === item.serviceId);
    if (group) {
      group.values.push(item);
      return groups;
    }

    groups.push({
      serviceId: item.serviceId,
      serviceName: item.serviceName,
      serviceDurationMinutes: item.serviceDurationMinutes,
      values: [item],
    });
    return groups;
  }, []);
  const hasCheckout = Boolean(appointment.checkout);
  const canConfirmAppointment = appointment.status === "REQUESTED";
  const canCheckout =
    !hasCheckout &&
    !canConfirmAppointment &&
    !["CANCELED_BY_CUSTOMER", "CANCELED_BY_PROVIDER", "NO_SHOW"].includes(
      appointment.status,
    );

  function confirmAppointment() {
    const data = new FormData();
    data.set("id", appointment.id);
    data.set("status", "CONFIRMED");

    if (typeof window !== "undefined") {
      data.set("returnTo", window.location.href);
    }

    startConfirmTransition(async () => {
      await statusAction({}, data);
    });
  }

  useEffect(() => {
    if (isClosing) return;

    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, [isClosing]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex h-[92dvh] w-full sm:inset-y-0 sm:left-auto sm:right-0 sm:h-auto sm:w-[min(100vw,30rem)] lg:w-[29rem] xl:w-[30rem]">
      <aside
        className={`agenda-side-panel pointer-events-auto relative flex h-full w-full flex-col rounded-t-3xl border-t border-border bg-background shadow-2xl transition-transform duration-300 ease-out will-change-transform sm:rounded-none sm:border-l sm:border-t-0 ${
          entered && !isClosing
            ? "translate-y-0 sm:translate-x-0 sm:translate-y-0"
            : "translate-y-full sm:translate-x-full sm:translate-y-0"
        }`}
      >
        <div className="bg-primary px-5 pb-8 pt-5 text-primary-foreground">
          <span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-primary-foreground/35 sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              className="rounded-full p-2 text-primary-foreground/80 transition-colors hover:bg-white/10 hover:text-primary-foreground cursor-pointer"
              onClick={onClose}
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary" className="bg-white/15 text-white">
                  {APPOINTMENT_STATUS_LABELS[appointment.status]}
                </Badge>
                {canEditAppointment && !isLocked ? (
                  <button
                    type="button"
                    className="rounded-xl border border-white/25 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 cursor-pointer"
                    onClick={() => setEditing((current) => !current)}
                  >
                    {editing ? "Ver resumo" : "Editar dados"}
                  </button>
                ) : null}
              </div>
              <h2 className="mt-2 truncate text-2xl font-bold tracking-tight">
                {appointment.customer.name}
              </h2>
              <p className="mt-1 text-xs text-primary-foreground/75">
                ID do agendamento: {appointment.id}
              </p>
            </div>
          </div>
        </div>

        <div className="-mt-6 px-5">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{appointment.service.name}</p>
                <p className="text-sm text-muted-foreground">
                  {appointment.service.durationMinutes} min ·{" "}
                  {APPOINTMENT_ORIGIN_LABELS[appointment.origin]}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-lg font-bold">
                  {finalPrice !== "—" ? finalPrice : estimatedPrice}
                </p>
              </div>
            </div>
          </div>
        </div>

        {!editing ? (
          <div className="shrink-0 border-b border-border px-5 pt-4">
            <div className="flex gap-6">
              <button
                type="button"
                className={`border-b-2 px-0 pb-3 text-xs font-semibold uppercase tracking-wide cursor-pointer ${
                  activeTab === "appointment"
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground"
                }`}
                onClick={() => setActiveTab("appointment")}
              >
                Agendamento
              </button>
              <button
                type="button"
                className={`border-b-2 px-0 pb-3 text-xs font-semibold uppercase tracking-wide cursor-pointer ${
                  activeTab === "info"
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground"
                }`}
                onClick={() => setActiveTab("info")}
              >
                Informações
              </button>
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          {checkout ? (
            <CheckoutPanel
              appointment={appointment}
              onBack={() => setCheckout(false)}
              action={checkoutAction}
            />
          ) : editing ? (
            <AppointmentForm
              mode="edit"
              customers={formCustomers}
              services={formServices}
              action={updateAction}
              onDiscard={() => setEditing(false)}
              lockSchedule={isFinished}
              customFieldValues={customFieldValues}
              statusOptions={isFinished ? ["FINISHED", "NO_SHOW"] : undefined}
              defaultValues={{
                id: appointment.id,
                customerId: appointment.customer.id,
                serviceId: appointment.service.id,
                startsAt: `${toDateInputValue(
                  new Date(appointment.startsAt),
                )}T${formatTime(appointment.startsAt)}`,
                customerNotes: appointment.customerNotes ?? "",
                internalNotes: appointment.internalNotes ?? "",
                estimatedPrice: formatDecimalInput(appointment.estimatedPrice),
                finalPrice: formatDecimalInput(appointment.finalPrice),
                status: appointment.status,
                allowOutsideAvailability: false,
                allowConcurrentAppointment: false,
              }}
            />
          ) : activeTab === "appointment" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Data e horário
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {formatSelectedDate(
                    toDateInputValue(new Date(appointment.startsAt)),
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(appointment.startsAt)} -{" "}
                  {formatTime(appointment.endsAt)}
                </p>
              </div>

              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Cliente
                </p>
                <p className="mt-2 font-semibold">
                  {appointment.customer.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {appointment.customer.phone}
                </p>
                <p className="text-sm text-muted-foreground">
                  {appointment.customer.email ?? "Sem e-mail"}
                </p>
              </div>

              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Serviço
                </p>
                <p className="mt-2 font-semibold">{appointment.service.name}</p>
                <p className="text-sm text-muted-foreground">
                  {appointment.service.categoryName} ·{" "}
                  {appointment.service.durationMinutes} minutos
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Estimado</p>
                  <p className="mt-1 text-lg font-bold">{estimatedPrice}</p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Final</p>
                  <p className="mt-1 text-lg font-bold">{finalPrice}</p>
                </div>
              </div>

              {appointment.checkout ? (
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-border bg-emerald-50/70 p-4 text-left transition-colors hover:bg-emerald-50 cursor-pointer"
                  onClick={() => setReceiptOpen(true)}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                      <ReceiptText className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="success" className="rounded-full">
                          Pago
                        </Badge>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatTime(appointment.checkout.paidAt)} ·{" "}
                          {formatDateShort(appointment.checkout.paidAt)}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {paymentMethodLabel(appointment.checkout.paymentMethod)}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-bold">
                    {formatCurrency(appointment.checkout.total)}
                  </p>
                </button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Campos dos serviços
                </p>
                {customValuesByService.length ? (
                  <div className="mt-3 space-y-4">
                    {customValuesByService.map((group) => (
                      <div
                        key={group.serviceId}
                        className="rounded-xl border border-border/80 p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold">
                            {group.serviceName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {group.serviceDurationMinutes} min
                          </p>
                        </div>
                        <dl className="mt-3 space-y-3">
                          {group.values.map((item) => (
                            <div key={item.id}>
                              <dt className="text-xs text-muted-foreground">
                                {item.label}
                              </dt>
                              <dd className="mt-0.5 text-sm font-medium">
                                {item.fieldType === "BOOLEAN"
                                  ? item.value === "true" || item.value === "on"
                                    ? "Sim"
                                    : "N?o"
                                  : item.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nenhum campo personalizado preenchido.
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Observações do cliente
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {appointment.customerNotes || "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Observações internas
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {appointment.internalNotes || "—"}
                </p>
              </div>
              {appointment.review ? (
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Avaliação do cliente
                  </p>
                  <p className="mt-2 font-semibold">
                    ★ {appointment.review.rating} de 5
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {appointment.review.comment || "Sem comentário."}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {!editing && !checkout ? (
          <div className="shrink-0 border-t border-border bg-background px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <Badge variant={statusBadgeVariant(appointment.status)}>
                {APPOINTMENT_STATUS_LABELS[appointment.status]}
              </Badge>
              {hasCheckout ? (
                <Button type="button" onClick={() => setReceiptOpen(true)}>
                  Ver comprovante
                </Button>
              ) : canConfirmAppointment ? (
                <Button
                  type="button"
                  disabled={confirmPending}
                  onClick={confirmAppointment}
                >
                  {confirmPending ? "Confirmando..." : "Confirmar"}
                </Button>
              ) : canCheckout ? (
                <Button type="button" onClick={() => setCheckout(true)}>
                  Checkout
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={onClose}>
                  Fechar
                </Button>
              )}
            </div>
          </div>
        ) : null}
        {receiptOpen ? (
          <ReceiptModal
            appointment={appointment}
            onClose={() => setReceiptOpen(false)}
          />
        ) : null}
      </aside>
    </div>
  );
}

export function ProviderAgendaView({
  selectedDate,
  viewMode,
  initialStartTime,
  isCreating,
  isCreatingScheduleBlock,
  appointments,
  scheduleBlocks,
  workingHours,
  services,
  customers,
  filters,
  selectedAppointment,
  selectedScheduleBlock,
  canEditAppointment,
  createAction,
  updateAction,
  statusAction,
  checkoutAction,
  createScheduleBlockAction,
  updateScheduleBlockAction,
  deleteScheduleBlockAction,
}: ProviderAgendaViewProps) {
  const router = useRouter();
  const agendaScrollRef = useRef<HTMLDivElement>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [discardHref, setDiscardHref] = useState<string | null>(null);
  const [createPanelEntered, setCreatePanelEntered] = useState(false);
  const [detailPanelEntered, setDetailPanelEntered] = useState(false);
  const [blockPanelEntered, setBlockPanelEntered] = useState(false);
  const [isPanelClosing, setIsPanelClosing] = useState(false);
  const [isDetailClosing, setIsDetailClosing] = useState(false);
  const [isBlockClosing, setIsBlockClosing] = useState(false);
  const [floatingMenuOpen, setFloatingMenuOpen] = useState(false);
  const [actionBackdropClosing, setActionBackdropClosing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { startMinutes: dayStartMinutes, endMinutes: dayEndMinutes } =
    scheduleRangeFor(selectedDate, viewMode, workingHours);
  const hours = Array.from(
    { length: Math.floor((dayEndMinutes - dayStartMinutes) / 60) + 1 },
    (_, index) => dayStartMinutes + index * 60,
  );
  const monthDays = getMonthDays(selectedDate);
  const appointmentDates = new Set(
    appointments.map((appointment) =>
      toDateInputValue(new Date(appointment.startsAt)),
    ),
  );
  const previousDate = moveDateByView(viewMode, selectedDate, -1);
  const nextDate = moveDateByView(viewMode, selectedDate, 1);
  const now = new Date();
  const today = toDateInputValue(now);
  const showNow = selectedDate === today;
  const nowTop = ((localMinutes(now) - dayStartMinutes) / 60) * HOUR_HEIGHT;
  const timelineHeight =
    ((dayEndMinutes - dayStartMinutes) / 60) * HOUR_HEIGHT;
  const slotHeight = (SLOT_MINUTES / 60) * HOUR_HEIGHT;
  const slots = Array.from(
    { length: (dayEndMinutes - dayStartMinutes) / SLOT_MINUTES },
    (_, index) => {
      const minutes = dayStartMinutes + index * SLOT_MINUTES;
      return {
        minutes,
        label: timeFromMinutes(minutes),
        top: index * slotHeight,
      };
    },
  );
  const currentHref = queryFor(selectedDate, filters, viewMode);
  const newAppointmentHref = withPanel(currentHref, "new");
  const newScheduleBlockHref = withPanel(currentHref, "block");
  const dayCollisionLayouts = appointmentCollisionLayouts(
    appointments,
    dayStartMinutes,
    dayEndMinutes,
  );
  const dayScheduleBlocks = scheduleBlocksForDay(scheduleBlocks, selectedDate);
  const dayTimelineMinWidth = Math.max(
    DAY_VIEW_MIN_WIDTH,
    80 + maxCollisionColumns(dayCollisionLayouts) * COLLISION_CARD_MIN_WIDTH,
  );
  const selectedAppointmentId = selectedAppointment?.id;
  const selectedScheduleBlockId = selectedScheduleBlock?.id;
  const blockPanelOpen = isCreatingScheduleBlock || Boolean(selectedScheduleBlock);
  const sidePanelOpen =
    isCreating || Boolean(selectedAppointment) || blockPanelOpen;
  const sidePanelVisuallyOpen =
    (isCreating && createPanelEntered && !isPanelClosing) ||
    (Boolean(selectedAppointment) && detailPanelEntered && !isDetailClosing) ||
    (blockPanelOpen && blockPanelEntered && !isBlockClosing);
  const canCreateAppointment = customers.length > 0 && services.length > 0;
  const [slotMenu, setSlotMenu] = useState<{
    top: number;
    label: string;
  } | null>(null);

  const actionMenuOpen = Boolean(slotMenu || floatingMenuOpen);

  useEffect(() => {
    if (!sidePanelOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [sidePanelOpen]);

  useEffect(() => {
    if (!isCreating) return;

    const frame = window.requestAnimationFrame(() =>
      setCreatePanelEntered(true),
    );

    return () => window.cancelAnimationFrame(frame);
  }, [isCreating]);

  useEffect(() => {
    if (!selectedAppointmentId || isCreating) return;

    const frame = window.requestAnimationFrame(() => {
      setIsDetailClosing(false);
      setDetailPanelEntered(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selectedAppointmentId, isCreating]);

  useEffect(() => {
    if (!blockPanelOpen || isCreating) return;

    const frame = window.requestAnimationFrame(() => {
      setIsBlockClosing(false);
      setBlockPanelEntered(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [blockPanelOpen, selectedScheduleBlockId, isCreating]);

  useEffect(() => {
    if (sidePanelOpen) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, 15000);

    return () => window.clearInterval(interval);
  }, [router, sidePanelOpen]);

  useEffect(() => {
    if (
      viewMode !== "day" ||
      !showNow ||
      nowTop < 0 ||
      nowTop > timelineHeight
    ) {
      return;
    }

    const scrollContainer = agendaScrollRef.current;
    if (!scrollContainer) return;

    const animationFrame = window.requestAnimationFrame(() => {
      const centeredTop = nowTop - scrollContainer.clientHeight / 2;
      const maxScrollTop =
        scrollContainer.scrollHeight - scrollContainer.clientHeight;

      scrollContainer.scrollTo({
        top: Math.max(0, Math.min(centeredTop, maxScrollTop)),
        behavior: "auto",
      });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [nowTop, showNow, timelineHeight, selectedDate, viewMode]);

  function closeActionMenus() {
    setActionBackdropClosing(true);
    window.setTimeout(() => {
      setSlotMenu(null);
      setFloatingMenuOpen(false);
      setActionBackdropClosing(false);
    }, 160);
  }

  const navigate = (href: string) => {
    setSlotMenu(null);
    setFloatingMenuOpen(false);
    setActionBackdropClosing(false);
    const isAppointmentsNavigation =
      href === "/app/appointments" || href.startsWith("/app/appointments?");
    let nextHref =
      isCreating && isAppointmentsNavigation ? withPanel(href, "new") : href;
    nextHref =
      isCreatingScheduleBlock && isAppointmentsNavigation
        ? withPanel(nextHref, "block")
        : nextHref;

    if ((isCreating || isCreatingScheduleBlock) && !isAppointmentsNavigation) {
      setDiscardHref(href);
      setShowDiscardConfirm(true);
      return;
    }

    startTransition(() => {
      if (nextHref.includes("panel=new")) {
        setIsPanelClosing(false);
      }
      if (hrefHasAppointmentDetail(nextHref)) {
        setIsDetailClosing(false);
        setDetailPanelEntered(false);
      } else {
        setDetailPanelEntered(false);
      }
      if (hrefHasScheduleBlockPanel(nextHref)) {
        setIsBlockClosing(false);
        setBlockPanelEntered(false);
      } else {
        setBlockPanelEntered(false);
      }
      router.push(nextHref);
    });
  };

  const changeViewMode = (nextViewMode: AgendaViewMode) => {
    storeAgendaViewMode(nextViewMode);
    navigate(queryFor(selectedDate, filters, nextViewMode));
  };

  const requestCloseNewAppointment = () => {
    setDiscardHref(currentHref);
    setShowDiscardConfirm(true);
  };

  const closeAppointmentDetail = () => {
    setIsDetailClosing(true);
    setDetailPanelEntered(false);
    window.setTimeout(() => {
      startTransition(() => {
        router.push(currentHref);
      });
    }, 300);
  };

  const closeScheduleBlockPanel = () => {
    setIsBlockClosing(true);
    setBlockPanelEntered(false);
    window.setTimeout(() => {
      startTransition(() => {
        router.push(currentHref);
      });
    }, 300);
  };

  const confirmCloseNewAppointment = () => {
    const nextHref = discardHref ?? currentHref;
    setShowDiscardConfirm(false);
    setDiscardHref(null);
    setIsPanelClosing(true);
    setCreatePanelEntered(false);
    setIsBlockClosing(true);
    setBlockPanelEntered(false);
    window.setTimeout(() => {
      startTransition(() => {
        router.push(nextHref);
      });
    }, 300);
  };

  return (
    <div
      className={`relative flex flex-col gap-4 transition-[padding-right] duration-300 ease-out lg:h-[calc(100dvh-4rem)] lg:min-h-0 lg:overflow-hidden ${
        sidePanelVisuallyOpen ? "lg:pr-[29.5rem] xl:pr-[30.5rem]" : ""
      }`}
    >
      <div className="hidden">
        <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-[minmax(150px,220px)_minmax(220px,280px)_minmax(280px,auto)] lg:items-center lg:gap-4">
          <div className="flex items-center gap-2">
            <Select
              value={viewMode}
              dropdownStrategy="absolute"
              onChange={(event) =>
                changeViewMode(event.target.value as AgendaViewMode)
              }
              className="h-10 min-w-36"
              aria-label="Visualização da agenda"
            >
              {Object.entries(VIEW_MODE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <details className="group overflow-hidden rounded-xl border border-border bg-card lg:min-w-60 lg:justify-self-center">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-1.5 py-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={(event) => {
                  event.preventDefault();
                  navigate(queryFor(previousDate, filters, viewMode));
                }}
                aria-label="Período anterior"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="min-w-0 flex-1 px-1 text-center">
                <p className="truncate text-sm font-semibold capitalize leading-tight">
                  {viewRangeLabel(viewMode, selectedDate)}
                </p>
                <p className="text-xs leading-tight text-muted-foreground">
                  {timeFromMinutes(dayStartMinutes)} -{" "}
                  {timeFromMinutes(dayEndMinutes)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={(event) => {
                  event.preventDefault();
                  navigate(queryFor(nextDate, filters, viewMode));
                }}
                aria-label="Pr?ximo per?odo"
              >
                <ChevronRight className="size-4" />
              </Button>
              <Clock3 className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 lg:hidden" />
            </summary>
            <div className="border-t border-border p-3 lg:hidden">
              <CalendarPanel
                selectedDate={selectedDate}
                today={today}
                monthDays={monthDays}
                appointmentDates={appointmentDates}
                filters={filters}
                viewMode={viewMode}
                onNavigate={navigate}
              />
            </div>
          </details>

          <div className="flex items-center gap-2 lg:justify-self-end">
            <div className="relative flex-1 lg:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 pl-9"
                placeholder="Buscar cliente ou serviço"
                aria-label="Buscar cliente ou serviço"
              />
            </div>
            <div className="relative">
              <Button
                type="button"
                className="h-10 bg-primary px-4 shadow-sm hover:bg-primary/90 cursor-pointer"
                onClick={() => {
                  if (floatingMenuOpen) {
                    closeActionMenus();
                    return;
                  }
                  setActionBackdropClosing(false);
                  setSlotMenu(null);
                  setFloatingMenuOpen(true);
                }}
              >
                <CalendarPlus className="size-4" />
                <span className="hidden sm:inline">Novo</span>
              </Button>
              {floatingMenuOpen ? (
                <div
                  className={`absolute right-0 top-12 z-[80] hidden w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all duration-150 lg:block ${
                    actionBackdropClosing
                      ? "translate-y-1 opacity-0"
                      : "translate-y-0 opacity-100"
                  }`}
                >
                  <button
                    type="button"
                    className="block w-full border-b border-border px-5 py-4 text-center text-sm font-semibold transition-colors hover:bg-muted cursor-pointer"
                    onClick={() => navigate(newAppointmentHref)}
                  >
                    Novo agendamento
                  </button>
                  <button
                    type="button"
                    className="block w-full border-border px-5 py-4 text-center text-sm font-semibold transition-colors hover:bg-muted cursor-pointer"
                    onClick={() => navigate(newScheduleBlockHref)}
                  >
                    Novo bloqueio de horário
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)] lg:overflow-hidden">
        <aside className="hidden min-h-0 space-y-3 lg:block lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
          <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold capitalize">
                {formatMonthTitle(selectedDate)}
              </p>
              <div className="flex items-center gap-1">
                <NavButton
                  href={queryFor(
                    addMonths(selectedDate, -1),
                    filters,
                    viewMode,
                  )}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  ariaLabel="Mês anterior"
                  onNavigate={navigate}
                >
                  <ChevronLeft className="size-4" />
                </NavButton>
                <NavButton
                  href={queryFor(addMonths(selectedDate, 1), filters, viewMode)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  ariaLabel="Próximo mês"
                  onNavigate={navigate}
                >
                  <ChevronRight className="size-4" />
                </NavButton>
              </div>
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
                <NavButton
                  key={day.value}
                  href={queryFor(day.value, filters, viewMode)}
                  onNavigate={navigate}
                  className={`relative rounded-full py-1.5 transition-colors hover:bg-muted ${
                    day.value === selectedDate
                      ? "bg-primary text-primary-foreground hover:bg-primary"
                    : day.value === today
                        ? "font-semibold text-primary ring-1 ring-primary/20 hover:bg-primary/5"
                        : day.muted
                          ? "text-muted-foreground/50"
                          : "text-foreground"
                  }`}
                >
                  {day.label}
                  {appointmentDates.has(day.value) ? (
                    <span
                      className={`absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full ${
                        day.value === selectedDate ? "bg-white" : "bg-primary/70"
                      }`}
                    />
                  ) : null}
                </NavButton>
              ))}
            </div>
          </div>

          <details className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
              <Filter className="size-4" />
              Filtros
            </summary>
            <div className="mt-4">
              <AgendaFilters
                filters={filters}
                services={services}
                customers={customers}
                viewMode={viewMode}
                onNavigate={navigate}
              />
            </div>
          </details>

          <div className="hidden rounded-2xl border border-border bg-card p-3.5 shadow-sm lg:block">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Filter className="size-4" />
              Destacar agendamentos
            </div>
            <AgendaFilters
              filters={filters}
              services={services}
              customers={customers}
              viewMode={viewMode}
              onNavigate={navigate}
            />
          </div>
        </aside>

        <section className="relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {isPending ? (
            <div className="absolute inset-0 z-30 grid place-items-center bg-background/70 backdrop-blur-[1px]">
              <div className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                Atualizando agenda...
              </div>
            </div>
          ) : null}

          <div className="shrink-0 border-b border-border bg-muted/20 px-4 py-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
              <div className="order-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center lg:justify-self-end">
                <Select
                  value={viewMode}
                  dropdownStrategy="absolute"
                  onChange={(event) =>
                    changeViewMode(event.target.value as AgendaViewMode)
                  }
                  className="h-10 w-full sm:w-36"
                  aria-label="Visualização da agenda"
                >
                  {Object.entries(VIEW_MODE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <div className="relative">
              <Button
                type="button"
                className="h-10 bg-primary px-4 shadow-sm hover:bg-primary/90 cursor-pointer"
                onClick={() => {
                  if (floatingMenuOpen) {
                    closeActionMenus();
                    return;
                  }
                  setActionBackdropClosing(false);
                  setSlotMenu(null);
                  setFloatingMenuOpen(true);
                }}
              >
                <CalendarPlus className="size-4" />
                <span className="hidden sm:inline">Novo</span>
              </Button>
              {floatingMenuOpen ? (
                <div
                  className={`absolute right-0 top-12 z-[80] hidden w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all duration-150 lg:block ${
                    actionBackdropClosing
                      ? "translate-y-1 opacity-0"
                      : "translate-y-0 opacity-100"
                  }`}
                >
                  <button
                    type="button"
                    className="block w-full border-b border-border px-5 py-4 text-center text-sm font-semibold transition-colors hover:bg-muted cursor-pointer"
                    onClick={() => navigate(newAppointmentHref)}
                  >
                    Novo agendamento
                  </button>
                  <button
                    type="button"
                    className="block w-full border-border px-5 py-4 text-center text-sm font-semibold transition-colors hover:bg-muted cursor-pointer"
                    onClick={() => navigate(newScheduleBlockHref)}
                  >
                    Novo bloqueio de horário
                  </button>
                </div>
              ) : null}
            </div>
              </div>

              <details className="order-2 overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:min-w-60 lg:justify-self-center">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-1.5 py-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={(event) => {
                      event.preventDefault();
                      navigate(queryFor(previousDate, filters, viewMode));
                    }}
                    aria-label="Período anterior"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <div className="min-w-0 flex-1 px-1 text-center">
                    <p className="truncate text-sm font-semibold capitalize leading-tight">
                      {viewRangeLabel(viewMode, selectedDate)}
                    </p>
                    <p className="text-xs leading-tight text-muted-foreground">
                      {timeFromMinutes(dayStartMinutes)} -{" "}
                      {timeFromMinutes(dayEndMinutes)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={(event) => {
                      event.preventDefault();
                      navigate(queryFor(nextDate, filters, viewMode));
                    }}
                    aria-label="Próximo período"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </summary>
                <div className="border-t border-border p-3 lg:hidden">
                  <CalendarPanel
                    selectedDate={selectedDate}
                    today={today}
                    monthDays={monthDays}
                    appointmentDates={appointmentDates}
                    filters={filters}
                    viewMode={viewMode}
                    onNavigate={navigate}
                  />
                </div>
              </details>

              <div className="order-1 min-w-0 lg:justify-self-start lg:text-left">
                <h1 className="text-lg font-semibold">
                  {viewMode === "day"
                    ? "Agenda do dia"
                    : viewMode === "week"
                      ? "Agenda da semana"
                      : viewMode === "month"
                        ? "Agenda do mês"
                        : "Agenda"}
                </h1>
                <p className="text-sm capitalize text-muted-foreground">
                  {appointments.length}{" "}
                  {appointments.length === 1 ? "agendamento" : "agendamentos"}{" "}
                  em {viewRangeLabel(viewMode, selectedDate)}
                </p>
              </div>
            </div>
          </div>

          <div
            ref={agendaScrollRef}
            className="relative min-h-0 flex-1 overflow-auto overscroll-contain"
          >
            {viewMode === "agenda" ? (
              <AgendaListView
                selectedDate={selectedDate}
                appointments={appointments}
                hrefForDate={(date) => queryFor(date, filters, viewMode)}
                onNavigate={navigate}
              />
            ) : viewMode === "month" ? (
              <MonthView
                selectedDate={selectedDate}
                appointments={appointments}
                today={today}
                hrefForDate={(date) => queryFor(date, filters, viewMode)}
                onNavigate={navigate}
                onDayClick={(date) =>
                  navigate(withPanel(queryFor(date, filters, viewMode), "new"))
                }
              />
            ) : viewMode === "week" ? (
              <WeekView
                selectedDate={selectedDate}
                appointments={appointments}
                scheduleBlocks={scheduleBlocks}
                today={today}
                hours={hours}
                slots={slots}
                slotHeight={slotHeight}
                timelineHeight={timelineHeight}
                dayStartMinutes={dayStartMinutes}
                dayEndMinutes={dayEndMinutes}
                onSlotClick={(date, label) =>
                  navigate(
                    withPanelAndStartTime(
                      queryFor(date, filters, viewMode),
                      label,
                    ),
                  )
                }
                hrefForDate={(date) => queryFor(date, filters, viewMode)}
                onNavigate={navigate}
              />
            ) : (
              <>
              <MobileDayAgenda
                appointments={appointments}
                currentHref={currentHref}
                onNavigate={navigate}
              />
              <div
                className="relative hidden min-w-[520px] overflow-hidden md:block"
                style={{
                  height: timelineHeight,
                  minWidth: dayTimelineMinWidth,
                  width: `max(100%, ${dayTimelineMinWidth}px)`,
                }}
              >
                {hours.slice(0, -1).map((hour, index) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-border/75"
                    style={{ top: index * HOUR_HEIGHT }}
                  >
                    <span className="absolute left-4 top-2  text-xs tabular-nums text-muted-foreground">
                      {timeFromMinutes(hour)}
                    </span>
                    <div className="ml-20 h-full border-l border-dashed border-border/45" />
                  </div>
                ))}

                <div className="absolute bottom-0 left-0 right-0 border-t border-border" />
                <div className="absolute inset-y-0 left-20 right-0">
                  {slots.map((slot) => (
                    <button
                      key={slot.label}
                      type="button"
                      className="group absolute left-0 right-0 border-t border-dashed border-border/35 text-left transition-colors hover:bg-primary/5"
                      style={{ top: slot.top, height: slotHeight }}
                      onClick={() => {
                        setActionBackdropClosing(false);
                        setFloatingMenuOpen(false);
                        setSlotMenu({ top: slot.top, label: slot.label });
                      }}
                      aria-label={`Ações para ${slot.label}`}
                    >
                      <span className="pointer-events-none ml-3 hidden translate-y-[-50%] rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-border group-hover:inline-block">
                        {slot.label}
                      </span>
                    </button>
                  ))}
                </div>

                {slotMenu ? (
                  <div
                    className={`absolute left-20 right-0 z-40 rounded-full border-y border-dashed border-white/90 bg-background/95 shadow-[0_0_24px_rgba(255,255,255,0.28)] transition-opacity duration-150 ${
                      actionBackdropClosing ? "opacity-0" : "opacity-100"
                    }`}
                    style={{ top: slotMenu.top, height: slotHeight }}
                  >
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground shadow-sm">
                      {slotMenu.label} -{" "}
                      {timeFromMinutes(
                        Math.min(
                          dayEndMinutes,
                          dayStartMinutes +
                            Math.round(slotMenu.top / slotHeight) *
                              SLOT_MINUTES +
                            SLOT_MINUTES,
                        ),
                      )}
                    </span>
                    <span className="absolute -right-1 top-1/2 size-3 -translate-y-1/2 rounded-full bg-background shadow-sm" />
                  </div>
                ) : null}

                {slotMenu ? (
                  <div
                    className={`absolute right-4 z-[80] w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all duration-150 ${
                      actionBackdropClosing
                        ? "translate-y-1 opacity-0"
                        : "translate-y-0 opacity-100"
                    }`}
                    style={{
                      top: Math.min(slotMenu.top + 4, timelineHeight - 220),
                    }}
                  >
                    <button
                      type="button"
                      className="block w-full border-b border-border px-5 py-4 text-center text-sm font-semibold transition-colors hover:bg-muted cursor-pointer"
                      onClick={() =>
                        navigate(
                          withPanelAndStartTime(currentHref, slotMenu.label),
                        )
                      }
                    >
                      Novo agendamento
                    </button>
                    <button
                      type="button"
                      className="block w-full border-border px-5 py-4 text-center text-sm font-semibold transition-colors hover:bg-muted cursor-pointer"
                      onClick={() =>
                        navigate(
                          withBlockPanelAndStartTime(currentHref, slotMenu.label),
                        )
                      }
                    >
                      Novo bloqueio de horário
                    </button>
                  </div>
                ) : null}

                {showNow && nowTop >= 0 && nowTop <= timelineHeight ? (
                  <div
                    className="absolute left-4 right-0 z-50 flex items-center gap-2"
                    style={{ top: nowTop }}
                  >
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm">
                      {formatTime(now)}
                    </span>
                    <span className="size-2 rounded-full bg-primary" />
                    <span className="h-px flex-1 bg-primary/65" />
                  </div>
                ) : null}

                <div className="absolute inset-y-0 left-20 right-0 pointer-events-none">
                  {dayScheduleBlocks.map((block) => (
                    <ScheduleBlockItem
                      key={block.id}
                      block={block}
                      date={selectedDate}
                      href={withScheduleBlockDetail(currentHref, block.id)}
                      onNavigate={navigate}
                      dayStartMinutes={dayStartMinutes}
                      dayEndMinutes={dayEndMinutes}
                    />
                  ))}

                  {appointments.map((appointment) => (
                    <AppointmentBlock
                      key={appointment.id}
                      appointment={appointment}
                      href={withAppointmentDetail(currentHref, appointment.id)}
                      onNavigate={navigate}
                      dayStartMinutes={dayStartMinutes}
                      dayEndMinutes={dayEndMinutes}
                      collisionLayout={dayCollisionLayouts.get(appointment.id)}
                    />
                  ))}

                  {!appointments.length ? (
                    <div className="absolute inset-x-4 top-16 rounded-2xl border border-dashed border-border bg-background/80 px-4 py-8 text-center">
                      <Lock className="mx-auto mb-2 size-6 text-muted-foreground" />
                      <p className="text-sm font-semibold">
                        Nenhum agendamento neste dia
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Use o botão flutuante para criar um horário manual.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
              </>
            )}
          </div>
        </section>
      </div>

      <details className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
          <Filter className="size-4" />
          Filtros
        </summary>
        <div className="mt-4">
          <AgendaFilters
            filters={filters}
            services={services}
            customers={customers}
            viewMode={viewMode}
            onNavigate={navigate}
          />
        </div>
      </details>

      {actionMenuOpen && !isCreating ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className={`fixed inset-0 z-[60] bg-black/35 transition-opacity duration-150 ${
            actionBackdropClosing ? "opacity-0" : "opacity-100"
          }`}
          onClick={closeActionMenus}
        />
      ) : null}

      <div className="fixed bottom-5 right-5 z-[70] lg:hidden">
        <button
          type="button"
          className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105 cursor-pointer"
          onClick={() => {
            if (floatingMenuOpen) {
              closeActionMenus();
              return;
            }
            setActionBackdropClosing(false);
            setSlotMenu(null);
            setFloatingMenuOpen(true);
          }}
          aria-label="Abrir ações"
        >
          <Plus
            className={`size-6 transition-transform ${
              floatingMenuOpen ? "rotate-45" : ""
            }`}
          />
        </button>
        {floatingMenuOpen ? (
          <div
            className={`absolute bottom-16 right-0 w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all duration-150 ${
              actionBackdropClosing
                ? "translate-y-1 opacity-0"
                : "translate-y-0 opacity-100"
            }`}
          >
            <button
              type="button"
              className="block w-full border-b border-border px-5 py-4 text-center text-sm font-semibold transition-colors hover:bg-muted cursor-pointer"
              onClick={() => navigate(newAppointmentHref)}
            >
              Novo agendamento
            </button>
            <button
              type="button"
              className="block w-full border-border px-5 py-4 text-center text-sm font-semibold transition-colors hover:bg-muted cursor-pointer"
              onClick={() => navigate(newScheduleBlockHref)}
            >
              Novo bloqueio de horário
            </button>
          </div>
        ) : null}
      </div>

      {selectedAppointment && !isCreating ? (
        <AppointmentDetailPanel
          appointment={selectedAppointment}
          customers={customers.map((customer) => ({
            id: customer.id,
            name: customer.name,
            phone: customer.phone ?? "",
          }))}
          services={services}
          isClosing={isDetailClosing}
          canEditAppointment={canEditAppointment}
          onClose={closeAppointmentDetail}
          updateAction={updateAction}
          statusAction={statusAction}
          checkoutAction={checkoutAction}
        />
      ) : null}

      {blockPanelOpen && !isCreating && !selectedAppointment ? (
        <ScheduleBlockPanel
          key={selectedScheduleBlock?.id ?? `new-${selectedDate}-${initialStartTime ?? ""}`}
          mode={selectedScheduleBlock ? "edit" : "create"}
          block={selectedScheduleBlock}
          selectedDate={selectedDate}
          initialStartTime={initialStartTime}
          currentHref={currentHref}
          isClosing={!blockPanelEntered || isBlockClosing}
          onClose={closeScheduleBlockPanel}
          createAction={createScheduleBlockAction}
          updateAction={updateScheduleBlockAction}
          deleteAction={deleteScheduleBlockAction}
        />
      ) : null}

      {isCreating ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex h-[92dvh] w-full sm:inset-y-0 sm:left-auto sm:right-0 sm:h-auto sm:w-[min(100vw,30rem)] lg:w-[29rem] xl:w-[30rem]">
          <aside
            className={`agenda-side-panel pointer-events-auto relative flex h-full w-full flex-col rounded-t-3xl border-t border-border bg-background shadow-2xl transition-transform duration-300 ease-out will-change-transform sm:rounded-none sm:border-l sm:border-t-0 ${
              createPanelEntered && !isPanelClosing
                ? "translate-y-0 sm:translate-x-0 sm:translate-y-0"
                : "translate-y-full sm:translate-x-full sm:translate-y-0"
            }`}
          >
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
              <span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-muted-foreground/25 sm:hidden" />
              <button
                type="button"
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={requestCloseNewAppointment}
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Novo agendamento
                </h2>
              </div>
            </div>

            <div className="flex min-h-0 w-full flex-1 px-5 py-5">
              {canCreateAppointment ? (
                <AppointmentForm
                  mode="create"
                  customers={customers.map((customer) => ({
                    id: customer.id,
                    name: customer.name,
                    phone: customer.phone ?? "",
                  }))}
                  services={services}
                  action={createAction}
                  onDiscard={requestCloseNewAppointment}
                  returnTo={currentHref}
                  defaultValues={{
                    customerId: "",
                    serviceId: "",
                    startsAt: toDateTimeLocalValue(
                      selectedDate,
                      initialStartTime,
                    ),
                    status: "CONFIRMED",
                    customerNotes: "",
                    internalNotes: "",
                    estimatedPrice: "",
                    allowOutsideAvailability: false,
                    allowConcurrentAppointment: false,
                  }}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  É necessário possuir ao menos um cliente ativo e um serviço
                  ativo para criar um agendamento.
                </div>
              )}
            </div>
          </aside>
          {showDiscardConfirm ? (
            <div
              className="pointer-events-auto absolute inset-0 z-[60] grid place-items-center bg-black/35 px-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="discard-appointment-title"
            >
              <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
                <h3
                  id="discard-appointment-title"
                  className="text-lg font-semibold tracking-tight"
                >
                  Descartar agendamento?
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  As informações preenchidas neste painel serão removidas e o
                  agendamento não será salvo.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDiscardConfirm(false)}
                  >
                    Continuar editando
                  </Button>
                  <Button type="button" onClick={confirmCloseNewAppointment}>
                    Sim, descartar
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
