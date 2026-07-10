/**
 * Visual step indicator for the booking flow.
 *
 * Shows the 3 main phases: Serviço → Horário → Dados.
 * Does not control routing; it is purely presentational.
 *
 * Uses Inter (font-sans) for step labels, not Lora.
 */

type BookingStep = "service" | "time" | "data";

const STEPS: { key: BookingStep; label: string }[] = [
  { key: "service", label: "Serviço" },
  { key: "time", label: "Horário" },
  { key: "data", label: "Dados" },
];

interface BookingStepperProps {
  current: BookingStep;
}

export function BookingStepper({ current }: BookingStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <nav aria-label="Etapas do agendamento" className="flex items-center gap-3">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={
                  "flex size-7 items-center justify-center rounded-full text-xs font-semibold" +
                  (isCompleted
                    ? " bg-success/15 text-success"
                    : isCurrent
                      ? " bg-primary text-primary-foreground"
                      : " bg-muted text-muted-foreground")
                }
              >
                {isCompleted ? (
                  <svg
                    className="size-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={
                  "text-sm font-medium" +
                  (isCurrent
                    ? " text-foreground"
                    : isCompleted
                      ? " text-success"
                      : " text-muted-foreground")
                }
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 ? (
              <span
                className={
                  "hidden w-8 border-t sm:block" +
                  (isCompleted
                    ? " border-success/30"
                    : isPending
                      ? " border-border"
                      : " border-primary/20")
                }
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
