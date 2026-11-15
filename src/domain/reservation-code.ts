import { failure, success, type DomainResult } from "./domain-result.js";

// The code a customer receives after booking, e.g. "K7MQ2XRA" (NFR-3(3)).
// 32-character alphabet without I, O, 0 and 1, which are easy to confuse.
export class ReservationCode {
  static readonly ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  static readonly LENGTH = 8;

  private constructor(readonly value: string) {}

  static create(value: string): DomainResult<ReservationCode> {
    const code = value.trim().toUpperCase();
    if (code.length !== ReservationCode.LENGTH) {
      return failure(`Reservation code must be ${ReservationCode.LENGTH} characters`);
    }
    for (const char of code) {
      if (!ReservationCode.ALPHABET.includes(char)) {
        return failure(`Reservation code contains an invalid character: ${char}`);
      }
    }
    return success(new ReservationCode(code));
  }

  equals(other: ReservationCode): boolean {
    return this.value === other.value;
  }
}