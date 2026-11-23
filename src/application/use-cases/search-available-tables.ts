import { ok, err, type Result } from "../result.js";
import type { AppError } from "../errors.js";
import type { TableRepository } from "../table-repository.js";
import type { ReservationRepository } from "../reservation-repository.js";
import type { Clock } from "../clock.js";
import type { Table } from "../../domain/table.js";
import { PartySize } from "../../domain/party-size.js";
import type { ReservationPolicy } from "../../domain/reservation-policy.js";
import type { TableAllocationStrategy } from "../../domain/allocation/table-allocation-strategy.js";

export interface SearchAvailableTablesInput {
  readonly partySize: number;
  readonly startAt: Date;
}

export class SearchAvailableTables {
  constructor(
    private readonly tables: TableRepository,
    private readonly reservations: ReservationRepository,
    private readonly clock: Clock,
    private readonly policy: ReservationPolicy,
    private readonly strategy: TableAllocationStrategy,
  ) {}

  async execute(
    input: SearchAvailableTablesInput,
  ): Promise<Result<Table[], AppError>> {
    // Domain 的 DomainResult -> Application 的 AppError（转换在用例里完成）
    const party = PartySize.create(input.partySize);
    if (!party.ok) {
      return err({ kind: "ValidationFailed", details: [party.error] });
    }

    const slot = this.policy.createSlot(input.startAt, this.clock.now());
    if (!slot.ok) {
      return err({ kind: "InvalidTime", reason: slot.error });
    }

    const activeTables = await this.tables.listActive();

    const occupied = new Set<string>();
    for (const table of activeTables) {
      const existing = await this.reservations.listByTableAndRange(
        table.id,
        slot.value,
      );
      if (existing.some((r) => r.status === "Confirmed")) {
        occupied.add(table.id);
      }
    }

    return ok(
      this.strategy.rankCandidates(activeTables, party.value, occupied),
    );
  }
}
