# Tenant Management & Licensing - Comprehensive Test Suite

## 1. Test Objectives & Scope
**Module**: Tenant_Management
**Description**: Handles tenant registration, licensing limits, domain isolation, and tenant activation/deactivation.
**Objective**: Ensure complete end-to-end reliability, data integrity, and UI/UX correctness for all features within this module.

## 2. Test Data Sets
This module requires specific data setups before execution.

### 2.1 Normal Operations
* **Data**: Valid email, standard plan, valid company name.
* **Purpose**: Verify standard "happy path" workflows.

### 2.2 Boundary Conditions
* **Data**: Company name with 100 characters, plan with 0 users (infinite).
* **Purpose**: Verify system stability at the absolute limits of acceptable input.

### 2.3 Error Scenarios & Edge Cases
* **Data**: Malformed email, missing password, duplicate tenant domain. | Two registrations hitting the API at the exact same millisecond with the same email.
* **Purpose**: Ensure the system gracefully handles invalid states, rejects bad data with standard `ApiResponse`, and maintains ACID properties.

---

## 3. Unit Tests (White-Box)
*Validates internal logic, isolated methods, utility calculations, and specific code paths without database access.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| TEN-UT-01 | Validate RegisterTenantCommand handler ensures unique tenant email | Mock repository to return existing email, dispatch command | ServiceResponse 409 Conflict returned | [ ] | [ ] |
| TEN-UT-02 | Validate License limit enforcement in CreateTenantCommand | Mock plan limits (e.g., max 5 users), attempt to create 6th user | License Exceeded Exception or 422 Error | [ ] | [ ] |

## 4. Integration Tests (White-Box / Black-Box)
*Verifies interaction between API Controllers, MediatR Handlers, EF Core Repositories, and the underlying Database.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| TEN-IT-01 | Verify Tenant registration writes to Db and seeds default data | Send POST /api/tenants with valid payload to test DB, assert Tenant and User table counts | Tenant created, Admin user seeded, Default Role seeded | [ ] | [ ] |
| TEN-IT-02 | Verify cross-tenant data isolation | Authenticate as Tenant A, query Products. Seed Products for Tenant B. | Only Tenant A's products returned. Zero intersection. | [ ] | [ ] |

## 5. System Tests (Black-Box / End-to-End)
*Examines application flows from a strictly end-user perspective via the Angular Frontend or Postman API calls.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| TEN-BB-01 | End-user UI Tenant Registration | Navigate to /register, fill form with valid data, click Submit | Redirected to login, success toast shown | [ ] | [ ] |
| TEN-BB-02 | Admin toggles Tenant Status | Login as SuperAdmin, navigate to Tenants, click Deactivate on Tenant A | Tenant A status changes to Inactive, Tenant A users cannot login | [ ] | [ ] |

## 6. Internal Logic Tests (White-Box)
*Deep-dive validation of transaction scopes, concurrency, security policies, and architectural constraints.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| TEN-WB-01 | Validate NLogCommandInterceptor applies TenantId to SQL Queries | Inspect intercepted DbCommand text during a MediatR query | SQL string contains 'WHERE TenantId = @__tenantId' | [ ] | [ ] |
| TEN-WB-02 | Validate UnitOfWork atomicity on Tenant Creation failure | Force an exception during User seeding phase of Tenant creation | Tenant record is rolled back, DB remains clean | [ ] | [ ] |
