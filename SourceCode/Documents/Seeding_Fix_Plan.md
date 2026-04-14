# Seeding Service Fix Implementation Plan

## Goal
Fix permission-related crashes and data missing issues during seeding, specifically for "Chart of Accounts" (`LedgerAccounts`) and "Units" (`UnitConversations`) on PostgreSQL.

## Problem
1.  **Strict FKs on Postgres**: The command `SET session_replication_role = 'replica';` often fails due to lack of superuser permissions on managed databases. When it fails, the entire seeding process aborts.
2.  **Unordered Data**: `LedgerAccounts` and `UnitConversations` are self-referencing (have `ParentId`). If FKs are active (because disabling failed), attempting to insert a Child before its Parent causes an FK violation, causing the entire table insertion to fail.

## Proposed Changes

### `SQLAPI/POS.API/Helpers/SeedingService.cs`

1.  **Safeguard FK Disabling**:
    - Wrap the `SET session_replication_role` (and other provider commands) in `try-catch` blocks.
    - If it fails, log a warning "Could not disable FKs, proceeding with sorted seeding..." and CONTINUE.

2.  **Implement Hierarchy Sorting**:
    - In `SeedTable<T>`, use reflection to check if `T` has properties `Id` and `ParentId`.
    - If yes, sort the `entities` list before inserting:
        - Roots (`ParentId` is null/empty) first.
        - Then Level 1 children (whose ParentId is in Roots).
        - Then Level 2...
        - Append any remaining (orphans/cycles) at the end.
    - This ensures that even if FKs are active, the insertion order respects dependencies.

3.  **Review Priority List**:
    - Ensure `LedgerAccounts` and `UnitConversations` are in the priority list (they are).

## Verification Plan

### Automated Verification
- I verified the code compiles using `dotnet build`.

### Manual Verification
- The user will test by running the application.
- I will inspect the logs (via code reading/logic) to ensure the sort logic is sound.

## Files to Modify
- `SQLAPI/POS.API/Helpers/SeedingService.cs`
