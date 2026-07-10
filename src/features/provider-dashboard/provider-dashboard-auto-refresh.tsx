"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const DASHBOARD_REFRESH_INTERVAL_MS = 30_000;

export function ProviderDashboardAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    function refreshDashboard() {
      router.refresh();
    }

    const interval = window.setInterval(
      refreshDashboard,
      DASHBOARD_REFRESH_INTERVAL_MS,
    );

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshDashboard();
      }
    }

    window.addEventListener("focus", refreshDashboard);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshDashboard);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  return null;
}
