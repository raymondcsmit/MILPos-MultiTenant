# BUG-15: `UpdateRoleCommandHandler` Throws NullReferenceException on Unknown Role ID (HTTP 500 Crash)

**Defect ID:** BUG-15 (`N-08` / `IDENTITY-01`)  
**Severity:** 🟠 High  
**Subsystem:** Identity & Role Management (`POS.MediatR` / `POS.API`)  
**Status:** **FIXED & VERIFIED**  
**Root Cause File:** [`SourceCode/SQLAPI/POS.MediatR/Role/Handlers/UpdateRoleCommandHandler.cs`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/Role/Handlers/UpdateRoleCommandHandler.cs#L70-L75)  

---

## 1. Description & Reproduction

When an administrator calls `PUT /api/Role/{id}` with a non-existent role ID (or deleted role), the handler searches for the role:
```csharp
entityExist = await _roleRepository.FindByInclude(v => v.Id == request.Id, c => c.RoleClaims).FirstOrDefaultAsync();

if (entityExist.IsSuperRole) // <--- NullReferenceException!
```
If the role is not found, `entityExist` evaluates to `null`. Attempting to access property `.IsSuperRole` on `null` throws a `NullReferenceException`, which unhandled bubbled up as an `HTTP 500 Internal Server Error` instead of a graceful `HTTP 404 Not Found`.

### Reproduction Payload:
- **PUT** `/api/Role/00000000-0000-0000-0000-000000009999`
- **Headers:** `Authorization: Bearer {{admin_token}}`
- **Body:**
```json
{
  "id": "00000000-0000-0000-0000-000000009999",
  "name": "NonExistentRole",
  "roleClaims": []
}
```
- **Prior Response:** `HTTP 500 Internal Server Error` with `NullReferenceException: Object reference not set to an instance of an object.`

---

## 2. Root Cause Analysis

`UpdateRoleCommandHandler` checked for name duplication across other IDs first, but failed to guard against `null` when retrieving the targeted entity by its ID before evaluating `.IsSuperRole`. In contrast, `DeleteRoleCommandHandler` properly included `if (entityExist == null) return ServiceResponse<RoleDto>.Return404();`.

---

## 3. Remediation

In `UpdateRoleCommandHandler.cs`:
```csharp
entityExist = await _roleRepository.FindByInclude(v => v.Id == request.Id, c => c.RoleClaims).FirstOrDefaultAsync();
if (entityExist == null)
{
    _logger.LogError("Role not found.");
    return ServiceResponse<RoleDto>.Return404("Role not found.");
}
```

---

## 4. Verification

- **Automated Integration Test:** `RoleUpdateUnknownIdTests.Should_Return404_When_UpdatingNonExistentRole_GapTargetFixed`
- **Result:** **PASSED** (returns `HTTP 404 Not Found`).
