# Sales Person & Dedicated Regions - Enhanced End-to-End Test Suite

## 1. Module Overview
**Description:** Handles the new "On Behalf Of" tracking, allowing Admins to attribute sales and purchases to specific Sales Persons, while strictly enforcing data isolation so Sales Persons can only manage and view their own customers and transactions within their dedicated regions.

> **Note for Junior Testers:** The test cases below provide concrete, step-by-step instructions. Please read the "Domain Context" to understand *why* we test this feature, and strictly follow the exact values provided in "Test Data".

---

## 2. Test Data Sets
This module requires specific data setups before execution.

### 2.1 Normal Operations
* **Data:** Admin User (`admin@testmart.com`), Sales Person User (`michael.scott@testmart.com`), Customer A (Assigned to Michael), Customer B (Unassigned).
* **Purpose:** Verify standard "happy path" workflows for both roles.

### 2.2 Boundary Conditions
* **Data:** A Sales Person who has zero `LocationIds` assigned in their profile but still attempts to create a transaction.
* **Purpose:** Verify system stability at the absolute limits of acceptable input and ensure the proxy logic (`LocationIds != null && LocationIds.Any()`) behaves correctly.

### 2.3 Error Scenarios & Edge Cases
* **Data:** Sales Person maliciously modifies the frontend HTTP request payload to send a `SalesPersonId` belonging to another rep (e.g., `Jim Halpert's ID`).
* **Purpose:** Ensure the backend gracefully intercepts and overrides the spoofed ID, maintaining data integrity.

---

## 3. Unit Tests (White-Box)
*Validates internal logic, isolated methods, utility calculations, and specific code paths without database access.*

### Test Case: SPI-UT-01 - Validate DTO Mapping for SalesPersonId
**Test Type:** Unit Test (White-Box)

#### 🧠 Domain Context for Junior Testers
The system transfers data between the database (Entities) and the frontend (DTOs). If we add a new field like `SalesPersonId`, we must prove that AutoMapper correctly copies this data back and forth without losing it.

#### 🛠 Preconditions
- AutoMapper profiles are configured in the test setup.

#### 📦 Test Data (Concrete Input Values)
- **Source Entity:** `SalesOrder` with `SalesPersonId = "a1b2c3d4-..."`

#### 🚀 Step-by-Step Execution
1. Run the unit test `Validate_SalesOrder_Maps_SalesPersonId`.
2. Pass the mocked `SalesOrder` entity to `_mapper.Map<SalesOrderDto>()`.

#### ✅ Expected Results
- The resulting DTO contains the exact same `SalesPersonId`.

#### 🔍 Post-Execution Verification Criteria
- The test asserts `Assert.Equal(entity.SalesPersonId, dto.SalesPersonId)`.

---

### Test Case: SPI-UT-02 - Validate Entity Framework Schema Update
**Test Type:** Unit Test (White-Box)

#### 🧠 Domain Context for Junior Testers
When we add new relationships (like linking a Customer to a Sales Person), the database must enforce "Foreign Keys". This test proves the EF Core model is configured correctly.

#### 🛠 Preconditions
- EF Core In-Memory database initialized.

#### 📦 Test Data (Concrete Input Values)
- **Entity:** `Customer`

#### 🚀 Step-by-Step Execution
1. Run the unit test `Validate_Customer_Has_SalesPerson_ForeignKey`.
2. Use EF Core reflection to inspect the `Customer` entity metadata.

#### ✅ Expected Results
- The metadata confirms a Foreign Key relationship exists between `Customer.SalesPersonId` and `User.Id`.

#### 🔍 Post-Execution Verification Criteria
- The test passes successfully without migration errors.

---

## 4. Integration Tests (White-Box / Black-Box)
*Verifies interaction between API Controllers, MediatR Handlers, EF Core Repositories, and the underlying Database.*

### Test Case: SPI-IT-01 - Verify Customer Data Isolation (GetCustomersQuery)
**Test Type:** Integration Test

#### 🧠 Domain Context for Junior Testers
A Sales Person should never be able to steal or view another Sales Person's clients. The backend must automatically filter the customer list based on who is logged in.

#### 🛠 Preconditions
- Database seeded with:
  - Customer 1 (Assigned to Michael)
  - Customer 2 (Assigned to Jim)
  - Customer 3 (Unassigned, Admin created)

#### 📦 Test Data (Concrete Input Values)
- **Logged in User:** `michael.scott@testmart.com` (Role: Sales Person, ID: `Guid-Michael`)

#### 🚀 Step-by-Step Execution
1. Run integration test `Verify_GetCustomers_FiltersBySalesPerson`.
2. Send a GET request to `/api/customers` using Michael's JWT token.

#### ✅ Expected Results
- The API returns `200 OK`.
- The JSON response array contains exactly 1 customer (Customer 1).

#### 🔍 Post-Execution Verification Criteria
- Run a second request using the Admin's JWT token. Verify the Admin receives all 3 customers.

---

### Test Case: SPI-IT-02 - Verify Anti-Spoofing on Order Creation
**Test Type:** Integration Test

#### 🧠 Domain Context for Junior Testers
If a Sales Person is tech-savvy, they might try to send an API request pretending to be someone else to inflate their colleague's numbers or hide a bad sale. The backend must ignore their requested ID and force it to their real ID.

#### 🛠 Preconditions
- Test database running.

#### 📦 Test Data (Concrete Input Values)
- **Logged in User:** Michael Scott (Sales Person)
- **Payload:** `{"customerId": "...", "salesPersonId": "Guid-Jim", "totalAmount": 100}`

#### 🚀 Step-by-Step Execution
1. Run integration test `Verify_AddSalesOrder_OverridesSpoofedId`.
2. Send POST request to `/api/salesOrder` with the malicious payload.

#### ✅ Expected Results
- The API returns `200 OK` (the order succeeds, but the data is corrected).

#### 🔍 Post-Execution Verification Criteria
- Query the `SalesOrders` table in the test database. Assert that `SalesPersonId` equals `Guid-Michael`, entirely ignoring the `Guid-Jim` from the payload.

---

## 5. System Tests (Black-Box / End-to-End)
*Examines application flows from a strictly end-user perspective via the Angular Frontend or Postman API calls.*

### Test Case: SPI-BB-01 - Admin creates POS Sale "On Behalf Of"
**Test Type:** System Test (Black-Box)

#### 🧠 Domain Context for Junior Testers
Sometimes a Sales Person is out in the field without internet, so they call the main office. The Admin enters the sale for them, explicitly selecting the Sales Person from a dropdown so they get the commission.

#### 🛠 Preconditions
- Logged into Angular UI as `admin@testmart.com`.
- 'Michael Scott' exists as a Sales Person.

#### 📦 Test Data (Concrete Input Values)
- **Product:** `Laptop` ($500)
- **Credit Sale To:** `Michael Scott`

#### 🚀 Step-by-Step Execution
1. Navigate to the POS screen.
2. Add a `Laptop` to the cart.
3. Click `Pay`.
4. In the "Credit Sale To" dropdown, select `Michael Scott`.
5. Complete the sale with Cash.

#### ✅ Expected Results
- The sale completes successfully and a receipt is generated.

#### 🔍 Post-Execution Verification Criteria
- Navigate to the "Sales by Sales Person" report. Verify Michael Scott's Total Sales increased by $500.

---

### Test Case: SPI-BB-02 - Sales Person creates Customer (UI Lock)
**Test Type:** System Test (Black-Box)

#### 🧠 Domain Context for Junior Testers
When a Sales Person creates a new customer profile, the system shouldn't even give them the option to assign the customer to someone else. The dropdown must be locked.

#### 🛠 Preconditions
- Logged into Angular UI as `michael.scott@testmart.com`.

#### 📦 Test Data (Concrete Input Values)
- **Customer Name:** `Dunder Mifflin Scranton`

#### 🚀 Step-by-Step Execution
1. Navigate to Customers -> Add Customer.
2. Look at the "Assigned Sales Rep" dropdown in the Territory section.

#### ✅ Expected Results
- The dropdown displays "Michael Scott".
- The dropdown is greyed out (disabled) and cannot be clicked or changed.

#### 🔍 Post-Execution Verification Criteria
- Fill out the rest of the form and click Save. Verify the customer appears in the list.

---

## 6. Internal Logic Tests (White-Box)
*Deep-dive validation of transaction scopes, concurrency, security policies, and architectural constraints.*

### Test Case: SPI-WB-01 - Validate UserInfoToken Location Proxy Logic
**Test Type:** Internal Logic Test (White-Box)

#### 🧠 Domain Context for Junior Testers
Instead of checking string names like `Role == "Sales Person"` (which can break if a tenant renames their roles), our backend checks if the user has `LocationIds` assigned. If they do, they are considered a restricted user.

#### 🛠 Preconditions
- `UserInfoToken` is mocked.

#### 📦 Test Data (Concrete Input Values)
- **Token State 1:** `LocationIds = [Guid-A, Guid-B]`
- **Token State 2:** `LocationIds = null` or `[]`

#### 🚀 Step-by-Step Execution
1. Execute `Validate_LocationProxy_IdentifiesRestrictedUser`.
2. Pass Token State 1 to `AddPurchaseOrderCommandHandler`.
3. Pass Token State 2 to `AddPurchaseOrderCommandHandler`.

#### ✅ Expected Results
- State 1 triggers the restricted logic (`isRestrictedUser = true`), forcing the ID override.
- State 2 triggers the Admin logic (`isRestrictedUser = false`), accepting the payload ID.

#### 🔍 Post-Execution Verification Criteria
- Test passes, proving the dynamic proxy logic works independently of hardcoded role names.