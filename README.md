# Restaurant-Online-Reservation-System-G13

The project is a backend application that exposes a documented RESTful API for an online restaurant reservation system. It maintains information about restaurant tables, opening hours and available time slots, customer reservations, and the daily schedule used by restaurant staff. Swagger/OpenAPI.

# Restaurant Online Reservation System

[中文版 / Chinese version](README.zh-CN.md)

A TypeScript + Node.js + PostgreSQL backend (Clean Architecture, RESTful API, Swagger documentation). Team: G13.

## Quick Start

```bash
git clone https://github.com/YiYang567/Restaurant-Online-Reservation-System-G13.git
cd Restaurant-Online-Reservation-System-G13
npm install
cp .env.example .env        # Windows: copy .env.example .env  (.env is never committed)
docker compose up -d        # start local PostgreSQL
npm run typecheck
npm run test:unit
```

## Layered Structure

| Layer          | Directory            | Responsibility                                                             | May depend on       |
| -------------- | -------------------- | -------------------------------------------------------------------------- | ------------------- |
| Domain         | `src/domain`         | Entities, value objects, domain services, business rules BR-1 / BR-3       | Nothing             |
| Application    | `src/application`    | Use cases, Result type, ports (interfaces)                                 | Domain              |
| Infrastructure | `src/infrastructure` | PostgreSQL repositories, notification implementation, configuration, clock | Application, Domain |
| API            | `src/api`            | Express routes, validation, authentication, error mapping, Swagger         | Application         |

Dependencies point inward only (AC-1). `src/main.ts` is the composition root and the only place allowed to reference every layer.

---

# Team Division Guide

## 1. Roles at a Glance

| Code  | Name     | Role                              | Layer                        | Owned directories (only this person edits)                                           |
| ----- | -------- | --------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------ |
| **A** | ________ | **Project lead + merge approver** | Application layer            | `src/application/`, `tests/support/`, `.github/`, `docs/` (integration), `README.md` |
| **B** | ________ | Domain owner                      | Domain layer                 | `src/domain/`, `tests/unit/domain/`                                                  |
| **C** | ________ | Infrastructure owner              | Infrastructure layer         | `src/infrastructure/`, `tests/integration/db/`                                       |
| **D** | ________ | API owner                         | API layer + composition root | `src/api/`, `src/main.ts`, `tests/integration/api/`                                  |

Rules:

- **Everyone edits only their own directories.** This keeps merge conflicts rare. If you need to change someone else's directory, leave a comment on the relevant Issue first; the owner makes the change or agrees to it.
- **Only A clicks the Merge button.** Others may Approve a PR but do not merge it.
- **A's own PRs** cannot be approved by A (GitHub does not allow it), so **B** approves them and A merges.

## 2. Dependencies and Order of Work

```
Phase 0  Setup           A creates Issues / CI; everyone clones
Phase 1  Contracts       B delivers the domain model ┐
                         A delivers Result + ports   ┴─→ C and D can write dependent code only after these merge
Phase 2  Parallel work   B: domain logic   A: use cases + in-memory repos + unit tests
                         C: PostgreSQL repos + concurrency tests   D: routes + validation + auth + Swagger
Phase 3  Integration     D wires main.ts; C + D run integration tests; everyone fixes bugs
Phase 4  Acceptance      NFR-2 demo (B); architecture document (A integrates, each person writes their own section)
```

Phase 1 is the critical path. **Aim to finish it within 1–2 days.** While waiting, C and D start the tasks marked "can start immediately".

## 3. Workflow for Everyone

### 3.1 Before you start working

```bash
git checkout main
git pull origin main
git checkout -b feature/<lowercase-code>-<task>     # e.g. feature/b-domain-entities
```

Branch naming: `feature/b-xxx`, `fix/c-xxx`, `docs/a-xxx`, `chore/a-xxx`.

### 3.2 Developing and committing

- Commit in small steps. Commit message format: `feat: ...`, `fix: ...`, `test: ...`, `docs: ...`, `chore: ...`, `refactor: ...`
- ESM requirement: local imports must end in `.js`, e.g. `import { Table } from "./table.js"`
- Before pushing, these must pass locally:

```bash
npm run typecheck
npm run test:unit
```

### 3.3 Creating a Pull Request

```bash
git push -u origin feature/b-domain-entities
```

On GitHub click **Compare & pull request** and fill in:

- **Title**: same style as commit messages, e.g. `feat(domain): add Table and Reservation entities`
- **Description**: what changed / which requirement it covers (e.g. FR-2, BR-1) / how it was tested / whether it affects anyone else's directory
- **Reviewers**: as in the table below
- One PR does one thing. **Keep it under about 400 changed lines**; small PRs get reviewed faster.

| PR author | Reviewer (Approves)                              | Merges |
| --------- | ------------------------------------------------ | ------ |
| A         | B                                                | A      |
| B         | A                                                | A      |
| C         | A (add B if Application interfaces are involved) | A      |
| D         | A (add C or B if error mapping is involved)      | A      |

### 3.4 After receiving review comments

Keep committing on the same branch and push; the PR updates automatically. Do not open a new PR.

### 3.5 After your PR is merged

```bash
git checkout main
git pull origin main
git branch -d feature/b-domain-entities
```

### 3.6 When your branch is behind main

```bash
git checkout main && git pull origin main
git checkout feature/b-xxx
git merge main            # resolve conflicts in your editor, then git add + git commit
git push
```

### 3.7 Never do this

- Never push directly to `main` (the protection rule rejects it)
- Never `git push --force`
- Never commit `.env`, real passwords or real tokens
- Never import express / pg / any outer-layer code inside `src/domain`

---

## 4. Member A: Project Lead + Merge Approver + Application Layer

### Responsibility 1: Review and merge

**Review checklist for every PR** (PR page → Files changed → Review changes → Approve / Request changes):

- [ ] Changes stay inside the author's own directories (or were agreed on an Issue)
- [ ] Dependency direction is correct (Domain depends on nothing; Application depends only on Domain; controllers contain no business logic)
- [ ] Expected failures are returned as `Result`, not thrown (for example no table available) (AC-2)
- [ ] Tests exist, and the author states `typecheck` and tests pass locally
- [ ] No `.env`, secrets or leftover `console.log` debugging
- [ ] Commit messages and PR description are clear and link the Issue (write `Closes #12` in the description)

**Merge steps**: confirm there is 1 Approval and checks pass → click **Squash and merge** (keeps main history tidy) → click **Delete branch**.

**Merge order**: merge contract PRs first (Phase 1), then the PRs that depend on them. If there is a conflict, the author who merges later runs `git merge main` first.

### A's task list

#### A-0 Set up the Issue board (Phase 0, do this first)

1. GitHub → Issues → Labels: create `domain`, `application`, `infrastructure`, `api`, `docs`, `bug`
2. Projects → create a board (Todo / In progress / In review / Done)
3. Create one Issue per task code in sections 4–7 of this guide (A-1 … D-8), state the FR/BR/NFR it covers, and assign an owner
4. Tell B, C and D to clone the repository

#### A-1 CI workflow (Phase 0)

The `test:unit` and `test:integration` scripts are already merged into `main`. Branch `chore/a-ci`, create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run test:unit
```

The PR is approved by B and merged by A. After merging: Settings → Rules → `protect-main` → tick **Require status checks to pass** → add `test`.

#### A-2 Contracts: Result type and ports (Phase 1, covers AC-2, AC-3)

Branch `feature/a-contracts`. Create:

`src/application/result.ts`

```ts
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

`src/application/errors.ts`: a discriminated union of all expected failures, which the API layer maps to status codes

```ts
export type AppError =
  | { kind: "NoTableAvailable" }
  | { kind: "InvalidTime"; reason: string }
  | { kind: "IllegalStatusTransition"; from: string; to: string }
  | { kind: "NotFound"; what: string }
  | { kind: "Forbidden" } // reservation code and e-mail do not match
  | { kind: "ValidationFailed"; details: string[] };
```

`src/application/ports/` (interfaces only, no implementations):

- `TableRepository`: `add / getById / list / update / delete / listActive`
- `ReservationRepository`: `insert(reservation): Promise<Result<void, "Conflict">>` (**an overlap conflict is reported as `Conflict`**; the final guarantee of BR-2 lives in the database), `getByCode`, `listByDate`, `listByTableAndRange`, `update`
- `NotificationPort`: `reservationConfirmed(reservation)`, `reservationCancelled(reservation)`
- `Clock`: `now(): Date`
- `ReservationCodeGenerator`: `generate(): ReservationCode`

`Table`, `Reservation` and `ReservationCode` used in these interfaces come from B's Phase 1 delivery. Agree on field names with B in person or on an Issue first.

#### A-3 Use cases (Phase 2, covers FR-1 to FR-8)

One branch per use case, e.g. `feature/a-make-reservation`. One class per use case, **ports injected through the constructor**, returning `Result`:

| Use case                                                          | Requirement      | Key points                                                                                                                                                                                    |
| ----------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SearchAvailableTables`                                           | FR-1             | Filter active tables with enough capacity and no overlapping slot                                                                                                                             |
| `MakeReservation`                                                 | FR-2, BR-1, BR-2 | Validate BR-3 → ask the allocation strategy for ranked candidates (best fit first) → `insert`; if it returns `Conflict`, retry with the next candidate; if all fail return `NoTableAvailable` |
| `GetReservation`                                                  | FR-3             | Return only if both code and e-mail match, otherwise `Forbidden`                                                                                                                              |
| `CancelReservation`                                               | FR-4, BR-3       | Check e-mail and cancellation cutoff; set status to Cancelled (record is kept)                                                                                                                |
| `CreateTable / GetTable / ListTables / UpdateTable / DeleteTable` | FR-5             | Inactive tables take no part in new allocations                                                                                                                                               |
| `GetDailyReservations`                                            | FR-6             | Ordered by time, with table and party details                                                                                                                                                 |
| `CompleteReservation` / `MarkNoShow`                              | FR-7, FR-8       | Use B's state machine; illegal transitions return `IllegalStatusTransition`                                                                                                                   |

#### A-4 In-memory repositories and unit tests (Phase 2, covers AC-4)

- In `tests/support/` write `InMemoryTableRepository`, `InMemoryReservationRepository`, `FakeClock`, `FakeNotification`, `FixedCodeGenerator` (**C's and D's tests reuse them**, so merge them early)
- Unit tests go in `tests/unit/application/`, with no database and no express
- Cover at least: successful booking, no table available, retry on another table after a conflict, illegal status transition, wrong e-mail, cancellation after the cutoff

#### A-5 Documentation (Phase 4)

- `docs/architecture.md`: layer diagram, dependency rule, key design decisions. A writes the overview; B, C and D each write a section for their own layer (each via their own PR to `docs/`)
- Update this README with final run and demo instructions
- Prepare the final acceptance checklist (section 8) and run through it together

---

## 5. Member B: Domain Layer

Goal: the business core in pure TypeScript, **importing no external libraries** (except in tests).

#### B-1 Domain model (Phase 1, highest priority, basis of BR-3)

Branch `feature/b-domain-entities`. Create in `src/domain/`:

- `Table`: `id`, `capacity`, `description`, `active`
- `PartySize` (value object, at least 1, with a sensible upper bound)
- `TimeSlot` (value object: `start`, `end`, with an `overlaps(other)` method)
- `ReservationStatus`: `Confirmed | Cancelled | Completed | NoShow`
- `ReservationCode` (value object): 8+ characters from a fixed 32-character alphabet, for example `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (without the easily confused I, O, 0, 1). **NFR-3(3)**
- `Reservation`: `code`, `contactEmail`, `customerName`, `partySize`, `tableId`, `slot`, `status`

**Merge a minimal version within 1 day** (field and type definitions) to unblock A, C and D, then iterate.

#### B-2 Reservation state machine (Phase 2)

Implement `cancel()`, `complete()` and `markNoShow()` on `Reservation`. Allowed transitions:

```
Confirmed → Cancelled | Completed | NoShow
Cancelled / Completed / NoShow → (terminal, no further transitions)
```

Illegal transitions return an error (using a structure shaped like `Result`, or wrapped into A's `IllegalStatusTransition` in the use case; agree on one approach with A and record it on the Issue).

#### B-3 Allocation strategy and BR-1 (Phase 2)

```ts
// src/domain/allocation/table-allocation-strategy.ts
export interface TableAllocationStrategy {
  rankCandidates(
    tables: readonly Table[],
    partySize: PartySize,
    occupiedTableIds: ReadonlySet<string>,
  ): Table[]; // sorted by priority; only active + large enough + free tables
}
```

`BestFitStrategy`: the smallest sufficient capacity comes first (BR-1). It returns a **ranked candidate list** rather than a single table, so A's use case can try the next table when the database reports a conflict.

#### B-4 Reservation timing policy, BR-3 (Phase 2)

`ReservationPolicy` (configuration passed via the constructor; it does not read environment variables itself):

- Fixed reservation duration
- Within opening hours (both start and end)
- Advance booking window (not in the past, not beyond the maximum number of days ahead)
- Cancellation cutoff (cancellable only more than N hours before the start)

Everything about "what time is it now" is decided from a passed-in parameter (`now: Date`). Do not call `new Date()` inside the domain, so tests stay deterministic.

#### B-5 Unit tests (submitted together with each task)

`tests/unit/domain/`: BR-1 best fit (including inactive tables, insufficient capacity, ties), all state machine transitions, BR-3 edges (exactly at opening/closing time, one second before/after the cutoff), reservation code alphabet and length.

When B submits the first real unit test, remove `--passWithNoTests` from the `test:unit` script in the same PR, so a future missing test suite can no longer pass silently.

#### B-6 NFR-2 demo: add a second strategy (Phase 4)

Add `FirstAvailableStrategy`, **new files only**. The only existing code that changes is D's registration line in `main.ts`. Add a unit test that runs the same scenario with both strategies. In the demo, use `git diff main...` to show that only new files and the registration changed.

---

## 6. Member C: Infrastructure Layer

Goal: implement the ports on PostgreSQL and let the database guarantee BR-2.

#### C-1 Database schema (Phase 0, can start immediately)

Branch `feature/c-schema`. Create `src/infrastructure/db/schema.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id          UUID PRIMARY KEY,
  capacity    INT  NOT NULL CHECK (capacity > 0),
  description TEXT NOT NULL DEFAULT '',
  active      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS reservations (
  code          TEXT PRIMARY KEY,
  contact_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  party_size    INT  NOT NULL CHECK (party_size > 0),
  table_id      UUID NOT NULL REFERENCES restaurant_tables(id),
  start_at      TIMESTAMPTZ NOT NULL,
  end_at        TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('Confirmed','Cancelled','Completed','NoShow')),
  CHECK (end_at > start_at),
  -- BR-2: Confirmed reservations of the same table must not overlap in time
  CONSTRAINT no_double_booking EXCLUDE USING gist (
    table_id WITH =,
    tstzrange(start_at, end_at) WITH &&
  ) WHERE (status = 'Confirmed')
);
```

Key point: the exclusion constraint applies only to `Confirmed`, so a cancelled reservation releases its slot automatically (FR-4). This is the "transaction or unique constraint" option: under concurrency the database guarantees no double booking.

Provide `npm run db:init` (a `tsx` script that reads and runs `schema.sql`) so teammates can create the tables with one command.

#### C-2 Connection and configuration (Phase 0/1)

- `src/infrastructure/config/config.ts`: read and validate environment variables with zod (`PORT`, `DATABASE_URL`, `STAFF_TOKEN`, plus the fixed BR-3 values such as opening hours, reservation duration, advance window, cancellation cutoff hours); fail at startup with a clear message when something is missing
- `src/infrastructure/db/pool.ts`: create the `pg.Pool`
- Update `.env.example` with **example values only**
- All SQL uses parameters (`$1, $2`); **never build SQL by string concatenation** (NFR-3(4))

#### C-3 Repository implementations (Phase 2, needs A-2 and B-1 merged)

- `PostgresTableRepository`: implements A's `TableRepository`
- `PostgresReservationRepository`: implements `ReservationRepository`. `insert` catches PostgreSQL error code `23P01` (exclusion_violation) and returns `err("Conflict")`; other database errors are thrown
- Row-to-domain mapping lives in mapper functions, so domain objects carry no SQL details

#### C-4 Other port implementations (Phase 2)

- `SystemClock` (implements `Clock`)
- `RandomReservationCodeGenerator`: use `randomInt` from `node:crypto` to pick characters from B's 32-character alphabet; **never `Math.random()`**
- `ConsoleNotificationService`: implements `NotificationPort` and only logs (real e-mail is out of scope in the proposal; notification is an abstraction)

#### C-5 Integration tests (Phase 3, covers NFR-1)

In `tests/integration/db/`, connect to the Docker test database (a separate database such as `reservations_test` works):

1. **Concurrency test**: one suitable table and one time slot left; fire 10 booking requests at once with `Promise.all`; assert **exactly 1 succeeds and 9 get `NoTableAvailable`**
2. **Restart test**: write a reservation → close and recreate the connection pool → query; the data is still there
3. **Cancellation releases the slot**: after cancelling, the same slot can be booked again
4. Empty the tables before each test so tests are independent

When C submits the first real integration test, remove `--passWithNoTests` from the `test:integration` script in the same PR.

---

## 7. Member D: API Layer + Composition Root

Goal: RESTful endpoints, authentication, validation, Swagger, and wiring all layers together.

#### D-1 Application skeleton (Phase 0, can start immediately)

Branch `feature/d-app-skeleton`:

```bash
npm install -D supertest @types/supertest
```

- `src/api/app.ts`: export `createApp(deps)` with **dependencies passed in as parameters**, so tests can inject in-memory repositories
- JSON parsing, a central error-handling middleware, a 404 handler
- **Consistent error response format** (AC-5):

```json
{
  "error": {
    "code": "NO_TABLE_AVAILABLE",
    "message": "No table available for the requested time",
    "details": []
  }
}
```

#### D-2 Error mapping (Phase 1, needs A-2 merged)

`src/api/error-mapper.ts` converts A's `AppError` into an HTTP response. **This is the only place where errors become HTTP** (AC-2):

| `AppError.kind`                            | HTTP |
| ------------------------------------------ | ---- |
| `ValidationFailed`                         | 400  |
| Missing/invalid staff credential           | 401  |
| `Forbidden` (code and e-mail do not match) | 403  |
| `NotFound`                                 | 404  |
| `NoTableAvailable`                         | 409  |
| `IllegalStatusTransition`                  | 409  |
| `InvalidTime`                              | 422  |

Expected failures must **never produce a 500** (NFR-1(3)). Only truly unknown exceptions are 500, and the stack trace is never sent to the client.

#### D-3 Route design (Phase 2, covers FR-1 to FR-8, AC-5)

| Method and path                                                                                  | Purpose                                                           | Requirement | Auth          |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ----------- | ------------- |
| `GET /api/v1/availability?partySize=&date=&time=`                                                | Search available tables                                           | FR-1        | None          |
| `POST /api/v1/reservations`                                                                      | Create a reservation; returns 201 + `Location` + reservation code | FR-2        | None          |
| `GET /api/v1/reservations/{code}`                                                                | View a reservation (header `X-Contact-Email`)                     | FR-3        | Code + e-mail |
| `PATCH /api/v1/reservations/{code}` body `{"status":"Cancelled"}`                                | Cancel a reservation                                              | FR-4        | Code + e-mail |
| `POST /api/v1/staff/tables`                                                                      | Create a table                                                    | FR-5        | Staff         |
| `GET /api/v1/staff/tables`, `GET /api/v1/staff/tables/{id}`                                      | View tables                                                       | FR-5        | Staff         |
| `PUT /api/v1/staff/tables/{id}`                                                                  | Update a table (including the active flag)                        | FR-5        | Staff         |
| `DELETE /api/v1/staff/tables/{id}`                                                               | Delete a table                                                    | FR-5        | Staff         |
| `GET /api/v1/staff/reservations?date=`                                                           | Daily reservation list                                            | FR-6        | Staff         |
| `PATCH /api/v1/staff/reservations/{code}` body `{"status":"Completed"}` or `{"status":"NoShow"}` | Mark completed / no-show                                          | FR-7, FR-8  | Staff         |

A route handler does three things only: validate input → call the use case → hand the `Result` to the mapper. **No business logic in controllers** (AC-1).

#### D-4 Input validation (Phase 2, covers NFR-3(4))

Build a zod schema for the body / query / params of every endpoint (e-mail format, date format, party size range, maximum string lengths). A validation failure returns 400 with `details`.

#### D-5 Staff authentication middleware (Phase 1, can start)

- Read `Authorization: Bearer <token>` and compare with the `STAFF_TOKEN` environment variable using `crypto.timingSafeEqual`
- Missing credential returns 401; wrong credential returns 403
- Mount it on the whole `/api/v1/staff` prefix, **so no endpoint can be missed** (NFR-3(1))

#### D-6 Swagger / OpenAPI (Phase 2)

- `src/api/openapi.ts` describes every endpoint, request/response examples, the error format and Bearer authentication
- Serve it at `/docs` with `swagger-ui-express`
- The demo and testing go through Swagger, so write complete request examples

#### D-7 Composition root `src/main.ts` (Phase 3)

- Read configuration → create the connection pool → instantiate repositories, clock, code generator, notification service and allocation strategy → instantiate use cases → `createApp(...)` → listen on the port
- **The allocation strategy is registered here**; the NFR-2 demo changes only this spot
- Keep it simple: no heavyweight DI framework, plain constructor injection by hand

#### D-8 API tests (Phase 3, covers NFR-1 and NFR-3)

In `tests/integration/api/`, using `supertest`:

- **Every staff endpoint**: no credential → 401, wrong credential → 403 (loop over the endpoint list so none is missed)
- Wrong e-mail when viewing or cancelling a reservation → 403
- Every expected failure (no table, invalid time, illegal status transition) asserts a 4xx and not a 500
- **Malicious input**: `'; DROP TABLE reservations; --`, very long strings, `<script>`, JSON of the wrong type; assert 400 and that the tables still exist
- First run against A's in-memory repositories; once C's repositories are merged, add a second set that runs against real PostgreSQL

---

## 8. Final Acceptance Checklist (A confirms each item)

| Item                                                                                  | Requirement | Owner | Evidence                                               |
| ------------------------------------------------------------------------------------- | ----------- | ----- | ------------------------------------------------------ |
| 10 concurrent requests compete for the last table; exactly 1 succeeds                 | NFR-1(1)    | C     | Integration test passes                                |
| Reservations survive a restart                                                        | NFR-1(2)    | C     | Integration test passes                                |
| All expected failures are 4xx                                                         | NFR-1(3)    | D     | API tests pass                                         |
| Adding an allocation strategy changes only new files + registration                   | NFR-2(1)    | B, D  | `git diff` screenshot + unit tests for both strategies |
| Notifications are called through an interface                                         | NFR-2(2)    | A, C  | Code review                                            |
| All staff endpoints return 401/403 without credentials                                | NFR-3(1)    | D     | Automated tests                                        |
| Wrong e-mail is rejected                                                              | NFR-3(2)    | A, D  | Use case unit test + API test                          |
| Reservation code ≥ 8 characters, 32-character alphabet                                | NFR-3(3)    | B     | Unit test                                              |
| `.env.example` has no real secrets, all SQL parameterised, malicious input tests pass | NFR-3(4)    | C, D  | Repository check + tests                               |
| Dependency direction correct, no business logic in controllers                        | AC-1        | A     | Review                                                 |
| Domain/Application unit-testable without a database                                   | AC-4        | A, B  | `npm run test:unit` needs no Docker                    |
| Swagger reachable and endpoints complete                                              | AC-5        | D     | Open `/docs`                                           |

## 9. FAQ

**Push rejected with "protected branch"**: you committed on `main`. Run `git checkout -b feature/xxx` to carry the commit to a new branch, then `git push -u origin feature/xxx`. After that go back to `main` and run `git reset --hard origin/main`.

**The interface I need is not merged yet**: agree the signature with its owner on the Issue and code against it, or use a local stub until the contract is merged and you can connect to the real thing.

**Two people want to edit the same file**: discuss on the Issue first; the directory owner makes the change. If it really must be edited by both, one merges first and the other runs `git merge main` and continues.

**A PR has had no review**: mention the reviewer in the group chat. If nothing happens within a day, A coordinates.
