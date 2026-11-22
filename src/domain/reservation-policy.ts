import { failure, success, type DomainResult } from "./domain-result.js";
import { TimeSlot } from "./time-slot.js";

// The fixed booking rules from the configuration (BR-3).
// The Infrastructure layer reads them from environment variables and passes them in.
export interface ReservationPolicyConfig {
  readonly durationMinutes: number; // e.g. 120
  readonly openingTime: string; // "HH:MM", e.g. "11:00"
  readonly closingTime: string; // "HH:MM", e.g. "22:00"
  readonly maxDaysInAdvance: number; // e.g. 30
  readonly cancellationCutoffHours: number; // e.g. 2
  readonly timeZone: string; // e.g. "Europe/Helsinki"
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// BR-3: reservation timing rules.
// "Now" is always passed in as a parameter, so the rules are easy to test.
export class ReservationPolicy {
  private constructor(
    readonly durationMinutes: number,
    private readonly openingMinute: number,
    private readonly closingMinute: number,
    readonly maxDaysInAdvance: number,
    readonly cancellationCutoffHours: number,
    private readonly localTime: Intl.DateTimeFormat,
  ) {}

  static create(config: ReservationPolicyConfig): DomainResult<ReservationPolicy> {
    const opening = parseTime(config.openingTime);
    const closing = parseTime(config.closingTime);
    if (opening === null || closing === null) {
      return failure("Opening and closing time must be in HH:MM format");
    }
    if (closing <= opening) {
      return failure("Closing time must be after opening time");
    }
    if (!isPositiveInteger(config.durationMinutes)) {
      return failure("Reservation duration must be a positive whole number of minutes");
    }
    if (!isPositiveInteger(config.maxDaysInAdvance)) {
      return failure("Advance booking window must be a positive whole number of days");
    }
    if (!Number.isFinite(config.cancellationCutoffHours) || config.cancellationCutoffHours < 0) {
      return failure("Cancellation cutoff must be zero or more hours");
    }
    let localTime: Intl.DateTimeFormat;
    try {
      localTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: config.timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      });
    } catch {
      return failure(`Unknown time zone: ${config.timeZone}`);
    }
    return success(
      new ReservationPolicy(
        config.durationMinutes,
        opening,
        closing,
        config.maxDaysInAdvance,
        config.cancellationCutoffHours,
        localTime,
      ),
    );
  }

  // Checks a requested start time and returns the reservation slot (FR-2).
  createSlot(start: Date, now: Date): DomainResult<TimeSlot> {
    if (Number.isNaN(start.getTime())) {
      return failure("Invalid start time");
    }
    if (start.getTime() <= now.getTime()) {
      return failure("Reservation time is in the past");
    }
    if (start.getTime() - now.getTime() > this.maxDaysInAdvance * DAY) {
      return failure(`Reservations can be made at most ${this.maxDaysInAdvance} days in advance`);
    }
    const slot = TimeSlot.startingAt(start, this.durationMinutes);
    if (!slot.ok) {
      return slot;
    }
    const startLocal = this.toLocal(slot.value.start);
    const endLocal = this.toLocal(slot.value.end);
    const sameDay = startLocal.date === endLocal.date;
    if (
      !sameDay ||
      startLocal.minute < this.openingMinute ||
      endLocal.minute > this.closingMinute
    ) {
      return failure("Reservation must be within opening hours");
    }
    return slot;
  }

  // A reservation can be cancelled only MORE than N hours before it starts (FR-4).
  checkCancellation(slot: TimeSlot, now: Date): DomainResult<true> {
    const timeLeft = slot.start.getTime() - now.getTime();
    if (timeLeft <= this.cancellationCutoffHours * HOUR) {
      return failure(
        `Reservations can only be cancelled more than ${this.cancellationCutoffHours} hours before the start`,
      );
    }
    return success(true);
  }

  // Date and minute-of-day in the restaurant's time zone
  private toLocal(date: Date): { date: string; minute: number } {
    const parts = this.localTime.formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes): string =>
      parts.find((part) => part.type === type)?.value ?? "";
    return {
      date: `${get("year")}-${get("month")}-${get("day")}`,
      minute: Number(get("hour")) * 60 + Number(get("minute")),
    };
  }
}

// "11:30" -> 690 (minutes after midnight), or null if the format is wrong
function parseTime(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}