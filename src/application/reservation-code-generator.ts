import type { ReservationCode } from "../domain/reservation-code.js";

export interface ReservationCodeGenerator {
  generate(): ReservationCode;
}
