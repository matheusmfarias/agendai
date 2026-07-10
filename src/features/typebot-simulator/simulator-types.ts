import type {
  TypebotBusinessData,
  TypebotCustomField,
  TypebotServiceDetail,
  TypebotServiceItem,
  TypebotSlotItem,
} from "@/features/typebot/typebot-service";

export type SimulatorStep =
  | "tenant"
  | "customer"
  | "services"
  | "service-detail"
  | "slots"
  | "custom-fields"
  | "confirm"
  | "result";

export type StepLog = {
  step: string;
  status: "ok" | "error";
  request: string;
  response: string;
  timestamp: string;
};

export type SimulatorState = {
  /** Current step in the flow */
  step: SimulatorStep;

  // ---- Tenant ----
  tenantSlug: string;
  tenantId: string;
  tenantName: string;
  tenantAvailable: boolean;
  tenantUnavailableReason: string;

  // ---- Business ----
  business: TypebotBusinessData | null;

  // ---- Customer ----
  customerPhone: string;
  customerName: string;
  customerEmail: string;
  customerId: string;
  sessionId: string;

  // ---- Services ----
  services: TypebotServiceItem[];
  selectedServiceId: string;
  selectedServiceName: string;

  // ---- Service Detail ----
  serviceDetail: TypebotServiceDetail | null;
  customFields: TypebotCustomField[];

  // ---- Slots ----
  slots: TypebotSlotItem[];
  selectedSlotStartsAt: string;
  selectedSlotLabel: string;

  // ---- Custom Fields values ----
  customFieldValues: Record<string, string>;

  // ---- Result ----
  appointmentId: string;
  appointmentStatus: string;
  appointmentMessage: string;
  appointmentStartsAt: string;
  appointmentEndsAt: string;

  // ---- Misc ----
  error: { code: string; message: string } | null;
  logs: StepLog[];

  // ---- Customer Notes ----
  customerNotes: string;
};

export const INITIAL_STATE: SimulatorState = {
  step: "tenant",
  tenantSlug: "",
  tenantId: "",
  tenantName: "",
  tenantAvailable: false,
  tenantUnavailableReason: "",
  business: null,
  customerPhone: "",
  customerName: "",
  customerEmail: "",
  customerId: "",
  sessionId: "",
  services: [],
  selectedServiceId: "",
  selectedServiceName: "",
  serviceDetail: null,
  customFields: [],
  slots: [],
  selectedSlotStartsAt: "",
  selectedSlotLabel: "",
  customFieldValues: {},
  appointmentId: "",
  appointmentStatus: "",
  appointmentMessage: "",
  appointmentStartsAt: "",
  appointmentEndsAt: "",
  error: null,
  logs: [],
  customerNotes: "Simulação via painel admin",
};
