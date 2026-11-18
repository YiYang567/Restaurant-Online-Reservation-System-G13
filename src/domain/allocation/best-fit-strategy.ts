import type { PartySize } from "../party-size.js";
import type { Table } from "../table.js";
import type { TableAllocationStrategy } from "./table-allocation-strategy.js";

// BR-1: choose the table with the smallest capacity that is still large enough.
// Example: party of 3, free tables with 2, 4 and 6 seats -> 4 first, then 6.
export class BestFitStrategy implements TableAllocationStrategy {
  rankCandidates(
    tables: readonly Table[],
    partySize: PartySize,
    occupiedTableIds: ReadonlySet<string>,
  ): Table[] {
    return tables
      .filter((table) => table.active)
      .filter((table) => table.capacity >= partySize.value)
      .filter((table) => !occupiedTableIds.has(table.id))
      .sort((a, b) => a.capacity - b.capacity || a.id.localeCompare(b.id));
  }
}