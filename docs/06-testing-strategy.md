# Testing Strategy - GlobalWorkforce OS

GlobalWorkforce OS includes a comprehensive test framework comprising backend business logic unit tests, multi-tenant integration boundary tests, frontend schema validation unit tests, and Playwright end-to-end user workflows.

---

## Test Organization

### 1. Backend Testing (`apps/api`)
Powered by **Vitest** for quick execution:
* **Unit Tests**: Test core services in isolation (e.g. validating contract transition states, date rules, or tax task generation algorithms).
* **Integration Tests**: Connect to a PostgreSQL test instance, executing actual database queries:
  * **Auth Flow**: Success/failure handshakes.
  * **Tenant isolation**: Verifies queries by one tenant user strictly reject/fail when attempting to fetch another tenant's workforce data.
  * **Audit logging**: Verifies that making modifications to companies, workers, and cases immediately commits structural audit logs.

### 2. Frontend Testing (`apps/web`)
* **Form validation**: Unit test logins and worker creation form checks.
* **Component isolation**: Verify that reusable components like Table, Badge, and protected guards handle loaded, empty, and rejected states cleanly.

### 3. End-to-End (E2E) Testing
Managed via **Playwright** simulating full operational cycles:
1. Logs in as `ops@example.com` (Internal Ops).
2. Spasms a client Company and adds a Worker profile.
3. Generates a new onboarding plan and default tasks.
4. Uploads document metadata as the Worker, and approves it as Ops.
5. Verifies the dashboard active worker count increases by 1.

---

## Running the Tests

To run the testing sweeps, use the standard monorepo scripts:

```bash
# Run backend test suites
npm run test:api

# Watch mode backend tests
npm run test --workspace=apps/api

# Run frontend unit tests
npm run test:web
```
