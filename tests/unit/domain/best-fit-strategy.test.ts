import { describe, expect, it } from "vitest";
import { BestFitStrategy, PartySize, type Table } from "../../../src/domain/index.js";

function table(id: string, capacity: number, active = true): Table {
  return { id, capacity, description: "", active };
}

function party(size: number): PartySize {
  const result = PartySize.create(size);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

const strategy = new BestFitStrategy();
const ids = (tables: Table[]): string[] => tables.map((t) => t.id);

describe("BestFitStrategy (B-3, BR-1)", () => {
  it("puts the smallest table that is large enough first", () => {
    const tables = [table("T6", 6), table("T2", 2), table("T4", 4)];
    expect(ids(strategy.rankCandidates(tables, party(3), new Set()))).toEqual(["T4", "T6"]);
  });

  it("accepts a table whose capacity equals the party size", () => {
    const tables = [table("T4", 4), table("T6", 6)];
    expect(ids(strategy.rankCandidates(tables, party(4), new Set()))).toEqual(["T4", "T6"]);
  });

  it("skips inactive tables", () => {
    const tables = [table("T4", 4, false), table("T6", 6)];
    expect(ids(strategy.rankCandidates(tables, party(3), new Set()))).toEqual(["T6"]);
  });

  it("skips tables that are already occupied", () => {
    const tables = [table("T4", 4), table("T6", 6)];
    expect(ids(strategy.rankCandidates(tables, party(3), new Set(["T4"])))).toEqual(["T6"]);
  });

  it("returns an empty list when no table is large enough", () => {
    const tables = [table("T2", 2), table("T4", 4)];
    expect(ids(strategy.rankCandidates(tables, party(8), new Set()))).toEqual([]);
  });

  it("orders tables with the same capacity by id, so the result is always the same", () => {
    const tables = [table("B", 4), table("A", 4), table("C", 4)];
    expect(ids(strategy.rankCandidates(tables, party(2), new Set()))).toEqual(["A", "B", "C"]);
  });

  it("does not change the original list", () => {
    const tables = [table("T6", 6), table("T4", 4)];
    strategy.rankCandidates(tables, party(2), new Set());
    expect(ids(tables)).toEqual(["T6", "T4"]);
  });
});