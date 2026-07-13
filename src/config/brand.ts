export const brand = {
  name: "Agendaí",
  legalName: "Agendaí",
  shortDescription: "Sistema de agendamento online para pequenos negócios.",
  domain: "agendai.com.br",
  url: "https://agendai.com.br",
  supportEmail: "contato@agendai.com.br",
  colors: {
    primary: "#2563EB",
    primaryHover: "#1D4ED8",
    primarySoft: "#EFF6FF",
    secondary: "#38BDF8",
    navy: "#0F172A",
    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#0EA5E9",
    neutral50: "#F8FAFC",
    neutral100: "#F1F5F9",
    neutral200: "#E2E8F0",
    neutral300: "#CBD5E1",
    neutral400: "#94A3B8",
    neutral500: "#64748B",
    neutral600: "#475569",
    neutral700: "#334155",
    neutral800: "#1E293B",
    neutral900: "#0F172A",
    neutral950: "#020617",
  },
  radii: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "20px",
    full: "999px",
  },
  shadow: {
    card:
      "0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.06)",
  },
  metadata: {
    title: "Agendaí",
    titleTemplate: "%s | Agendaí",
    description: "Sistema de agendamento online para pequenos negócios.",
  },
  links: {
    home: "https://agendai.com.br",
  },
} as const;

export type Brand = typeof brand;
