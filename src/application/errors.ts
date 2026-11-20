export type AppError =
  | { kind: "NoTableAvailable" }
  | { kind: "InvalidTime"; reason: string }
  | { kind: "IllegalStatusTransition"; from: string; to: string }
  | { kind: "NotFound"; what: string }
  | { kind: "Forbidden" } // reservation code and e-mail do not match
  | { kind: "ValidationFailed"; details: string[] };
