/**
 * Segment Template types.
 *
 * Templates are versioned in code (not database). They define a starter set of
 * categories, services, custom fields, and optional availability rules for a
 * specific business segment.
 */

import type {
  BookingMode,
  CustomFieldType,
  PriceType,
} from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Template key
// ---------------------------------------------------------------------------

export type SegmentTemplateKey =
  | "mechanic"
  | "barbershop"
  | "manicure"
  | "beauty"
  | "technical_assistance"
  | "clinic_simple";

// ---------------------------------------------------------------------------
// Template definition
// ---------------------------------------------------------------------------

export type SegmentTemplateCategory = {
  name: string;
  description?: string;
  order: number;
  services: SegmentTemplateService[];
};

export type SegmentTemplateService = {
  name: string;
  description?: string;
  durationMinutes: number;
  priceType: PriceType;
  priceValue?: number | null;
  bookingMode: BookingMode;
  requiresManualConfirmation?: boolean;
  internalNotes?: string;
  order: number;
  customFields?: SegmentTemplateCustomField[];
};

export type SegmentTemplateCustomField = {
  label: string;
  key: string;
  fieldType: CustomFieldType;
  isRequired: boolean;
  options?: string[];
  order: number;
};

export type SegmentTemplateAvailabilityRule = {
  weekday: number; // 0=Sunday, 1=Monday, …, 6=Saturday
  startTime: string; // "HH:mm"
  endTime: string;
  slotIntervalMinutes: number;
};

export type SegmentTemplateDefinition = {
  key: SegmentTemplateKey;
  name: string;
  description: string;
  segment: string;
  categories: SegmentTemplateCategory[];
  availability?: SegmentTemplateAvailabilityRule[];
};

// ---------------------------------------------------------------------------
// Application result
// ---------------------------------------------------------------------------

export type SegmentTemplateApplicationResult = {
  ok: boolean;
  error?: string;
  created: {
    categories: number;
    services: number;
    customFields: number;
    availabilityRules: number;
  };
  skipped: {
    categories: number;
    services: number;
    customFields: number;
    availabilityRules: number;
  };
};

// ---------------------------------------------------------------------------
// Preview (what would be created)
// ---------------------------------------------------------------------------

export type SegmentTemplatePreview = {
  template: SegmentTemplateDefinition;
  categories: {
    name: string;
    exists: boolean;
    services: {
      name: string;
      exists: boolean;
      customFields: {
        label: string;
        key: string;
        exists: boolean;
      }[];
    }[];
  }[];
  availabilityRules: {
    weekday: number;
    startTime: string;
    endTime: string;
    exists: boolean;
  }[];
};
