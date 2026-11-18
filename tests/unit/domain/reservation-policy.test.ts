import { describe, expect, it } from "vitest";
import {
  ReservationPolicy,
  TimeSlot,
  type DomainResult,
  type ReservationPolicyConfig,
} from "../../../src/domain/index.js";

function unwrap<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

// Opening hours 11:00-22:00 in Helsinki (UTC+2 in December), 2-hour reservations
const config: ReservationPolicyConfig = {
  durationMinutes: 120,
  openingTime: "11:00",
  closingTime: "22:00",
  maxDaysInAdvance: 30,
  cancellationCutoffHours: 2,
  timeZone: "Europe/Helsinki",
};
const policy = unwrap(ReservationPolicy.create(config));

// "Now" in all tests: 1 December 2026, 12:00 Helsinki time
const now = new Date("2026-12-01T12:00:00+02:00");
const helsinki = (dateTime: string): Date => new Date(`${dateTime}+02:00`);

describe("ReservationPolicy.createSlot (B-4, BR-3)", () => {
  it("creates a 2-hour slot for a valid time", () => {
    const slot = unwrap(policy.createSlot(helsinki("2026-12-05T18:00:00"), now));
    expect(slot.start.toISOString()).toBe("2026-12-05T16:00:00.000Z");
    expect(slot.end.toISOString()).toBe("2026-12-05T18:00:00.000Z");
  });

  it("accepts a start exactly at opening time", () => {
    expect(policy.createSlot(helsinki("2026-12-05T11:00:00"), now).ok).toBe(true);
  });

  it("rejects a start one minute before opening time", () => {
    expect(policy.createSlot(helsinki("2026-12-05T10:59:00"), now)).toEqual({
      ok: false,
      error: "Reservation must be within opening hours",
    });
  });

  it("accepts a reservation that ends exactly at closing time", () => {
    expect(policy.createSlot(helsinki("2026-12-05T20:00:00"), now).ok).toBe(true);
  });

  it("rejects a reservation that ends one minute after closing time", () => {
    expect(policy.createSlot(helsinki("2026-12-05T20:01:00"), now).ok).toBe(false);
  });

  it("rejects a time in the past", () => {
    expect(policy.createSlot(helsinki("2026-11-30T18:00:00"), now)).toEqual({
      ok: false,
      error: "Reservation time is in the past",
    });
  });

  it("rejects a start exactly at the current time", () => {
    expect(policy.createSlot(now, now).ok).toBe(false);
  });

  it("accepts a start exactly at the end of the advance window", () => {
    expect(policy.createSlot(helsinki("2026-12-31T12:00:00"), now).ok).toBe(true);
  });

  it("rejects a start one minute after the advance window", () => {
    expect(policy.createSlot(helsinki("2026-12-31T12:01:00"), now)).toEqual({
      ok: false,
      error: "Reservations can be made at most 30 days in advance",
    });
  });
});

describe("ReservationPolicy.checkCancellation (B-4, BR-3)", () => {
  const slot = unwrap(TimeSlot.startingAt(helsinki("2026-12-01T18:00:00"), 120));

  it("allows cancelling well before the cutoff", () => {
    expect(policy.checkCancellation(slot, helsinki("2026-12-01T12:00:00")).ok).toBe(true);
  });

  it("allows cancelling one second before the cutoff", () => {
    expect(policy.checkCancellation(slot, helsinki("2026-12-01T15:59:59")).ok).toBe(true);
  });

  it("rejects cancelling exactly at the cutoff", () => {
    expect(policy.checkCancellation(slot, helsinki("2026-12-01T16:00:00"))).toEqual({
      ok: false,
      error: "Reservations can only be cancelled more than 2 hours before the start",
    });
  });

  it("rejects cancelling one second after the cutoff", () => {
    expect(policy.checkCancellation(slot, helsinki("2026-12-01T16:00:01")).ok).toBe(false);
  });
});

describe("ReservationPolicy.create (configuration check)", () => {
  it("rejects a wrong time format", () => {
    expect(ReservationPolicy.create({ ...config, openingTime: "11" }).ok).toBe(false);
  });

  it("rejects a closing time before the opening time", () => {
    expect(ReservationPolicy.create({ ...config, closingTime: "10:00" }).ok).toBe(false);
  });

  it("rejects a duration of zero minutes", () => {
    expect(ReservationPolicy.create({ ...config, durationMinutes: 0 }).ok).toBe(false);
  });

  it("rejects an unknown time zone", () => {
    expect(ReservationPolicy.create({ ...config, timeZone: "Mars/Olympus" }).ok).toBe(false);
  });
});