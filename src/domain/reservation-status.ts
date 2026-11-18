// The possible states of a reservation
export const RESERVATION_STATUSES = ["Confirmed", "Cancelled", "Completed", "NoShow"] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];