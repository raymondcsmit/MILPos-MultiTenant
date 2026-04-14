# Implementation Plan - Fix Circular Dependency

## Goal Description
Resolve the `NU1108` circular dependency error: `POS.Helper -> POS.Common -> POS.Data -> POS.Helper`.

## User Review Required
> [!IMPORTANT]
> This may involve moving classes between projects or extracting interfaces to a new shared project if the dependencies are deeply entangled.

## Analysis
The reported cycle is:
1. `POS.Helper` references `POS.Common`
2. `POS.Common` references `POS.Data`
3. `POS.Data` references `POS.Helper`

## Proposed Changes
### Dependency Analysis
- I will first inspect the `.csproj` files to confirm the references.
- Then I will verify *why* `POS.Data` references `POS.Helper`. `POS.Data` (Entities/DTOs) should ideally be a leaf node or only depend on `POS.Common` (if it contains base classes).
- Verify *why* `POS.Common` references `POS.Data`.
- Verify *why* `POS.Helper` references `POS.Common`.

### Strategy
1. **Move `ResourceParameters`**: Move `ResourceParameters.cs` from `POS.Helper` to `POS.Data` (Namespace `POS.Data.Resources`).
2. **Remove Dependency**: Remove `POS.Helper` reference from `POS.Data.csproj`.
3. **Update References**:
    - Update all `*Resource.cs` files in `POS.Data` to remove `using POS.Helper;`.
    - Update `POS.MediatR` and other consumers to use `POS.Data.Resources.ResourceParameters`.
    - If `POS.Helper` uses `ResourceParameters`, add `POS.Data` reference to `POS.Helper` (this is safe as `Data` will no longer reference `Helper`).

### Step-by-Step
1. Read `ResourceParameters.cs` (Done).
2. Create `POS.Data/Resources/ResourceParameters.cs`.
3. Delete `POS.Helper/ResourceParameters.cs`.
4. Remove `<ProjectReference Include="..\POS.Helper\POS.Helper.csproj" />` from `POS.Data.csproj`.
5. Add `<ProjectReference Include="..\POS.Helper\POS.Helper.csproj" />` to `POS.Domain.csproj` (to restore transitive dependency lost from Data).
6. Fix build errors (namespaces).
7. Fix build errors (constructor duplicates in MediatR handlers introduced by previous refactoring).

## Verification Plan
### Automated Tests
- `dotnet build` on all projects:
    - `POS.Data` (Passed)
    - `POS.Helper` (Passed)
    - `POS.Common` (Passed)
    - `POS.Domain` (Passed)
    - `POS.DataMigrationUtility` (Passed)
    - `POS.MediatR` (Passed)
    - `POS.API` (Passed)
