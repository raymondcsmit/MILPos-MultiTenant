# Multi-Tenant Identity Index Fix - Work Document

## Overview
Resolved the `duplicate key value violates unique constraint "RoleNameIndex"` error by redefining the core Identity unique indexes to be tenant-aware. This allows multiple tenants to have common role names (like "Admin") and usernames while maintaining isolation.

## Changes Implemented

### [POS.Domain](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Domain)

#### [POSDbContext.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Domain/Context/POSDbContext.cs)
- **RoleNameIndex**: Redefined to use a composite unique index of `{ NormalizedName, TenantId }`. The default Identity index is explicitly removed from metadata to prevent name collisions.
- **UserNameIndex**: Redefined to use `{ NormalizedUserName, TenantId }` after removing the default.
- **EmailIndex**: Redefined to use `{ NormalizedEmail, TenantId }` after removing the default.

## Impact
- **Seeding**: Multiple tenants can now successfully seed the standard set of roles ("Admin", "SuperAdmin", etc.) without naming conflicts.
- **User Registration**: Tenants can now create users with common usernames/emails, provided they are unique within their own tenant scope.
- **Security**: Maintains strong uniqueness constraints within each tenant while enabling multi-tenant growth.

## Note on Migrations
Since these changes modify existing unique constraints defined by the `IdentityDbContext`, a new migration should be generated to apply these composite indexes to the database schema.
