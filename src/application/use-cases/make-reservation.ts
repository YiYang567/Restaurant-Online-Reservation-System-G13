import type { AppError } from "../errors.js";
import { err, ok, type Result } from "../result.js";
import type { Clock } from "../clock.js";
import type { NotificationPort } from "../notification-port.js";
import type { ReservationCodeGenerator } from "../reservation-code-generator.js";
import type { ReservationRepository } from "../reservation-repository.js";
import type { TableRepository } from "../table-repository.js";

import { PartySize } from "../../domain/party-size.js";
import { Reservation } from "../../domain/reservation.js";
import type { ReservationPolicy } from "../../domain/reservation-policy.js";
import type { TableAllocationStrategy } from "../../domain/allocation/table-allocation-strategy.js";

export interface MakeReservationInput {
  readonly customerName: string;
  readonly contactEmail: string;
  readonly partySize: number;
  readonly start: Date;
}

export class MakeReservation {
  constructor(
    private readonly tables: TableRepository,
    private readonly reservations: ReservationRepository,
    private readonly strategy: TableAllocationStrategy, // BR-1，（NFR-2）
    private readonly policy: ReservationPolicy, // BR-3
    private readonly codes: ReservationCodeGenerator,
    private readonly notifications: NotificationPort,
    private readonly clock: Clock,
  ) {}

  async execute(
    input: MakeReservationInput,
  ): Promise<Result<Reservation, AppError>> {
    // 1. Input Validation
    const details: string[] = [];
    if (input.customerName.trim() === "")
      details.push("customerName is required");
    if (input.contactEmail.trim() === "")
      details.push("contactEmail is required");

    const party = PartySize.create(input.partySize);
    if (!party.ok) details.push(party.error);

    if (details.length > 0 || !party.ok) {
      return err({ kind: "ValidationFailed", details });
    }

    // 2. BR-3：Operating hours, advance booking window, fixed duration
    const slotResult = this.policy.createSlot(input.start, this.clock.now());
    if (!slotResult.ok) {
      return err({ kind: "InvalidTime", reason: slotResult.error });
    }
    const slot = slotResult.value;

    // 3. Identify the tables that are already occupied during this time slot
    const activeTables = await this.tables.listActive();
    const occupied = new Set<string>();
    for (const table of activeTables) {
      const existing = await this.reservations.listByTableAndRange(
        table.id,
        slot,
      );
      if (existing.some((r) => r.isActive() && r.slot.overlaps(slot))) {
        occupied.add(table.id);
      }
    }

    // 4. BR-1：The allocation strategy returns a sorted list of candidate tables.
    const candidates = this.strategy.rankCandidates(
      activeTables,
      party.value,
      occupied,
    );

    // 5. BR-2：Attempt an `insert` operation; if the database reports a conflict
    // (indicating a race condition for the table), move on to the next table.
    for (const table of candidates) {
      const reservation = new Reservation({
        code: this.codes.generate(),
        contactEmail: input.contactEmail,
        customerName: input.customerName,
        partySize: party.value,
        tableId: table.id,
        slot,
        status: "Confirmed",
      });

      const inserted = await this.reservations.insert(reservation);
      if (inserted.ok) {
        await this.notifySafely(reservation);
        return ok(reservation);
      }
      // inserted.error === "Conflict" -> Proceed to the next candidate table
    }

    // 6.
    return err({ kind: "NoTableAvailable" });
  }

  private async notifySafely(reservation: Reservation): Promise<void> {
    try {
      await this.notifications.reservationConfirmed(reservation);
    } catch (e) {
      console.error("notification failed", e);
    }
  }
}
