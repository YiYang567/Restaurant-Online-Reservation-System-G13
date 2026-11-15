import { failure, success, type DomainResult } from "./domain-result.js";

// The time period of a reservation: from start to end
export class TimeSlot {
  private constructor(
    readonly start: Date,
    readonly end: Date,
  ) {}

  static create(start: Date, end: Date): DomainResult<TimeSlot> {
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return failure("Invalid date");
    }
    if (end.getTime() <= start.getTime()) {
      return failure("End time must be after start time");
    }
    return success(new TimeSlot(new Date(start), new Date(end)));
  }

  // Build a slot from a start time + a fixed duration in minutes (BR-3)
  static startingAt(start: Date, durationMinutes: number): DomainResult<TimeSlot> {
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      return failure("Duration must be a positive whole number of minutes");
    }
    return TimeSlot.create(start, new Date(start.getTime() + durationMinutes * 60_000));
  }

  // Do two slots overlap? Used for BR-2 (no double booking).
  // 18:00-20:00 and 20:00-22:00 do NOT overlap.
  overlaps(other: TimeSlot): boolean {
    return this.start.getTime() < other.end.getTime() && other.start.getTime() < this.end.getTime();
  }
}