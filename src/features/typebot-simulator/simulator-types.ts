import type {
  TypebotBusinessData,
  TypebotAvailableDateItem,
  TypebotAvailablePeriodItem,
  TypebotAvailabilityPeriod,
  TypebotCategoryItem,
  TypebotCustomField,
  TypebotServiceDetail,
  TypebotServiceItem,
  TypebotSlotItem,
} from "@/features/typebot/typebot-service";

export type SimulatorStep =
  | "tenant"
  | "intent"
  | "categories"
  | "handoff"
  | "customer"
  | "services"
  | "service-detail"
  | "dates"
  | "periods"
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

export type SimulatorCustomValue = {
  customFieldId: string;
  value: string;
};

export function buildSimulatorCustomValues(
  fields: Pick<TypebotCustomField, "id">[],
  values: Record<string, string>,
): SimulatorCustomValue[] {
  return fields.flatMap((field) => {
    const value = values[field.id]?.trim() ?? "";
    return value ? [{ customFieldId: field.id, value }] : [];
  });
}

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

  // ---- Intent and category ----
  categories: TypebotCategoryItem[];
  selectedCategoryId: string;
  selectedCategoryName: string;

  // ---- Customer ----
  customerPhone: string;
  customerName: string;
  customerEmail: string;
  customerId: string;
  sessionId: string;
  customerLookupStatus: "" | "FOUND" | "NOT_FOUND" | "AMBIGUOUS";
  matchedCustomerName: string;

  // ---- Services ----
  services: TypebotServiceItem[];
  selectedServiceId: string;
  selectedServiceName: string;

  // ---- Service Detail ----
  serviceDetail: TypebotServiceDetail | null;
  customFields: TypebotCustomField[];
  customFieldIndex: number;

  // ---- Available dates ----
  availableDates: TypebotAvailableDateItem[];
  selectedDate: string;
  nextStartDate: string;

  // ---- Available periods ----
  periods: TypebotAvailablePeriodItem[];
  selectedPeriod: TypebotAvailabilityPeriod | "";

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
  categories: [],
  selectedCategoryId: "",
  selectedCategoryName: "",
  customerPhone: "",
  customerName: "",
  customerEmail: "",
  customerId: "",
  sessionId: "",
  customerLookupStatus: "",
  matchedCustomerName: "",
  services: [],
  selectedServiceId: "",
  selectedServiceName: "",
  serviceDetail: null,
  customFields: [],
  customFieldIndex: 0,
  availableDates: [],
  selectedDate: "",
  nextStartDate: "",
  periods: [],
  selectedPeriod: "",
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
