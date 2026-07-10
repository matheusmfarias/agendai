import { CalendarOff } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PUBLIC_BOOKING_UNAVAILABLE_MESSAGE } from "@/features/public-booking/public-booking-service";

/**
 * Public unavailable page shown when a tenant's public booking link
 * is not available (inactive tenant, subscription blocked, etc.).
 *
 * The message is intentionally generic: it does not reveal why the
 * booking channel is unavailable (no subscription status, days overdue, etc.).
 */
export function PublicUnavailablePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md text-center shadow-sm">
        <CardHeader className="place-items-center">
          <span className="mb-3 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <CalendarOff className="size-6" />
          </span>
          <CardTitle>Agendamento indisponível</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {PUBLIC_BOOKING_UNAVAILABLE_MESSAGE}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
