import { describe, expect, it } from "vitest";
import {
  PartySize,
  Reservation,
  ReservationCode,
  TimeSlot,
  type DomainResult,
  type ReservationStatus,
} from "../../../src/domain/index.js";

// Helper: unwrap a successful result, fail the test otherwise
function unwrap<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function makeReservation(status: ReservationStatus = "Confirmed"): Reservation {
  return new Reservation({
    code: unwrap(ReservationCode.create("K7MQ2XRA")),
    contactEmail: "anna@example.com",
    customerName: "Anna",
    partySize: unwrap(PartySize.create(4)),
    tableId: "table-1",
    slot: unwrap(TimeSlot.startingAt(new Date("2026-12-01T18:00:00Z"), 120)),
    status,
  });
}

describe("Reservation status changes (B-2)", () => {
  it("a Confirmed reservation can be cancelled", () => {
    const result = makeReservation().cancel();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe("Cancelled");
  });

  it("a Confirmed reservation can be completed", () => {
    const result = makeReservation().complete();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe("Completed");
  });

  it("a Confirmed reservation can be marked as no-show", () => {
    const result = makeReservation().markNoShow();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe("NoShow");
  });

  it("changing the status returns a new object and keeps the original unchanged", () => {
    const original = makeReservation();
    const result = original.cancel();
    expect(original.status).toBe("Confirmed");
    if (result.ok) {
      expect(result.value).not.toBe(original);
      expect(result.value.code.value).toBe("K7MQ2XRA");
      expect(result.value.customerName).toBe("Anna");
    }
  });

  const finalStatuses: ReservationStatus[] = ["Cancelled", "Completed", "NoShow"];
  for (const status of finalStatuses) {
    it(`a ${status} reservation cannot change any more`, () => {
      const reservation = makeReservation(status);
      expect(reservation.cancel().ok).toBe(false);
      expect(reservation.complete().ok).toBe(false);
      expect(reservation.markNoShow().ok).toBe(false);
    });
  }

  it("an illegal change returns a clear error message", () => {
    const result = makeReservation("Completed").cancel();
    expect(result).toEqual({ ok: false, error: "Cannot change status from Completed to Cancelled" });
  });

  it("only a Confirmed reservation occupies a table", () => {
    expect(makeReservation("Confirmed").isActive()).toBe(true);
    expect(makeReservation("Cancelled").isActive()).toBe(false);
    expect(makeReservation("Completed").isActive()).toBe(false);
    expect(makeReservation("NoShow").isActive()).toBe(false);
  });
});