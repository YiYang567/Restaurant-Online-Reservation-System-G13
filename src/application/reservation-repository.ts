import type { Reservation } from "../domain/reservation.js";
import type { TimeSlot } from "../domain/time-slot.js";
import type { Result } from "./result.js";

export interface ReservationRepository {
  //  err("Conflict")
  insert(reservation: Reservation): Promise<Result<void, "Conflict">>;
  getByCode(code: string): Promise<Reservation | null>;
  listByDate(date: string): Promise<Reservation[]>;
  listByTableAndRange(tableId: string, slot: TimeSlot): Promise<Reservation[]>;
  update(reservation: Reservation): Promise<void>;
}
