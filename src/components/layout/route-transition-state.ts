"use client";

import { useSyncExternalStore } from "react";

type RouteTransitionState = {
  pending: boolean;
  href: string | null;
};

const listeners = new Set<() => void>();
const SERVER_ROUTE_TRANSITION_STATE: RouteTransitionState = {
  pending: false,
  href: null,
};
let state: RouteTransitionState = { pending: false, href: null };
let timeoutId: ReturnType<typeof setTimeout> | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

function setRouteTransitionState(nextState: RouteTransitionState) {
  state = nextState;
  emit();
}

export function startRouteTransition(href: string) {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  setRouteTransitionState({ pending: true, href });
  timeoutId = setTimeout(() => {
    finishRouteTransition();
  }, 8000);
}

export function finishRouteTransition() {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  if (!state.pending && !state.href) return;
  setRouteTransitionState({ pending: false, href: null });
}

export function useRouteTransitionState() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => SERVER_ROUTE_TRANSITION_STATE,
  );
}
