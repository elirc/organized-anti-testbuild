# Architecture Guide - GlobalWorkforce OS

GlobalWorkforce OS is structured as a type-safe **Modular Monolith** contained in a monorepo. This architectural style was selected to guarantee clear code boundaries, domain isolation, and rapid development, while keeping local development extremely simple and avoiding the latency, network overhead, and operations cost of microservices.

---

## Workspace Structure

The project uses npm workspaces to isolate dependencies:
* `apps/api`: The NestJS REST API server.
* `apps/web`: The React client SPA compiled with Vite.
* `packages/shared`: Shared types, enums, and Zod schemas imported by both client and server.

```text
/
├── apps/
│   ├── api/
│   │   ├── prisma/             # Schema definitions, seed, migrations
│   │   └── src/
│   │       ├── common/         # Global guards, filters, pipes, interceptors
│   │       └── modules/        # Domain-driven modules (Controller, Service, Module)
│   └── web/
│       ├── src/
│       │   ├── components/     # Reusable UI controls & App shell Layout
│       │   ├── context/        # React Auth Context session
│       │   ├── pages/          # Feature Pages
│       │   └── services/       # Global API Axios client
└── packages/
    └── shared/
        └── src/                # Shared Zod validation & TS constants
```

---

## Backend Modular Design

Every feature module in the backend (e.g. `WorkersModule`, `PayrollModule`) is self-contained:
1. **Controller Layer**: Exposes REST interfaces, registers guards (JWT, Tenant, Roles), and binds `ZodValidationPipe` to validate incoming requests.
2. **Service Layer**: Implements core business logic, query validations, date checks, state machines, and automatically dispatches auditing records.
3. **Database Access Layer**: Injected globally using standard `PrismaService`.

---

## Frontend State Management & API Client

* **Query Caching**: Built using **TanStack React Query**. Page states (such as lists or dashboards) are loaded reactively. Mutations automatically invalidate query cache lines, ensuring real-time data sync without polling.
* **Forms Control**: Standard **React Hook Form** combined with `@hookform/resolvers/zod` validates inputs directly in the browser using the exact same Zod validation rules compiled in the shared package.
* **Axios Interceptor**: Intercepts requests to append the authorization header (`Bearer JWT`) and adds an active tenant selector header `x-tenant-id`.
