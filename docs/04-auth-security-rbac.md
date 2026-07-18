# Authentication, Security & RBAC - GlobalWorkforce OS

GlobalWorkforce OS is designed under strict enterprise security principles, ensuring absolute multi-tenant database isolation, fine-grained Role-Based Access Control (RBAC), and transactional operational logging.

---

## Authentication Mechanism

* **Password Protection**: Hashed using **`bcrypt`** with a salt round factor of 10. Raw passwords are never stored in the database, and password hashes are explicitly omitted from query JSON select outputs.
* **Token Handshakes**: Stateless authentication utilizing standard **JWT (JSON Web Tokens)** access tokens with 1-day expirations.
* **Header Handshake**: Clients transmit tokens inside request headers: `Authorization: Bearer <JWT>`. The server uses a custom, passport-free `JwtAuthGuard` to verify signatures and decrypt profiles.

---

## Multi-Tenant Isolation Architecture

The database is structured as a **Shared Database, Shared Schema** monolith, separated by strict logical filters:

1. **Isolation Keys**: All tenant-specific tables contain a required `tenantId` field indexed inside PostgreSQL.
2. **Global Enforcer**: The `TenantGuard` intercepts REST requests. For client admins, HR staff, or workers, it extracts the validated `user.tenantId` from the decrypted JWT payload and binds it as `request.tenantId`.
3. **Bound Queries**: All backend services inject `request.tenantId` directly into their Prisma query inputs:
   ```typescript
   // Enforced boundary filter
   this.prisma.worker.findMany({ where: { tenantId } })
   ```
4. **Bypass Rules**: Platform Admins and Internal Operations represent cross-tenant roles. They bypass standard tenant filters to manage global databases. They can select specific tenant contexts from the UI by transmitting `x-tenant-id` headers.

---

## Role-Based Access Control (RBAC) Matrix

Endpoints are annotated with `@Roles(...)` metadata and checked by `RolesGuard`:

| Operations Feature | PLATFORM_ADMIN | INTERNAL_OPS | CLIENT_ADMIN | CLIENT_HR | WORKER |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Tenants list** | Full (CRUD) | Full (CRUD) | Denied | Denied | Denied |
| **Company profiles** | Full (CRUD) | Full (CRUD) | CRUD (Own) | Read (Own) | Denied |
| **Workers Workspace** | Full (CRUD) | Full (CRUD) | CRUD (Own) | Update (Profiles) | Read (Self Only) |
| **Contracts Ledger** | Full (CRUD) | Full (CRUD) | CRUD (Own) | Denied | Sign (Self Only) |
| **Onboarding plans** | Full (CRUD) | Full (CRUD) | Manage (Own) | Manage (Own) | Complete (Self) |
| **Documents review** | Approve/Reject | Approve/Reject | Read (Own) | Read (Own) | Upload (Self) |
| **Payroll cycles** | Full (CRUD) | Full (CRUD) | Read/Edit (Own) | Read (Own) | Denied |
| **Support Center** | Claim/Close | Claim/Close | CRUD (Own) | CRUD (Own) | CRUD (Self Only) |
| **Audit Logs** | Full Read | Full Read | Denied | Denied | Denied |

---

## Critical Security Guardrails

* **Worker Self-Boundary Check**: The backend controller intercepts worker requests, guaranteeing that a `WORKER` can only fetch or modify records matching their active `workerId` or `userId` (e.g. they cannot read other workers' payslips, contracts, or support case conversations).
* **Support Ticket Comments Shield**: Conversational logs can be flagged `isInternal`. If a client admin, HR, or worker requests a ticket detail, the service layer filters out internal comments.
* **Override Protection**: Workers cannot transition themselves to `ACTIVE`. Client admins can only activate workers whose onboarding plans are fully `COMPLETED` unless internal ops overrides the compliance check by supplying a validated override reason saved inside the immutable audit logbook.
