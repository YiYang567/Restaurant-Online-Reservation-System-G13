import { beforeEach, describe, expect, it } from "vitest";

import { MakeReservation } from "../../../src/application/use-cases/make-reservation.js";
import { err, ok, type Result } from "../../../src/application/result.js";
import type { Clock } from "../../../src/application/clock.js";
import type { NotificationPort } from "../../../src/application/notification-port.js";
import type { ReservationCodeGenerator } from "../../../src/application/reservation-code-generator.js";
import type { ReservationRepository } from "../../../src/application/reservation-repository.js";
import type { TableRepository } from "../../../src/application/table-repository.js";

import { Reservation } from "../../../src/domain/reservation.js";
import { ReservationCode } from "../../../src/domain/reservation-code.js";
import { ReservationPolicy } from "../../../src/domain/reservation-policy.js";
import type { Table } from "../../../src/domain/table.js";
import type { TimeSlot } from "../../../src/domain/time-slot.js";
import { BestFitStrategy } from "../../../src/domain/allocation/best-fit-strategy.js";

const NOW = new Date("2026-06-01T10:00:00Z");
const START = new Date("2026-06-02T18:00:00Z");

class FakeClock implements Clock {
  now(): Date {
    return NOW;
  }
}

class FakeCodeGenerator implements ReservationCodeGenerator {
  private n = 1;
  generate(): ReservationCode {
    this.n += 1;
    // ReservationCode Rules:7 letters + 1 digit = 8 characters
    return unwrap(ReservationCode.create(`ABCDEFG${this.n}`));
  }
}

class FakeNotification implements NotificationPort {
  confirmed: Reservation[] = [];
  shouldThrow = false;
  async reservationConfirmed(reservation: Reservation): Promise<void> {
    if (this.shouldThrow) throw new Error("smtp down");
    this.confirmed.push(reservation);
  }
  async reservationCancelled(_reservation: Reservation): Promise<void> {}
}

class FakeTableRepository implements TableRepository {
  constructor(private readonly items: Table[]) {}
  async listActive(): Promise<Table[]> {
    return this.items.filter((t) => t.active);
  }
  async list(): Promise<Table[]> {
    return this.items;
  }
  async add(): Promise<void> {
    throw new Error("not used");
  }
  async getById(): Promise<Table | null> {
    throw new Error("not used");
  }
  async update(): Promise<void> {
    throw new Error("not used");
  }
  async delete(): Promise<void> {
    throw new Error("not used");
  }
}

class FakeReservationRepository implements ReservationRepository {
  items: Reservation[] = [];

  conflictTableIds = new Set<string>();
  insertedTableIds: string[] = [];

  async insert(reservation: Reservation): Promise<Result<void, "Conflict">> {
    this.insertedTableIds.push(reservation.tableId);
    if (this.conflictTableIds.has(reservation.tableId)) return err("Conflict");
    this.items.push(reservation);
    return ok(undefined);
  }
  async listByTableAndRange(
    tableId: string,
    slot: TimeSlot,
  ): Promise<Reservation[]> {
    return this.items.filter(
      (r) => r.tableId === tableId && r.slot.overlaps(slot),
    );
  }
  async getByCode(): Promise<Reservation | null> {
    throw new Error("not used");
  }
  async listByDate(): Promise<Reservation[]> {
    throw new Error("not used");
  }
  async update(): Promise<void> {
    throw new Error("not used");
  }
}

//  Table is  interface
function makeTable(id: string, capacity: number, active = true): Table {
  return { id, capacity, description: "", active };
}

function unwrap<T>(result: { ok: boolean; value?: T; error?: unknown }): T {
  if (!result.ok)
    throw new Error(`unexpected failure: ${String(result.error)}`);
  return result.value as T;
}

const policy = unwrap(
  ReservationPolicy.create({
    durationMinutes: 120,
    openingTime: "11:00",
    closingTime: "22:00",
    maxDaysInAdvance: 30,
    cancellationCutoffHours: 2,
    timeZone: "UTC",
  }),
);

const validInput = {
  customerName: "Alice",
  contactEmail: "alice@example.com",
  partySize: 3,
  start: START,
};

//testing

describe("MakeReservation", () => {
  let reservations: FakeReservationRepository;
  let notifications: FakeNotification;

  function build(tables: Table[]): MakeReservation {
    return new MakeReservation(
      new FakeTableRepository(tables),
      reservations,
      new BestFitStrategy(),
      policy,
      new FakeCodeGenerator(),
      notifications,
      new FakeClock(),
    );
  }

  beforeEach(() => {
    reservations = new FakeReservationRepository();
    notifications = new FakeNotification();
  });

  it("books the smallest sufficient table (best fit, BR-1)", async () => {
    const useCase = build([
      makeTable("t2", 2),
      makeTable("t6", 6),
      makeTable("t4", 4),
    ]);

    const result = await useCase.execute(validInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tableId).toBe("t4");
    expect(result.value.status).toBe("Confirmed");
    expect(reservations.items).toHaveLength(1);
    expect(notifications.confirmed).toHaveLength(1);
  });

  it("returns NoTableAvailable when no table is large enough", async () => {
    const useCase = build([makeTable("t2", 2)]);

    const result = await useCase.execute(validInput); // 3 人

    expect(result).toEqual({ ok: false, error: { kind: "NoTableAvailable" } });
    expect(reservations.items).toHaveLength(0);
  });

  it("ignores inactive tables", async () => {
    const useCase = build([makeTable("t4", 4, false)]);

    const result = await useCase.execute(validInput);

    expect(result).toEqual({ ok: false, error: { kind: "NoTableAvailable" } });
  });

  it("returns NoTableAvailable when the only table is already booked at that time", async () => {
    const useCase = build([makeTable("t4", 4)]);
    expect((await useCase.execute(validInput)).ok).toBe(true);

    const second = await useCase.execute({
      ...validInput,
      contactEmail: "bob@example.com",
    });

    expect(second).toEqual({ ok: false, error: { kind: "NoTableAvailable" } });
    expect(reservations.items).toHaveLength(1);
  });

  it("books another table when the best-fit table is already taken", async () => {
    const useCase = build([makeTable("t4", 4), makeTable("t6", 6)]);
    await useCase.execute(validInput); // 占用 t4

    const second = await useCase.execute({
      ...validInput,
      contactEmail: "bob@example.com",
    });

    expect(second.ok).toBe(true);
    if (second.ok) expect(second.value.tableId).toBe("t6");
  });

  it("does not treat a cancelled reservation as occupying the table", async () => {
    const useCase = build([makeTable("t4", 4)]);
    const first = await useCase.execute(validInput);
    if (!first.ok) throw new Error("setup failed");
    const cancelled = unwrap(first.value.cancel());
    reservations.items = [cancelled];

    const second = await useCase.execute({
      ...validInput,
      contactEmail: "bob@example.com",
    });

    expect(second.ok).toBe(true);
  });

  it("retries the next candidate table after a Conflict (BR-2)", async () => {
    const useCase = build([makeTable("t4", 4), makeTable("t6", 6)]);
    reservations.conflictTableIds.add("t4"); //

    const result = await useCase.execute(validInput);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.tableId).toBe("t6");
    expect(reservations.insertedTableIds).toEqual(["t4", "t6"]);
  });

  it("returns NoTableAvailable when every candidate conflicts", async () => {
    const useCase = build([makeTable("t4", 4), makeTable("t6", 6)]);
    reservations.conflictTableIds.add("t4").add("t6");

    const result = await useCase.execute(validInput);

    expect(result).toEqual({ ok: false, error: { kind: "NoTableAvailable" } });
    expect(notifications.confirmed).toHaveLength(0);
  });

  describe("time rules (BR-3)", () => {
    it.each([
      ["in the past", new Date("2026-05-31T18:00:00Z")],
      ["more than 30 days ahead", new Date("2026-07-15T18:00:00Z")],
      ["before opening time", new Date("2026-06-02T09:00:00Z")],
      ["ending after closing time", new Date("2026-06-02T21:00:00Z")],
    ])("returns InvalidTime for a reservation %s", async (_label, start) => {
      const useCase = build([makeTable("t4", 4)]);

      const result = await useCase.execute({ ...validInput, start });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("InvalidTime");
    });
  });

  describe("validation", () => {
    it("returns ValidationFailed for an invalid party size", async () => {
      const useCase = build([makeTable("t4", 4)]);

      const result = await useCase.execute({ ...validInput, partySize: 0 });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("ValidationFailed");
    });

    it("returns ValidationFailed for an empty e-mail", async () => {
      const useCase = build([makeTable("t4", 4)]);

      const result = await useCase.execute({
        ...validInput,
        contactEmail: "  ",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("ValidationFailed");
    });
  });

  it("still succeeds when the notification fails", async () => {
    notifications.shouldThrow = true;
    const useCase = build([makeTable("t4", 4)]);

    const result = await useCase.execute(validInput);

    expect(result.ok).toBe(true);
    expect(reservations.items).toHaveLength(1);
  });
});
