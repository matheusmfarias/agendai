"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const CUSTOMER_APPOINTMENTS_REFRESH_INTERVAL_MS = 15_000;

export function CustomerAppointmentsAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    function refreshAppointments() {
      router.refresh();
    }

    const interval = window.setInterval(
      refreshAppointments,
      CUSTOMER_APPOINTMENTS_REFRESH_INTERVAL_MS,
    );

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshAppointments();
      }
    }

    window.addEventListener("focus", refreshAppointments);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshAppointments);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  return null;
}
