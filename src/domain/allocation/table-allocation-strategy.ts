import type { PartySize } from "../party-size.js";
import type { Table } from "../table.js";

// How to choose a table for a party (B-3).
// Different strategies can be plugged in without changing the use case (NFR-3).
export interface TableAllocationStrategy {
  // Returns the suitable tables, best choice first.
  // Only tables that are active, large enough and not occupied are returned.
  rankCandidates(
    tables: readonly Table[],
    partySize: PartySize,
    occupiedTableIds: ReadonlySet<string>,
  ): Table[];
}