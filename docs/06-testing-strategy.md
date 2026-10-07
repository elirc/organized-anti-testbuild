# Testing Strategy - GlobalWorkforce OS

> Snapshot note: this repo is an organized snapshot of `elirc/antitestbuild`; its code and docs matched that repo, so the doc refinements made there are carried over here.

**The honest starting point: this repository contains no test files today.** The
scripts exist (`npm run test:api` runs `vitest run` in `apps/api`), but Vitest
will report "no test files found". What follows is the strategy this codebase
*needs*, ordered by payoff, with the first concrete targets named — treat it as
the build plan, not a description of what exists.

---

## 1. First target: the contract state machine (pure logic, no infra)

`apps/api/src/modules/contracts/contracts.service.ts:19-27` holds
`validTransitions` — DRAFT → IN_REVIEW → APPROVED → SENT → SIGNED → ACTIVE →
TERMINATED, with rejection paths back to DRAFT and TERMINATED as the terminal
state. It is currently a `private readonly` field inside the service class, so
the very first test forces the right refactor: extract the matrix and a
`canTransition(from, to)` helper into its own file so it can be imported
without instantiating the service (which needs `PrismaService` and
`AuditLogService`).

**Check**: a `contracts.transitions.spec.ts` asserting SENT → SIGNED is
allowed, DRAFT → ACTIVE is rejected, and TERMINATED allows nothing, passing
under `npm run test:api` — and the service behaves identically (the error
message in `update()` still lists the allowed transitions).

## 2. Second target: tenant isolation (the test that earns its keep)

`apps/api/src/common/guards/tenant.guard.ts` is the whole multi-tenant story:
CLIENT/WORKER users get `request.tenantId` bound from their token and a
`ForbiddenException` if they name any other tenant in params, query, body or
the `x-tenant-id` header; PLATFORM_ADMIN and INTERNAL_OPS bypass with
`request.isCrossTenant = true`. The guard is a plain class with no decorator
magic in the way — construct it directly, feed it a mocked
`ExecutionContext`, and pin all five behaviours (no user → 403; client with
matching tenant → bound; client naming a foreign tenant → 403; ops with
header → cross-tenant bound; client without tenantId → 403).

**Check**: five green assertions, and deliberately breaking the mismatch
comparison on line 51 turns exactly one of them red.

## 3. Integration tests (requires Postgres — document the cost)

The valuable cases, in order: auth handshake success/failure; tenant isolation
enforced *at the query level* (services must filter `where: { tenantId }` —
the guard binds it, but nothing forces a service to use it, which is exactly
what an integration test should catch); audit log rows written on company,
worker and case mutations (`audit-log.service.ts`). These need a real
PostgreSQL instance and seeded tenants; on this project that is a
`docker-compose.yml` database plus `npm run prisma:seed`.

## 4. End-to-end (aspirational — write it last)

One Playwright workflow covers the product's spine: log in as the seeded ops
user, create a company and worker, generate an onboarding plan, upload a
document as the worker, approve it as ops, and watch the dashboard's active
worker count increase. Build this only after layers 1-3 exist; an E2E suite
on top of zero unit tests inverts the maintenance cost.

---

## Running the tests

```bash
npm run test:api                   # vitest in apps/api (empty today)
npm run test --workspace=apps/api  # same, watch mode via test:watch
npm run test:web                   # vitest in apps/web (empty today)
```

The first PR that makes `npm run test:api` print a non-zero test count is the
most valuable PR a learner can make to this repository.
