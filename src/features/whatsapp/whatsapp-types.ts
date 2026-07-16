export type WhatsAppConnectionState =
  | "DISCONNECTED"
  | "CONNECTING"
  | "AWAITING_QR"
  | "CONNECTED"
  | "DEGRADED"
  | "ERROR";

export type AppointmentConfirmedPayload = {
  businessName: string;
  customerName: string;
  serviceName: string;
  professionalName?: string;
  bookingDate: string;
  bookingTime: string;
  businessAddress?: string;
  appointmentId: string;
  messageTemplate?: string;
};

export type AppointmentReminderPayload = AppointmentConfirmedPayload & {
  messageTemplate: string;
};
export type AppointmentCanceledPayload = AppointmentConfirmedPayload & {
  messageTemplate: string;
};

export type AppointmentRequestedPayload = {
  businessName: string;
  customerName: string;
  serviceName: string;
  professionalName?: string;
  bookingDate: string;
  bookingTime: string;
  appointmentId: string;
};

export type AppointmentCompletedPayload = AppointmentRequestedPayload;

export type WhatsAppConnectionView = {
  id: string;
  status: WhatsAppConnectionState;
  phoneNumber: string | null;
  enabled: boolean;
  sendAppointmentConfirmation: boolean;
  sendAppointmentRequested: boolean;
  sendAppointmentCompleted: boolean;
  connectedAt: string | null;
  lastHealthyAt: string | null;
  lastErrorCode: string | null;
};
