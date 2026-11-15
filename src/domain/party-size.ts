import { failure, success, type DomainResult } from "./domain-result.js";

// Number of people in one reservation
export class PartySize {
  static readonly MIN = 1;
  static readonly MAX = 20;

  private constructor(readonly value: number) {}

  static create(value: number): DomainResult<PartySize> {
    if (!Number.isInteger(value)) {
      return failure("Party size must be a whole number");
    }
    if (value < PartySize.MIN || value > PartySize.MAX) {
      return failure(`Party size must be between ${PartySize.MIN} and ${PartySize.MAX}`);
    }
    return success(new PartySize(value));
  }
}