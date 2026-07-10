"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  addDaysToDateString,
  getDateStringInTimezone,
  normalizeBookingTimezone,
} from "@/features/booking-core/timezone";
import { PublicCustomerAuthModal } from "@/features/public-booking/public-customer-auth-modal";

type PublicCustomerUser = {
  id: string;
  name: string;
  email: string;
  globalRole: string;
};

type PublicSlot = {
  value: string;
  label: string;
  date?: string;
};

type Shift = "morning" | "afternoon" | "night";

const SHIFT_LABELS: Record<Shift, string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  night: "Noite",
};

const SHIFTS: Shift[] = ["morning", "afternoon", "night"];

function slotDate(slot: PublicSlot) {
  return slot.date ?? slot.value.slice(0, 10);
}

function slotTime(slot: PublicSlot) {
  const valueTime = slot.value.includes("T")
    ? slot.value.split("T")[1]?.slice(0, 5)
    : null;

  return valueTime || slot.label.slice(-5);
}

function slotMinutes(slot: PublicSlot) {
  const [hours = "0", minutes = "0"] = slotTime(slot).split(":");
  return Number(hours) * 60 + Number(minutes);
}

function slotShift(slot: PublicSlot): Shift {
  const minutes = slotMinutes(slot);

  if (minutes < 12 * 60) return "morning";
  if (minutes < 18 * 60) return "afternoon";
  return "night";
}

function firstAvailableShift(slotsForDate: PublicSlot[]) {
  return slotShift(
    slotsForDate[0] ?? { value: "1970-01-01T08:00", label: "08:00" },
  );
}

function uniqueSlots(slots: PublicSlot[]) {
  const seen = new Set<string>();

  return slots.filter((slot) => {
    const key = slot.value;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dateButtonLabel(date: string, index: number, timezone: string) {
  const normalizedTimezone = normalizeBookingTimezone(timezone);
  const today = getDateStringInTimezone(new Date(), normalizedTimezone);
  const tomorrow = addDaysToDateString(today, 1);

  if (date === today) return "Hoje";
  if (date === tomorrow) return "Amanhã";

  const parsed = new Date(`${date}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "UTC",
  })
    .format(parsed)
    .replace(".", "");
  const dayMonth = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(parsed);

  return index < 3
    ? `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${dayMonth}`
    : dayMonth;
}

export function PublicBookingForm({
  tenantSlug,
  serviceId,
  slots,
  timezone,
  customerUser,
  visitorUser,
  redirectTo,
}: {
  tenantSlug: string;
  serviceId: string;
  slots: PublicSlot[];
  timezone: string;
  customerUser: PublicCustomerUser | null;
  visitorUser: { globalRole: string } | null;
  redirectTo: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const groupedSlots = useMemo(() => {
    const map = new Map<string, PublicSlot[]>();

    for (const slot of slots) {
      const date = slotDate(slot);
      map.set(date, [...(map.get(date) ?? []), slot]);
    }

    return Array.from(map.entries()).map(([date, dateSlots]) => ({
      date,
      slots: uniqueSlots(dateSlots).sort(
        (first, second) => slotMinutes(first) - slotMinutes(second),
      ),
    }));
  }, [slots]);

  const [selectedDateValue, setSelectedDateValue] = useState(
    groupedSlots[0]?.date ?? "",
  );
  const selectedDate =
    groupedSlots.some((group) => group.date === selectedDateValue)
      ? selectedDateValue
      : (groupedSlots[0]?.date ?? "");
  const selectedDateSlots = useMemo(
    () => groupedSlots.find((group) => group.date === selectedDate)?.slots ?? [],
    [groupedSlots, selectedDate],
  );
  const [selectedShiftValue, setSelectedShiftValue] = useState<Shift>(
    firstAvailableShift(selectedDateSlots.length ? selectedDateSlots : slots),
  );
  const selectedShift = selectedDateSlots.some(
    (slot) => slotShift(slot) === selectedShiftValue,
  )
    ? selectedShiftValue
    : firstAvailableShift(selectedDateSlots);
  const selectedShiftSlots = useMemo(
    () =>
      selectedDateSlots.filter((slot) => slotShift(slot) === selectedShift),
    [selectedDateSlots, selectedShift],
  );
  const [selectedSlotValue, setSelectedSlotValue] = useState(
    selectedShiftSlots[0]?.value ??
      selectedDateSlots[0]?.value ??
      slots[0]?.value ??
      "",
  );
  const selectedSlot =
    selectedShiftSlots.find((slot) => slot.value === selectedSlotValue) ??
    selectedShiftSlots[0] ??
    null;

  const isCustomer = customerUser && customerUser.globalRole === "CUSTOMER";
  const canContinue = Boolean(isCustomer);
  const isNonCustomer =
    !canContinue && visitorUser && visitorUser.globalRole !== "CUSTOMER";
  const reviewHref = selectedSlot
    ? `/${tenantSlug}/book/review?serviceId=${serviceId}&startsAt=${encodeURIComponent(
        selectedSlot.value,
      )}`
    : "";

  useEffect(() => {
    const authResult = searchParams.get("auth");

    if (authResult === "login" || authResult === "registered") {
      router.refresh();
    }
  }, [router, searchParams]);

  function selectDate(date: string) {
    setSelectedDateValue(date);
    const dateSlots =
      groupedSlots.find((group) => group.date === date)?.slots ?? [];
    const nextShift = firstAvailableShift(dateSlots);
    const firstSlot = dateSlots.find((slot) => slotShift(slot) === nextShift);

    setSelectedShiftValue(nextShift);
    setSelectedSlotValue(firstSlot?.value ?? "");
  }

  function selectShift(shift: Shift) {
    setSelectedShiftValue(shift);
    const firstSlot = selectedDateSlots.find((slot) => slotShift(slot) === shift);

    setSelectedSlotValue(firstSlot?.value ?? "");
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h2 className="inline-flex items-center gap-2 font-bold text-foreground">
          <CalendarDays className="size-4 text-primary" aria-hidden="true" />
          Escolha uma data
        </h2>

        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {groupedSlots.map((group, index) => (
            <button
              key={group.date}
              type="button"
              onClick={() => selectDate(group.date)}
              className={`h-9 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors ${
                selectedDate === group.date
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40"
              }`}
            >
              {dateButtonLabel(group.date, index, timezone)}
            </button>
          ))}
        </div>

        <div className="mx-auto grid max-w-[230px] grid-cols-3 rounded-lg bg-muted p-1">
          {SHIFTS.map((shift) => {
            const hasSlots = selectedDateSlots.some(
              (slot) => slotShift(slot) === shift,
            );

            return (
              <button
                key={shift}
                type="button"
                onClick={() => selectShift(shift)}
                disabled={!hasSlots}
                className={`h-9 rounded-md text-sm font-medium transition-all ${
                  selectedShift === shift
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {SHIFT_LABELS[shift]}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-foreground">Horários disponíveis</h2>
        <div
          key={`${selectedDate}-${selectedShift}`}
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {selectedShiftSlots.map((slot) => (
            <button
              key={slot.value}
              type="button"
              onClick={() => setSelectedSlotValue(slot.value)}
              className={`h-11 rounded-xl border text-sm font-bold transition-colors ${
                selectedSlot?.value === slot.value
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                  : "border-border bg-card text-foreground hover:border-primary/40"
              }`}
            >
              {slotTime(slot)}
            </button>
          ))}
        </div>
        {!selectedShiftSlots.length ? (
          <p className="text-sm text-muted-foreground">
            Nenhum horário disponível neste turno.
          </p>
        ) : null}
      </section>

      {isNonCustomer ? (
        <Alert variant="warning">
          Contas administrativas não podem confirmar agendamentos públicos. Para
          testar o fluxo de cliente final, saia e acesse como visitante ou crie
          uma conta CUSTOMER.
        </Alert>
      ) : !canContinue ? (
        <div className="rounded-2xl border bg-card px-4 py-4">
          <p className="font-bold text-foreground">
            Entre ou crie sua conta para confirmar o horário.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Você acompanha o agendamento e recebe lembretes pela sua conta.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              onClick={() => setAuthModalOpen(true)}
            >
              Entrar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => setAuthModalOpen(true)}
            >
              Criar conta
            </Button>
          </div>
        </div>
      ) : null}

      {selectedSlot ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <div className="min-w-0 text-sm">
              <p className="truncate font-semibold text-foreground">
                {dateButtonLabel(slotDate(selectedSlot), 0, timezone)} ·{" "}
                {slotTime(selectedSlot)}
              </p>
            </div>
            {canContinue ? (
              <Button asChild className="shrink-0 rounded-full px-5">
                <Link href={reviewHref}>Continuar</Link>
              </Button>
            ) : (
              <Button
                type="button"
                className="shrink-0 rounded-full px-5"
                onClick={() => setAuthModalOpen(true)}
              >
                Continuar
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {canContinue && selectedSlot ? (
        <Button asChild className="hidden rounded-full sm:inline-flex">
          <Link href={reviewHref}>Continuar</Link>
        </Button>
      ) : null}

      <PublicCustomerAuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        redirectTo={redirectTo}
      />
    </div>
  );
}
