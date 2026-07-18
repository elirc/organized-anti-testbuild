# Local Development - GlobalWorkforce OS

Follow this step-by-step guide to configure your local development machine, run the PostgreSQL database, generate migrations, seed sample records, and launch development servers.

---

## Prerequisites

Ensure you have the following installed on your machine:
* **Node.js** (v18 or higher recommended)
* **npm** (v9 or higher)
* **Docker** & **Docker Compose** (for regional PostgreSQL container database operations)

---

## Step 1: Clone & Install Dependencies

Clone the repository to your desktop and run package installations:

```bash
# Install all workspace dependencies
npm install
```

---

## Step 2: Boot Database Services

Boot the dockerized PostgreSQL container using docker-compose:

```bash
# Start PostgreSQL in background
docker-compose up -d
```

This spins up a container mapping port `5432` with credentials:
* **Host**: `localhost`
* **Username**: `gwos_user`
* **Password**: `gwos_password123!`
* **Database name**: `gwos_db`

---

## Step 3: Configure Environment Variables

Create the `.env` configuration file in `apps/api/.env` and `apps/web/.env`:

### API Configuration (`apps/api/.env`)
```env
PORT=3000
DATABASE_URL="postgresql://gwos_user:gwos_password123!@localhost:5432/gwos_db?schema=public"
JWT_SECRET="super_secret_jwt_key_that_is_at_least_32_characters_long_for_security"
FRONTEND_URL="http://localhost:5173"
```

### Web Configuration (`apps/web/.env`)
```env
VITE_API_BASE_URL=/api
```

---

## Step 4: Apply Database Migrations & Seeding

Sync your Prisma schema with the Postgres database, generate types, and seed sample data:

```bash
# Generate Prisma Client
npm run prisma:generate

# Sync schema definitions to DB
npm run prisma:migrate

# Seed sample EOR data
npm run prisma:seed
```

---

## Step 5: Launch Development Servers

Start the API and Web applications concurrently:

```bash
# Launches both apps/api and apps/web
npm run dev
```

* The **API Server** will start at: `http://localhost:3000/api`
* The **Vite React Web App** will start at: `http://localhost:5173`

---

## Demo Credentials (Password: `Password123!`)

Log in using these seeded personas to verify features and boundaries:

* **Platform Admin**: `platform.admin@example.com` (full cross-tenant accesses)
* **Internal Operations**: `ops@example.com` (approves documents, reviews payrolls)
* **Client Admin**: `client.admin@acme.example.com` (manages ACME Corp workspace)
* **Client HR**: `hr@acme.example.com` (updates ACME profiles and checklists)
* **Worker (US John Doe)**: `worker.one@example.com` (signs contracts, views payslips)
