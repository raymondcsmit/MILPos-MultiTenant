# User & Role Management - Comprehensive Test Suite

## 1. Test Objectives & Scope
**Module**: User_Role_Management
**Description**: Handles user authentication, role-based access control (RBAC), and JWT token generation.
**Objective**: Ensure complete end-to-end reliability, data integrity, and UI/UX correctness for all features within this module.

## 2. Test Data Sets
This module requires specific data setups before execution.

### 2.1 Normal Operations
* **Data**: Valid email, standard strong password.
* **Purpose**: Verify standard "happy path" workflows.

### 2.2 Boundary Conditions
* **Data**: Password with exactly 8 characters.
* **Purpose**: Verify system stability at the absolute limits of acceptable input.

### 2.3 Error Scenarios & Edge Cases
* **Data**: Incorrect password, non-existent email, locked account. | User assigned to a role that has been deleted concurrently.
* **Purpose**: Ensure the system gracefully handles invalid states, rejects bad data with standard `ApiResponse`, and maintains ACID properties.

---

## 3. Unit Tests (White-Box)
*Validates internal logic, isolated methods, utility calculations, and specific code paths without database access.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| USR-UT-01 | Validate Password Hash matching | Input correct plaintext password against stored hash | Validation passes, true returned | [ ] | [ ] |
| USR-UT-02 | Validate JWT Token Generation | Provide User entity with 3 specific claims | JWT token generated containing exactly those 3 claims | [ ] | [ ] |

## 4. Integration Tests (White-Box / Black-Box)
*Verifies interaction between API Controllers, MediatR Handlers, EF Core Repositories, and the underlying Database.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| USR-IT-01 | Verify Role Permission assignment | Assign 'View Products' permission to 'Cashier' role, authenticate as Cashier | API allows access to GET /products, denies POST /products | [ ] | [ ] |
| USR-IT-02 | Verify Login API | Send POST /login with valid seeded credentials | 200 OK with valid Bearer Token and User Profile | [ ] | [ ] |

## 5. System Tests (Black-Box / End-to-End)
*Examines application flows from a strictly end-user perspective via the Angular Frontend or Postman API calls.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| USR-BB-01 | UI Login Flow | Enter valid email and password on /login, click Login | Redirect to /dashboard, User name displayed in top right | [ ] | [ ] |
| USR-BB-02 | UI Role Creation | Navigate to Roles -> Add, select 5 permissions, save | Role appears in table, permissions correctly assigned in DB | [ ] | [ ] |

## 6. Internal Logic Tests (White-Box)
*Deep-dive validation of transaction scopes, concurrency, security policies, and architectural constraints.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| USR-WB-01 | Validate API Authorization Middleware | Hit an [Authorize] endpoint without a token | Middleware intercepts and returns 401 Unauthorized before Controller execution | [ ] | [ ] |
| USR-WB-02 | Validate TenantId filtering on Users | Query Users table as Tenant A | Global query filter automatically excludes Tenant B users | [ ] | [ ] |
