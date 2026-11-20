import type { Table } from "../domain/table.js";

export interface TableRepository {
  add(table: Table): Promise<void>;
  getById(id: string): Promise<Table | null>;
  list(): Promise<Table[]>;
  listActive(): Promise<Table[]>;
  update(table: Table): Promise<void>;
  delete(id: string): Promise<void>;
}
