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
};

export type WhatsAppConnectionView = {
  id: string;
  status: WhatsAppConnectionState;
  phoneNumber: string | null;
  enabled: boolean;
  sendAppointmentConfirmation: boolean;
  connectedAt: string | null;
  lastHealthyAt: string | null;
  lastErrorCode: string | null;
};
