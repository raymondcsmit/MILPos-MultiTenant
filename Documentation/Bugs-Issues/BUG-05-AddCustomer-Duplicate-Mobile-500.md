# Defect Report: BUG-05 (N-29)

**Bug ID:** BUG-05  
**Legacy Reference:** N-29 / TC-D08.005  
**Component:** Backend MediatR & DB (`SourceCode/SQLAPI/POS.MediatR/Customer/Handlers/AddCustomerCommandHandler.cs`)  
**Module:** Customer Relationship Management (CRM)  
**Severity:** **HIGH**  
**Reproducible:** 100% Deterministic  

---

## 1. Description & Impact

The database table `Customers` has a unique composite index on `(TenantId, MobileNo)` to enforce unique mobile numbers per tenant.
However, when `AddCustomerCommandHandler` handles a customer creation request where `MobileNo` already exists, it does not check for mobile number uniqueness before calling `SaveAsync()`.
As a result:
- The database throws `Microsoft.Data.Sqlite.SqliteException: SQLite Error 19: 'UNIQUE constraint failed: Customers.TenantId, Customers.MobileNo'`.
- The exception is unhandled and bubbles up as an **HTTP 500 Internal Server Error**.
- The API consumer receives a generic server error instead of an informative HTTP 409 Conflict or HTTP 422 Unprocessable Entity specifying `"A customer with this mobile number already exists."`.

---

## 2. Root Cause Analysis

In `AddCustomerCommandHandler.cs` and `AddCustomerCommandValidator.cs`:
Uniqueness validation was implemented only for customer name, or not checking `mobileNo` uniqueness within the tenant scope.
```csharp
// Missing:
var mobileExists = await _customerRepository.All.AnyAsync(c => c.MobileNo == request.MobileNo);
if (mobileExists)
{
    return ServiceResponse<CustomerDto>.Return409("Customer with this mobile number already exists.");
}
```

---

## 3. Remediation Plan

1. In `AddCustomerCommandHandler.cs`:
   - Check if `!string.IsNullOrWhiteSpace(request.MobileNo)` and `_customerRepository.All.AnyAsync(c => c.MobileNo == request.MobileNo)`.
   - If true, return `ServiceResponse<CustomerDto>.Return409("Customer with this mobile number already exists.")` or `Return422(...)`.
2. Similarly guard in `UpdateCustomerCommandHandler.cs` (excluding current customer id).
3. Write unit and integration tests verifying HTTP 409/422 response instead of HTTP 500.
