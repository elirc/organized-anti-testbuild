# Learning Guide: Navigating Enterprise Architecture

Welcome, Engineer! This guide is designed to help you bridge the gap between writing simple scripting tasks and architecting serious enterprise-grade CRUD platforms. By dissecting **GlobalWorkforce OS**, you will learn how industry-grade SaaS platforms implement type-safe monorepos, multi-tenant isolation, role authorization, and workflow automation.

---

## 1. How to Read This Codebase

When navigating a large corporate codebase, **do not read files alphabetically**. Instead, trace a single user action end-to-end:

1. **Start with the domain**: Open `apps/api/prisma/schema.prisma` to see how domain objects are modeled. Everything connects to this schema.
2. **Find the contracts entry point**: Open the shared packages at `packages/shared/src/schemas.ts` to see how payloads are validated.
3. **Trace the backend route**: Open a controller like `apps/api/src/modules/workers/workers.controller.ts` to see exposed endpoints.
4. **Inspect the business layer**: Open a service like `apps/api/src/modules/workers/workers.service.ts` to explore state changes.
5. **Analyze the client view**: Look at the frontend page components in `apps/web/src/pages/Workers.tsx` to understand the query-invalidation lifecycles.

---

## 2. Dynamic Enterprise Concepts

### A. The End-to-End Data Flow
Here is how a workforce creation action flows from the browser input down to the PostgreSQL database:
1. **Validation**: The user fills the React form. React Hook Form validates the inputs using Zod resolver rules imported from `@gwos/shared`.
2. **REST request**: The client dispatches a `POST /api/workers` JSON payload.
3. **Interception**: Axios request interceptors append local storage Bearer JWT tokens.
4. **Backend Guard**: NestJS `JwtAuthGuard` intercepts the route, verifies the signature, and decodes the user payload into the request object.
5. **Tenant Gate**: `TenantGuard` reads `tenantId` from the verified token payload and binds it as `request.tenantId` — and rejects the request outright if the params, query, body or `x-tenant-id` header name a *different* tenant (`apps/api/src/common/guards/tenant.guard.ts:44-55`). PLATFORM_ADMIN and INTERNAL_OPS bypass with `request.isCrossTenant = true`.
6. **Zod Validation Pipe**: The payload is validated in NestJS using the Zod schemas from the shared package.
7. **Role check**: `RolesGuard` verifies the user's role metadata.
8. **Service Layer Execution**: The Controller delegates execution to `WorkersService.create(body, tenantId)`.
9. **Query Execution**: Prisma translates commands into SQL: `INSERT INTO "Worker" ("tenantId", "email", ...) VALUES (...)` and saves records under index structures.
10. **State Invalidation**: On REST success, the React client's TanStack query cache invalidates the `['workers']` list, causing components to re-render the new data automatically.

### B. Multi-Tenant Database Isolation
Tenant isolation prevents **Data Leakage** (when User A sees User B's payroll or profiles). 
* We enforce logical isolation: Every table has a `tenantId` index.
* We intercept requests globally: The `TenantGuard` guarantees that the client's payload or query parameters match the token's `user.tenantId`.
* We inject filters: Services must strictly query `where: { tenantId }`!

### C. Role-Based Access Control (RBAC)
Role checks are executed at two levels:
1. **Frontend (Visual UX)**: The UI hides action elements (such as "Draft Contract" buttons) based on the user session's `user.role` check.
2. **Backend (API Security)**: The REST routes are protected using `@Roles(...)` metadata. Even if a worker manually triggers a `POST` request to create a contract, the backend `RolesGuard` immediately halts the request and returns a `403 Forbidden` response.

---

## 3. 10 Learning Tasks to Modify the App

To solidify your understanding of this architecture, implement the following features. Each ends with the observable proof that it works — do not call a task done until you have seen its check.

1. **Add a password recovery flow**: Create a new endpoint `POST /auth/forgot-password` that writes a token to a new table. **Check**: the token row appears via `npx prisma studio`, and using it twice fails the second time.
2. **Expand the Audit Log**: Log document downloads and password changes through the existing `AuditLogService` (`apps/api/src/modules/audit-logs/audit-log.service.ts`). **Check**: perform each action once, then query the audit endpoint and find exactly two new rows with the right actor.
3. **Add an Email Notification Service**: Inject a placeholder mailing service (log-only) fired when an onboarding task is marked blocked. **Check**: blocking a task prints the message; *unblocking does not*.
4. **Implement Pagination inside API endpoints**: Migrate one list endpoint to backend `skip`/`take` queries. **Check**: the network tab shows page-sized payloads, and page 2 with page-size 5 returns rows 6-10 of the seeded data.
5. **Enforce Worker profile fields edit limits**: Workers may update phone but not their own `jobTitle` or `startDate`. **Check**: the self-update with `jobTitle` returns 403; the same payload from an ops user succeeds.
6. **Support multiple companies under one tenant**: Let client admins toggle company subviews. **Check**: with two seeded companies, toggling filters the workers table without a full reload (watch the TanStack query keys).
7. **Calculate Payroll tax deductions**: A tax estimation service keyed on `countryCode`. **Check**: unit-test it — this is a pure function; if you can't test it without the database, the service boundary is wrong.
8. **Add attachments to Support cases**: Save file URLs on comments. **Check**: an internal comment's attachment is invisible to the worker role (reuse the `isInternal` filter logic).
9. **Support dark theme toggle**: CSS token swap in React. **Check**: toggle survives a page reload (persisted preference) and no component re-imports colors outside `index.css`.
10. **Rate limit API endpoints**: Bind NestJS's throttler to the login endpoint. **Check**: the 6th rapid login attempt returns 429 while other endpoints stay unaffected.

---

## 4. 10 Interview Talking Points from This Project

Be ready to discuss these architectural patterns in your next senior-level job interview:

1. **Modular Monolith vs Microservices**: *"We selected a modular monolith to maintain a clean codebase with domain isolation. It keeps deployment and local development simple while allowing feature modules to be easily extracted into separate microservices if scaling demands it later."*
2. **Passport-less Custom JWT Guards**: *"We built our own light JWT validation guard rather than importing verbose passport strategies. It extracts the token, verifies the signature, and decodes the payload directly, keeping our HTTP pipeline lightweight and easier to unit test."* (Vocabulary that matters in the interview: a standard JWT is **signed, not encrypted** — anyone can base64-decode the payload; the signature only proves it wasn't altered. Never put secrets in one.)
3. **Database-level Tenant isolation**: *"We enforced logical multi-tenancy by indexing and filtering every single SQL query with tenantId, validating inputs through a custom TenantGuard that binds the tenant context to the request structure."*
4. **Auto-provisioning lifecycles**: *"When a client registers a worker, the platform automates operations by creating user credentials, generating onboarding plans, and parsing country compliance tables to batch-insert tasks in a single transactional flow."*
5. **State-Machine Contract transitions**: *"Contract status changes are guarded by a strict transition matrix (e.g. preventing draft contracts from skipping review)."*
6. **Zod shared schemas**: *"We eliminated validation divergence by writing shared Zod schemas. The exact same schema that runs in the React form validator is compiled in the NestJS pipe to evaluate incoming payloads."*
7. **Internal Comments Hiding**: *"Our support case services inspect user roles and filter out conversational logs marked `isInternal` on query fetches to keep operations notes secure."*
8. **TanStack Cache Invalidations**: *"We decoupled UI updates from state variables by leveraging React Query cache invalidations on mutations. This keeps client data accurately synced with database tables."*
9. **Override guards**: *"Workers cannot bypass checklists. Status changes to ACTIVE are blocked unless onboarding is completed, or unless operations staff supply a reason logged in the immutable audit database."*
10. **Rich CSS variables**: *"We established visual excellence without Tailwind dependencies by building a robust index.css token layer using custom HSL values, transition offsets, and glassmorphic layouts."*
