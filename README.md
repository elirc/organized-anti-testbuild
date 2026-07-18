# GlobalWorkforce OS 🌐

GlobalWorkforce OS is a secure, multi-tenant Employer of Record (EOR) operations platform designed as a modular monolith. It enables operations teams, client corporations, and international workers to manage the full lifecycle of global employment under strict multi-tenant boundaries and Role-Based Access Control (RBAC).

---

## 🛠️ Technology Stack

* **Frontend**: React, TypeScript, Vite, React Router v6, TanStack React Query v5, React Hook Form, Zod.
* **Backend**: Node.js, TypeScript, NestJS, Prisma ORM, PostgreSQL, bcrypt, JWT, class-validator.
* **Database**: PostgreSQL (containerized locally).
* **Testing**: Unit & Integration testing via Vitest. E2E workflows via Playwright.

---

## 📂 Folder Structure

```text
/
├── apps/
│   ├── api/             # NestJS REST backend
│   │   ├── prisma/      # Schema, migrations, seed script
│   │   └── src/         # Main NestJS modules, guards, filters, pipes
│   └── web/             # React / Vite frontend
│       ├── src/         # UI pages, layouts, auth context, API client
│       └── index.html   # HTML entry utilizing Outfit / Inter fonts
├── packages/
│   └── shared/          # Shared type interfaces, enums, Zod validation schemas
├── docs/                # Comprehensive technical guides (01-09)
├── docker-compose.yml   # Local database service container
├── package.json         # Workspace configurations and startup scripts
└── README.md            # You are here!
```

---

## 🚀 Getting Started

Follow these steps to launch the entire platform locally in development mode:

### 1. Install Dependencies
Run npm installations from the root directory to download packages and link workspace symlinks:
```bash
npm install
```

### 2. Boot Database Container
Launch the PostgreSQL service container:
```bash
docker-compose up -d
```

### 3. Setup Environments
Create your `.env` overrides:

* **Backend Environment** (`apps/api/.env`):
  ```env
  PORT=3000
  DATABASE_URL="postgresql://gwos_user:gwos_password123!@localhost:5432/gwos_db?schema=public"
  JWT_SECRET="super_secret_jwt_key_that_is_at_least_32_characters_long_for_security"
  FRONTEND_URL="http://localhost:5173"
  ```
* **Frontend Environment** (`apps/web/.env`):
  ```env
  VITE_API_BASE_URL=/api
  ```

### 4. Run Migrations & Database Seeding
Perform schema updates, compile clients, and seed mock data:
```bash
# Compile shared schemas
npm run build:shared

# Generate Prisma Client
npm run prisma:generate

# Push schema to database
npm run prisma:migrate

# Seed compliance records, user profiles, cases
npm run prisma:seed
```

### 5. Start Development Servers
Start both the React client and NestJS server concurrently:
```bash
npm run dev
```

* **Vite React Web App**: `http://localhost:5173`
* **NestJS REST API**: `http://localhost:3000/api`

---

## 🔑 Demo Personas (Password: `Password123!`)

Log in using these pre-seeded users to explore role permissions and multi-tenant boundary isolation:

* **Platform Administrator**: `platform.admin@example.com` (full cross-tenant accesses)
* **Internal Operations**: `ops@example.com` (approves documents, reviews payrolls)
* **Client Admin (ACME)**: `client.admin@acme.example.com` (manages ACME Corp workspace)
* **Client HR (ACME)**: `hr@acme.example.com` (updates ACME profiles and checklists)
* **Worker (US John Doe)**: `worker.one@example.com` (signs contracts, views payslips)

---

## 🧪 Testing Commands

Execute testing sweeps inside workspaces:
```bash
# Run backend vitest suites
npm run test:api

# Run frontend unit tests
npm run test:web
```

---

## 📖 Product Documentation Ledger

Find deeper details in our `/docs/` manual:
* [01 - Product Overview](file:///c:/Users/Owner/Desktop/antitestbuild/docs/01-product-overview.md)
* [02 - Architecture Guide](file:///c:/Users/Owner/Desktop/antitestbuild/docs/02-architecture.md)
* [03 - Domain Model ERD](file:///c:/Users/Owner/Desktop/antitestbuild/docs/03-domain-model.md)
* [04 - Auth, Security & RBAC Matrix](file:///c:/Users/Owner/Desktop/antitestbuild/docs/04-auth-security-rbac.md)
* [05 - API Endpoint Reference](file:///c:/Users/Owner/Desktop/antitestbuild/docs/05-api-reference.md)
* [06 - Testing Strategy](file:///c:/Users/Owner/Desktop/antitestbuild/docs/06-testing-strategy.md)
* [07 - Local Development Guide](file:///c:/Users/Owner/Desktop/antitestbuild/docs/07-local-development.md)
* [08 - Junior to Mid Teaching Guide](file:///c:/Users/Owner/Desktop/antitestbuild/docs/08-learning-guide-for-junior-to-mid-level-engineers.md)
* [09 - Extended Roadmap](file:///c:/Users/Owner/Desktop/antitestbuild/docs/09-extension-roadmap.md)
