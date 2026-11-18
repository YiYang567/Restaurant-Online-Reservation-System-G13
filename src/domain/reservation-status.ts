// The possible states of a reservation
export const RESERVATION_STATUSES = ["Confirmed", "Cancelled", "Completed", "NoShow"] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

// Allowed status changes (B-2):
// Confirmed -> Cancelled | Completed | NoShow
// Cancelled, Completed and NoShow are final: no further changes.
const ALLOWED_TRANSITIONS: Readonly<Record<ReservationStatus, readonly ReservationStatus[]>> = {
  Confirmed: ["Cancelled", "Completed", "NoShow"],
  Cancelled: [],
  Completed: [],
  NoShow: [],
};

export function canTransition(from: ReservationStatus, to: ReservationStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}