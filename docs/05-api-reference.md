# API Reference - GlobalWorkforce OS

The GlobalWorkforce OS API is structured as a RESTful web service. All endpoints require standard JWT authentication Bearer headers unless marked as public.

---

## Authentication Endpoints

### 1. User Login
* **Method & Path**: `POST /api/auth/login`
* **Access**: Public
* **Request Body**:
  ```json
  {
    "email": "ops@example.com",
    "password": "Password123!"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "accessToken": "eyJhbGciOi...",
    "user": {
      "id": "e30e12ba-...",
      "email": "ops@example.com",
      "role": "INTERNAL_OPS",
      "tenantId": null,
      "tenantName": null,
      "workerId": null,
      "firstName": "Sarah",
      "lastName": "Ops"
    }
  }
  ```

### 2. Verify Session
* **Method & Path**: `GET /api/auth/me`
* **Access**: Authenticated
* **Success Response (200 OK)**: Returns the decoded user session profile details.

---

## Companies & Workers Endpoints

### 1. List Companies
* **Method & Path**: `GET /api/companies`
* **Access**: Admins & HR (Tenant filtered for client users)

### 2. Create Company
* **Method & Path**: `POST /api/companies`
* **Access**: Admins
* **Request Body**:
  ```json
  {
    "name": "Acme Software",
    "legalName": "Acme Software Inc.",
    "industry": "Technology",
    "headquartersCountry": "US",
    "primaryContactName": "Thomas Acme",
    "primaryContactEmail": "thomas@acme.com"
  }
  ```

### 3. List Workers
* **Method & Path**: `GET /api/workers`
* **Access**: Admins & HR (Tenant filtered; Workers blocked)

### 4. Update Worker Status (Transition)
* **Method & Path**: `PATCH /api/workers/:id/status`
* **Access**: Admins
* **Request Body**:
  ```json
  {
    "status": "ACTIVE",
    "overrideReason": "Onboarding document review complete via local agency validation"
  }
  ```

---

## Compliance & Documents Endpoints

### 1. Submit Compliance Document
* **Method & Path**: `POST /api/documents`
* **Access**: Workers & Client HR
* **Request Body**:
  ```json
  {
    "documentType": "PASSPORT",
    "fileName": "passport_john_doe.pdf",
    "fileUrl": "/uploads/acme-corp/worker-1/passport.pdf"
  }
  ```

### 2. Approve Document
* **Method & Path**: `PATCH /api/documents/:id/approve`
* **Access**: Platform Admins & Internal Ops only
* **Impact**: Automatically marks corresponding worker onboarding tasks as `DONE` and checks if onboarding plan is fully completed.

### 3. Reject Document
* **Method & Path**: `PATCH /api/documents/:id/reject`
* **Access**: Platform Admins & Internal Ops only
* **Request Body**:
  ```json
  {
    "rejectionReason": "Uploaded image is blurry and photocopy is illegible"
  }
  ```

---

## Support Cases Endpoints

### 1. Submit Ticket
* **Method & Path**: `POST /api/support-cases`
* **Access**: Authenticated (Workers and Client HR)
* **Request Body**:
  ```json
  {
    "category": "PAYROLL",
    "priority": "HIGH",
    "subject": "Missing semi-monthly deposit cycle",
    "description": "I have not received the bank transfer corresponding to period May 1-15."
  }
  ```

### 2. Post Ticket Comment
* **Method & Path**: `POST /api/support-cases/:id/comments`
* **Access**: Ticket members & Operations
* **Request Body**:
  ```json
  {
    "body": "Re-routing this payroll transaction via secondary bank partner to expedite settlement.",
    "isInternal": true
  }
  ```
* **Note**: `isInternal` is forced to `false` for non-operations roles (Workers/Clients).
