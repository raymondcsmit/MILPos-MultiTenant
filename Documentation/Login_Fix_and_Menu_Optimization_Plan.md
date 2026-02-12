# Implementation Plan - Fix SuperAdmin Login (Case Sensitivity)

## Goal
Resolve the **Login 401 Error** where SuperAdmin login fails due to case-sensitive username matching in PostgreSQL.

## Proposed Changes

### 1. Fix User Login (Case Sensitivity)
**File**: `UserLoginCommandHandler.cs` (`f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.MediatR\User\Handlers\UserLoginCommandHandler.cs`)

**Change**: Update the user lookup query to use `NormalizedUserName` and `NormalizedEmail` for case-insensitive matching.

```csharp
// Old
var user = await _userManager.Users.IgnoreQueryFilters()
    .FirstOrDefaultAsync(u => u.UserName == request.UserName || u.Email == request.UserName, cancellationToken);

// New
var user = await _userManager.Users.IgnoreQueryFilters()
    .FirstOrDefaultAsync(u => u.NormalizedUserName == request.UserName.ToUpper() 
                           || u.NormalizedEmail == request.UserName.ToUpper(), cancellationToken);
```

## Verification
1.  **Login**: Try logging in with `admin@gmail.com` (mixed case) or `Admin@gmail.com` and verify success.
