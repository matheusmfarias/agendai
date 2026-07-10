export const NAVIGATION_ICON_NAMES = [
  "layout-dashboard",
  "building-2",
  "shapes",
  "credit-card",
  "scroll-text",
  "calendar-days",
  "users-round",
  "file-clock",
  "settings",
  "shopping-bag",
  "clock-3",
  "receipt-text",
  "circle-dollar-sign",
  "bot",
] as const;

export type NavigationIconName = (typeof NAVIGATION_ICON_NAMES)[number];

export type NavigationItem = {
  label: string;
  href: string;
  icon: NavigationIconName;
  children?: NavigationItem[];
};
