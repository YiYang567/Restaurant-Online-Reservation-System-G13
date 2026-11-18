// A restaurant table (FR-5, BR-1)
export interface Table {
  readonly id: string; // unique id of the table
  readonly capacity: number; // maximum number of seats
  readonly description: string; // e.g. "Window table"
  readonly active: boolean; // false = table is closed, not used for new bookings
}