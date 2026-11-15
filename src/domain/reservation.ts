import type { PartySize } from "./party-size.js";
import type { ReservationCode } from "./reservation-code.js";
import type { ReservationStatus } from "./reservation-status.js";
import type { TimeSlot } from "./time-slot.js";

// All the information of one reservation
export interface ReservationProps {
  readonly code: ReservationCode;
  readonly contactEmail: string;
  readonly customerName: string;
  readonly partySize: PartySize;
  readonly tableId: string;
  readonly slot: TimeSlot;
  readonly status: ReservationStatus;
}

// One reservation. Status changes (cancel, complete, markNoShow) are added in B-2.
export class Reservation {
  readonly code: ReservationCode;
  readonly contactEmail: string;
  readonly customerName: string;
  readonly partySize: PartySize;
  readonly tableId: string;
  readonly slot: TimeSlot;
  readonly status: ReservationStatus;

  constructor(props: ReservationProps) {
    this.code = props.code;
    this.contactEmail = props.contactEmail;
    this.customerName = props.customerName;
    this.partySize = props.partySize;
    this.tableId = props.tableId;
    this.slot = props.slot;
    this.status = props.status;
  }
}