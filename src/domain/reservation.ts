import { failure, success, type DomainResult } from "./domain-result.js";
import type { PartySize } from "./party-size.js";
import type { ReservationCode } from "./reservation-code.js";
import { canTransition, type ReservationStatus } from "./reservation-status.js";
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

// One reservation.
// It is immutable: changing the status returns a NEW Reservation.
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

  // Customer cancels (FR-4). The cancellation cutoff (BR-3) is checked by the use case.
  cancel(): DomainResult<Reservation> {
    return this.transitionTo("Cancelled");
  }

  // Staff marks the reservation as completed (FR-7)
  complete(): DomainResult<Reservation> {
    return this.transitionTo("Completed");
  }

  // Staff marks the customer as a no-show (FR-8)
  markNoShow(): DomainResult<Reservation> {
    return this.transitionTo("NoShow");
  }

  // Only Confirmed reservations occupy a table (BR-2)
  isActive(): boolean {
    return this.status === "Confirmed";
  }

  private transitionTo(next: ReservationStatus): DomainResult<Reservation> {
    if (!canTransition(this.status, next)) {
      return failure(`Cannot change status from ${this.status} to ${next}`);
    }
    return success(new Reservation({ ...this, status: next }));
  }
}