# Tenant Management & Licensing - Enhanced End-to-End Test Suite

## 1. Module Overview
**Description:** Handles tenant registration, licensing limits, domain isolation, and tenant activation/deactivation.

> **Note for Junior Testers:** The test cases below provide concrete, step-by-step instructions. Please read the "Domain Context" to understand *why* we test this feature, and strictly follow the exact values provided in "Test Data".

---

### Test Case: TEN-BB-01 - End-user UI Tenant Registration
**Test Type:** System Test (Black-Box)

#### 🧠 Domain Context for Junior Testers
A 'Tenant' represents a distinct business using our Point of Sale system. Registering a tenant creates a completely isolated database workspace for that business.

#### 🛠 Preconditions
- Angular frontend running at `http://localhost:4200`.
- .NET API backend running at `http://localhost:5000`.
- Database is accessible.

#### 📦 Test Data (Concrete Input Values)
- **Company Name:** `TestMart Inc.`
- **Email:** `admin@testmart.com`
- **Password:** `Password123!`

#### 🚀 Step-by-Step Execution
1. Open Google Chrome and navigate to `http://localhost:4200/register`.
2. Type `TestMart Inc.` into the Company Name field.
3. Type `admin@testmart.com` into the Email field.
4. Type `Password123!` into the Password field.
5. Click the primary 'Register' button.

#### ✅ Expected Results
- A green success toast notification appears reading 'Registration Successful'.
- The browser automatically redirects to the `/login` page.

#### 🔍 Post-Execution Verification Criteria
- **Database:** Open SQL database, query `Tenants` table, verify a row exists with name 'TestMart Inc.'.
- **Login:** Attempt to log in with the new credentials; it should succeed.

### Test Case: TEN-BB-02 - Admin toggles Tenant Status
**Test Type:** System Test (Black-Box)

#### 🧠 Domain Context for Junior Testers
SuperAdmins can deactivate a tenant if they fail to pay their subscription. Deactivated tenants cannot log into the system.

#### 🛠 Preconditions
- Logged in as a SuperAdmin.
- A tenant named 'TestMart Inc.' already exists.

#### 📦 Test Data (Concrete Input Values)
- **Target Tenant:** `TestMart Inc.`
- **Action:** Deactivate

#### 🚀 Step-by-Step Execution
1. Navigate to the 'Tenants' management dashboard.
2. Locate 'TestMart Inc.' in the data table.
3. Click the 'Deactivate' toggle switch.
4. Confirm the prompt popup.

#### ✅ Expected Results
- Status badge changes from Green (Active) to Red (Inactive).
- A success message appears.

#### 🔍 Post-Execution Verification Criteria
- Attempt to log in as `admin@testmart.com`. The system must reject the login with an 'Account Suspended' error.

### Test Case: TEN-IT-01 - Verify Tenant registration writes to DB and seeds default data
**Test Type:** Integration Test

#### 🧠 Domain Context for Junior Testers
When a tenant is created, the system must automatically generate default roles (like 'Admin' and 'Cashier') and a default user account for them.

#### 🛠 Preconditions
- Integration test environment configured with an in-memory or SQLite database.

#### 📦 Test Data (Concrete Input Values)
- **JSON Payload:** `{"companyName": "ApiTest", "email": "api@test.com", "password": "Pass123!"}`

#### 🚀 Step-by-Step Execution
1. Run the integration test suite command: `dotnet test --filter FullyQualifiedName~TEN-IT-01`.
2. The test sends a POST request to `/api/tenants`.

#### ✅ Expected Results
- The API returns a 200 OK HTTP status code.

#### 🔍 Post-Execution Verification Criteria
- Test assertions verify that `DbContext.Users` contains exactly 1 user for this tenant.
- `DbContext.Roles` contains default seeded roles.

### Test Case: TEN-IT-02 - Verify cross-tenant data isolation
**Test Type:** Integration Test

#### 🧠 Domain Context for Junior Testers
Data leakage is a critical security flaw. If Tenant A queries products, they must never see Tenant B's products.

#### 🛠 Preconditions
- Database contains 5 products for Tenant A and 3 products for Tenant B.

#### 📦 Test Data (Concrete Input Values)
- **Tenant A Token:** Valid JWT token for Tenant A.

#### 🚀 Step-by-Step Execution
1. Execute the integration test `Verify_Tenant_Isolation`.
2. The test injects Tenant A's token into the HTTP header.
3. The test sends a GET request to `/api/products`.

#### ✅ Expected Results
- The API returns exactly 5 products.

#### 🔍 Post-Execution Verification Criteria
- Assert that none of the returned products belong to Tenant B.

### Test Case: TEN-UT-01 - Validate RegisterTenantCommand handler ensures unique tenant email
**Test Type:** Unit Test (White-Box)

#### 🧠 Domain Context for Junior Testers
We cannot allow two companies to register with the exact same admin email address to prevent login conflicts.

#### 🛠 Preconditions
- Visual Studio or .NET CLI is open.
- Unit test project is built.

#### 📦 Test Data (Concrete Input Values)
- **Email:** `duplicate@company.com`

#### 🚀 Step-by-Step Execution
1. Run unit test `Validate_DuplicateEmail_ReturnsConflict`.
2. The test mocks the database to simulate an existing email.

#### ✅ Expected Results
- The MediatR handler immediately returns a `409 Conflict` ServiceResponse.

#### 🔍 Post-Execution Verification Criteria
- The test runner displays a green checkmark indicating the logic caught the duplicate.

### Test Case: TEN-UT-02 - Validate License limit enforcement
**Test Type:** Unit Test (White-Box)

#### 🧠 Domain Context for Junior Testers
Software-as-a-Service (SaaS) relies on subscription tiers. If a tenant is on a 'Basic' plan limited to 5 users, they cannot add a 6th.

#### 🛠 Preconditions
- Mocked Tenant object with `MaxUsers = 5`.

#### 📦 Test Data (Concrete Input Values)
- **Current Users:** 5
- **Attempted Action:** Create new user

#### 🚀 Step-by-Step Execution
1. Run unit test `Validate_LicenseLimit_ThrowsError`.
2. The handler attempts to process the `CreateUserCommand`.

#### ✅ Expected Results
- The handler returns a `422 Unprocessable Entity` or throws a License Exceeded exception.

#### 🔍 Post-Execution Verification Criteria
- The test passes. The user count remains at 5.

### Test Case: TEN-WB-01 - Validate NLogCommandInterceptor applies TenantId to SQL
**Test Type:** Internal Logic Test (White-Box)

#### 🧠 Domain Context for Junior Testers
Entity Framework uses Global Query Filters to automatically append `WHERE TenantId = X` to all database queries. This test proves it happens.

#### 🛠 Preconditions
- EF Core Interceptors are active.

#### 📦 Test Data (Concrete Input Values)
- **Query:** `context.Products.ToList()`

#### 🚀 Step-by-Step Execution
1. Execute `Validate_EFCore_QueryFilter_AppliesTenantId` test.
2. The test captures the raw SQL string generated by EF Core.

#### ✅ Expected Results
- The intercepted SQL string contains the phrase `WHERE [p].[TenantId] = @__tenantId`.

#### 🔍 Post-Execution Verification Criteria
- Ensure no `NOLOCK` bypasses the tenant filter.

### Test Case: TEN-WB-02 - Validate UnitOfWork atomicity on Tenant Creation failure
**Test Type:** Internal Logic Test (White-Box)

#### 🧠 Domain Context for Junior Testers
If tenant creation fails halfway through (e.g., creating the tenant succeeds but creating the admin user fails), the entire process must roll back so we don't have broken 'orphan' tenants.

#### 🛠 Preconditions
- Mocked `UserManager` configured to throw an Exception on user creation.

#### 📦 Test Data (Concrete Input Values)
- **Valid Tenant Payload**

#### 🚀 Step-by-Step Execution
1. Execute `Validate_TenantRollback_OnUserFailure` test.
2. The test dispatches the `RegisterTenantCommand`.

#### ✅ Expected Results
- An exception is caught and the transaction is explicitly rolled back.

#### 🔍 Post-Execution Verification Criteria
- Assert that `DbContext.Tenants` count is 0 (the initial tenant insert was successfully rolled back).

