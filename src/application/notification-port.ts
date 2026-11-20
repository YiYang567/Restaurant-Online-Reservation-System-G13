import type { Reservation } from "../domain/reservation.js";

export interface NotificationPort {
  reservationConfirmed(reservation: Reservation): Promise<void>;
  reservationCancelled(reservation: Reservation): Promise<void>;
}
