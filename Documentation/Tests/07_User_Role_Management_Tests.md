# User & Role Management - Enhanced End-to-End Test Suite

## 1. Module Overview
**Description:** Handles user authentication, role-based access control (RBAC), and JWT token generation.

> **Note for Junior Testers:** The test cases below provide concrete, step-by-step instructions. Please read the "Domain Context" to understand *why* we test this feature, and strictly follow the exact values provided in "Test Data".

---

### Test Case: USR-BB-01 - UI Login Flow
**Test Type:** System Test (Black-Box)

#### 🧠 Domain Context for Junior Testers
Users must securely log into the system to perform any action. Their session is managed by a temporary digital 'token'.

#### 🛠 Preconditions
- Frontend running at `http://localhost:4200`.
- Valid user exists: `admin@testmart.com`.

#### 📦 Test Data (Concrete Input Values)
- **Email:** `admin@testmart.com`
- **Password:** `Password123!`

#### 🚀 Step-by-Step Execution
1. Open browser to `/login`.
2. Enter the Email and Password exactly.
3. Click 'Login'.

#### ✅ Expected Results
- Redirects to the `/dashboard`.
- The user's name is visible in the top-right header menu.

#### 🔍 Post-Execution Verification Criteria
- Open Chrome DevTools (F12) -> Application -> Local Storage. Verify a `bearerToken` string is present.

### Test Case: USR-BB-02 - UI Role Creation
**Test Type:** System Test (Black-Box)

#### 🧠 Domain Context for Junior Testers
Role-Based Access Control (RBAC) allows Admins to create custom job titles (like 'Junior Cashier') and restrict what screens they can see.

#### 🛠 Preconditions
- Logged in as Admin.

#### 📦 Test Data (Concrete Input Values)
- **Role Name:** `Junior Cashier`
- **Permissions:** `View POS`, `Add POS Sale` (Only 2 checkboxes).

#### 🚀 Step-by-Step Execution
1. Navigate to 'Settings -> Roles'.
2. Click 'Add Role'.
3. Enter `Junior Cashier` as the name.
4. Check ONLY the `View POS` and `Add POS Sale` boxes.
5. Click 'Save'.

#### ✅ Expected Results
- The new role appears in the list.

#### 🔍 Post-Execution Verification Criteria
- Create a new user, assign them this role, and log in as them. Verify they cannot see the 'Settings' or 'Reports' menus.

### Test Case: USR-IT-01 - Verify Role Permission assignment in API
**Test Type:** Integration Test

#### 🧠 Domain Context for Junior Testers
Even if a user hacks the frontend to show a hidden button, the backend API must physically block them from accessing unauthorized data.

#### 🛠 Preconditions
- A user exists with a role that LACKS the `Delete Product` permission.

#### 📦 Test Data (Concrete Input Values)
- **Action:** DELETE `/api/products/GUID-123`

#### 🚀 Step-by-Step Execution
1. Run `Verify_UnauthorizedUser_Gets403`.
2. Inject the user's JWT token.
3. Send the DELETE request.

#### ✅ Expected Results
- The API returns a `403 Forbidden` status code.

#### 🔍 Post-Execution Verification Criteria
- Query the DB to ensure the product was NOT deleted.

### Test Case: USR-IT-02 - Verify Login API
**Test Type:** Integration Test

#### 🧠 Domain Context for Junior Testers
The `/api/auth/login` endpoint is the gateway to the app. It must return a valid token if credentials match.

#### 🛠 Preconditions
- Test database running.

#### 📦 Test Data (Concrete Input Values)
- **Payload:** Valid seeded email and password.

#### 🚀 Step-by-Step Execution
1. Run `Verify_Login_ReturnsJwtToken`.
2. Send POST to `/api/auth/login`.

#### ✅ Expected Results
- 200 OK. The JSON body contains a `token` string and the user's profile details.

#### 🔍 Post-Execution Verification Criteria
- Ensure the returned token can successfully authorize a subsequent GET request to `/api/dashboard`.

### Test Case: USR-UT-01 - Validate Password Hash matching
**Test Type:** Unit Test (White-Box)

#### 🧠 Domain Context for Junior Testers
We never store plain-text passwords. We store encrypted 'hashes'. The system must correctly verify if an inputted password matches the stored hash.

#### 🛠 Preconditions
- Mocked `UserManager` with a pre-hashed version of 'Password123!'.

#### 📦 Test Data (Concrete Input Values)
- **Input Password:** `Password123!`

#### 🚀 Step-by-Step Execution
1. Run `Validate_PasswordHasher_ReturnsTrueOnMatch`.
2. Call the hasher's verification method.

#### ✅ Expected Results
- The method returns `PasswordVerificationResult.Success`.

#### 🔍 Post-Execution Verification Criteria
- Run a secondary test with 'password123!' (lowercase). Verify it strictly returns `Failed`.

### Test Case: USR-UT-02 - Validate JWT Token Generation
**Test Type:** Unit Test (White-Box)

#### 🧠 Domain Context for Junior Testers
The JWT Token acts as a digital ID card. It must contain 'claims' like the user's ID, their Tenant ID, and their permissions.

#### 🛠 Preconditions
- JWT secret key configured in test appsettings.

#### 📦 Test Data (Concrete Input Values)
- **User Claims:** UserId, TenantId, Email

#### 🚀 Step-by-Step Execution
1. Run `Validate_JwtService_EmbedsClaims`.
2. Call `GenerateTokenAsync`.

#### ✅ Expected Results
- A long encoded string is returned.

#### 🔍 Post-Execution Verification Criteria
- Decode the string in the test. Assert that the `TenantId` claim is present and matches the user's real TenantId.

### Test Case: USR-WB-01 - Validate API Authorization Middleware
**Test Type:** Internal Logic Test (White-Box)

#### 🧠 Domain Context for Junior Testers
Any endpoint marked with `[Authorize]` must bounce unauthenticated users immediately, before running any expensive database queries.

#### 🛠 Preconditions
- Controller endpoint marked with `[Authorize]`.

#### 📦 Test Data (Concrete Input Values)
- **Header:** No `Authorization` header provided.

#### 🚀 Step-by-Step Execution
1. Run `Validate_NoToken_Returns401`.
2. Hit the endpoint.

#### ✅ Expected Results
- The request is intercepted by the ASP.NET pipeline and returns `401 Unauthorized`.

#### 🔍 Post-Execution Verification Criteria
- Assert that the Controller's internal code was never executed (using a mock counter).

### Test Case: USR-WB-02 - Validate TenantId filtering on Users
**Test Type:** Internal Logic Test (White-Box)

#### 🧠 Domain Context for Junior Testers
A tenant admin should only be able to see the cashiers and managers working for THEIR specific company, not globally.

#### 🛠 Preconditions
- EF Core Interceptors active.

#### 📦 Test Data (Concrete Input Values)
- **Query:** `context.Users.ToList()`

#### 🚀 Step-by-Step Execution
1. Run `Validate_UserQuery_AppliesTenantFilter`.
2. Authenticate as Tenant A.

#### ✅ Expected Results
- The intercepted SQL contains `WHERE TenantId = @__tenantId`.

#### 🔍 Post-Execution Verification Criteria
- Assert that users belonging to Tenant B are mathematically excluded from the result set.

