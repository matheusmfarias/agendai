import { prisma } from "@/lib/prisma";

/**
 * Returns the user profile for a CUSTOMER user.
 * Only exposes fields safe for the customer to see.
 */
export function getCustomerProfile(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, globalRole: "CUSTOMER", isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      avatarFileKey: true,
    },
  });
}

/**
 * Lists appointments owned by the authenticated customer account.
 *
 * Appointment.customerUserId is the sole authorization source. The related
 * Customer is an operational tenant record and must not grant portal access.
 * Ordered by startsAt descending — next appointments first.
 */
export function listCustomerAppointments(userId: string) {
  return prisma.appointment.findMany({
    where: {
      customerUserId: userId,
    },
    orderBy: { startsAt: "desc" },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          publicDisplayName: true,
          logoUrl: true,
          slug: true,
          address: true,
          city: true,
          state: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          durationMinutes: true,
          bookingMode: true,
          isActive: true,
          category: { select: { isActive: true } },
        },
      },
      review: { select: { id: true, rating: true, comment: true, createdAt: true } },
    },
  });
}

/**
 * Returns a single appointment owned by the customer, with full detail safe for display.
 * Ownership comes only from Appointment.customerUserId.
 * Excludes internalNotes, appointment events, and administrative metadata.
 */
export function getCustomerAppointment(userId: string, appointmentId: string) {
  return prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      customerUserId: userId,
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          publicDisplayName: true,
          logoUrl: true,
          slug: true,
          address: true,
          city: true,
          state: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          durationMinutes: true,
          priceType: true,
          priceValue: true,
          bookingMode: true,
          isActive: true,
          category: { select: { name: true, isActive: true } },
        },
      },
      customValues: {
        include: { customField: { select: { label: true } } },
        orderBy: { createdAt: "asc" },
      },
      review: { select: { id: true, rating: true, comment: true, createdAt: true } },
    },
  });
}

/**
 * Checks if a review already exists for the given appointment.
 */
export function findReviewByAppointment(appointmentId: string) {
  return prisma.appointmentReview.findUnique({
    where: { appointmentId },
  });
}

/**
 * Creates a review for a finished appointment.
 */
export function createAppointmentReview(data: {
  tenantId: string;
  appointmentId: string;
  customerUserId: string;
  rating: number;
  comment?: string;
}) {
  return prisma.appointmentReview.create({
    data: {
      tenantId: data.tenantId,
      appointmentId: data.appointmentId,
      customerUserId: data.customerUserId,
      rating: data.rating,
      comment: data.comment ?? null,
    },
  });
}

/**
 * Updates the customer profile (name, phone) on the User record.
 */
export function updateCustomerProfile(
  userId: string,
  data: { name: string; phone: string },
) {
  return prisma.user.update({
    where: { id: userId },
    data: { name: data.name, phone: data.phone },
  });
}

/**
 * Updates the avatar fields on the User record.
 */
export function updateCustomerAvatar(
  userId: string,
  data: { avatarUrl: string; avatarFileKey: string },
) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: data.avatarUrl, avatarFileKey: data.avatarFileKey },
  });
}
