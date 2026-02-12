# Identity Refactor - TenantRegistrationService

## Overview
Refactor the admin user creation logic in `TenantRegistrationService` to use ASP.NET Core's `UserManager<User>` instead of manual `DbContext` operations and `IPasswordHasher`. This ensures consistent application of identity rules, normalization, and secure password management.

## Proposed Changes

### [POS.Repository](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Repository)

#### [MODIFY] [TenantRegistrationService.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Repository/Tenant/TenantRegistrationService.cs)
- Replace `IPasswordHasher<User>` dependency with `UserManager<User>`.
- Update `RegisterTenantAsync` to use `_userManager.CreateAsync` for creating the admin user.
- Remove manual normalization and password hashing logic.

## Verification Plan

### Automated Tests
- Run tenant registration flow via API and ensure:
  - Tenant is created successfully.
  - Admin user is created successfully with correct roles and password.
  - User can login with the provided credentials.

### Manual Verification
- Check the `AspNetUsers` table to verify:
  - `NormalizedEmail` and `NormalizedUserName` are correctly set by Identity.
  - `PasswordHash` is valid.
  - `SecurityStamp` and `ConcurrencyStamp` are populated.
