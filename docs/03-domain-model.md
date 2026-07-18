# Domain Model - GlobalWorkforce OS

GlobalWorkforce OS uses PostgreSQL managed by Prisma ORM. The schema is highly relational, utilizing strict constraints, foreign keys, and cascading rules to guarantee data integrity across all features.

---

## Entity Relationship Diagram

The domain model contains 16 relational entities:

```mermaid
erDiagram
    Tenant ||--o{ User : contains
    Tenant ||--o{ Company : registers
    Tenant ||--o{ Worker : manages
    Tenant ||--o{ EmploymentContract : executes
    Tenant ||--o{ OnboardingPlan : registers
    Tenant ||--o{ Document : stores
    Tenant ||--o{ PayrollCycle : processes
    Tenant ||--o{ BenefitEnrollment : covers
    Tenant ||--o{ SupportCase : opens
    Tenant ||--o{ AuditLog : audits

    User ||--o{ Document : uploads
    User ||--o{ SupportCase : submits
    User ||--o{ SupportCaseComment : authors
    User ||--o{ AuditLog : acts

    Company ||--o{ Worker : employs
    Company ||--o{ PayrollCycle : runs
    Company ||--o{ SupportCase : files

    Worker ||--o{ EmploymentContract : signs
    Worker ||--o{ OnboardingPlan : undergoes
    Worker ||--o{ Document : submits
    Worker ||--o{ PayrollItem : paid
    Worker ||--o{ BenefitEnrollment : enrolled
    Worker ||--o{ SupportCase : opens

    Country ||--o{ ComplianceRequirement : defines
    Country ||--o{ EmploymentContract : configures
    Country ||--o{ PayrollCycle : restricts

    OnboardingPlan ||--o{ OnboardingTask : tracks
    PayrollCycle ||--o{ PayrollItem : details
    SupportCase ||--o{ SupportCaseComment : lists
```

---

## Core Entities Glossary

### 1. Multi-Tenant Context
* **Tenant**: The primary billing account separating workspaces (e.g., `ACME Corp` vs. `Stark Industries`). Every client record belongs to a tenant.
* **User**: Represents physical individuals. Contains names, hashed passwords, roles, and user statuses.

### 2. Employment Context
* **Company**: The client entity operating in a specific headquarters country.
* **Worker**: Profiles detailing names, department, start dates, and managers. Can be linked to a `User` account for logging in.
* **Country**: Static database of regional codes (e.g. US, GB, DE) detailing payroll frequencies and contract requirement rules.
* **ComplianceRequirement**: Regulatory mandates per country (e.g. passport checks or W-4 forms) used to generate onboarding tasks.
* **EmploymentContract**: The binding agreement detailing monthly compensation, currency code, and type (Full-time, contractor, etc.).

### 3. Onboarding & Verification
* **OnboardingPlan**: Main checklist overview tracking employee onboarding.
* **OnboardingTask**: Individual checklist tasks. Map requirement types and assign to roles (e.g. document uploads assigned to Worker).
* **Document**: Metadata tracks submitted files, statuses (Pending, Approved, Rejected), and rejection reasons.

### 4. Payroll & Welfare
* **PayrollCycle**: Grouping pay periods for an employer and country.
* **PayrollItem**: Individual paychecks detail gross earnings, currencies, and item status (Pending, Approved, Held, Paid).
* **BenefitEnrollment**: Tracks eligibility and enrollment in health, dental, or retirement benefits.

### 5. Support & Trace
* **SupportCase**: Support inquiries categorized by priority and department.
* **SupportCaseComment**: Conversation logs. Can be toggled `isInternal` to hide operational notes from clients.
* **AuditLog**: Unified operational logbook recording actor ID, actions, modified entities, and modified metadata.
