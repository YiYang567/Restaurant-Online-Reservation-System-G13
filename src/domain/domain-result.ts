// The result of a domain operation: either success (ok) or failure (error).
// Used instead of throwing exceptions for expected failures.
export type DomainResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

export const success = <T>(value: T): DomainResult<T> => ({ ok: true, value });
export const failure = <T = never>(error: string): DomainResult<T> => ({ ok: false, error });