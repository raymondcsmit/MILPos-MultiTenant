# AGENTS.md — MILPOS Project Conventions

## What this project is
Multi-tenant POS + inventory system: .NET 10 CQRS/MediatR backend (`SourceCode/SQLAPI`), Angular 20 SPA (`SourceCode/Angular`), Electron desktop shell, SQLite (desktop) / PostgreSQL (cloud).

## Authoritative documentation
- **Workflow specs:** `New-Documents/01–10` (code-verified, `WF-x.y` IDs), gap catalog `New-Documents/11`
- **Test specification:** `Test-Documentation/` — 680 test cases (TC-Dxx.nnn), strategy in `00_TEST_STRATEGY.md`, Postman plan, Playwright journeys. Every automated test must trace to a TC ID.
- Gap-Target tests are RED by definition (drive enhancements); Gap-Char tests pin current behavior. Never weaken assertions to make tests pass.

## Backend test commands (run from `SourceCode/SQLAPI`)
```
dotnet test Tests\POS.MediatR.Tests\POS.MediatR.Tests.csproj   # unit tests
dotnet test Tests\POS.API.Tests\POS.API.Tests.csproj           # integration tests (real API + per-fixture SQLite)
dotnet test Tests\POS.API.Tests\POS.API.Tests.csproj --collect:"XPlat Code Coverage" --results-directory ./TestResults
dotnet tool restore && dotnet reportgenerator -reports:./TestResults/**/coverage.cobertura.xml -targetdir:./TestResults/CoverageReport -reporttypes:"Html;TextSummary"
```

## Test infrastructure facts (hard-won)
- `TestWebApplicationFactory` uses **`UseSetting`**, NOT `ConfigureAppConfiguration` — minimal-hosting apps apply factory config callbacks *before* appsettings.*.json, so file settings would override them.
- Hangfire SQLite storage needs a **bare file path** (not `Data Source=…`).
- `AuthenticationController.Login` NREs without a `CF-Connecting-IP` header in test servers — all test clients add it.
- SQLite migrations are **3 migrations behind** the EF model (`TestSeed.PatchMissingColumnsAsync` shims the 4 missing columns on the test DB only — each entry is a product finding to fix properly).
- `RoleClaim.ActionId` has FK to Actions → seed claims directly, never via `AddClaimAsync`.
- Audit interceptor stamps `CreatedBy/ModifiedBy` from `DefaultUser:DefaultUserId` — that user must exist or audited writes FK-fail.
- Seeding order: tenants → identity (roles/users) → Page/Action/RoleClaims → business rows (audit FKs require existing users).

## Known pre-existing failure (not introduced by tests)
`GetIncomeComparisonQueryHandlerTests` — production dashboard handler mixes Dapper rows into an EF `IQueryable` then calls async operators. Wave-1 candidate.

## Coverage
Baseline Wave 0: 17.2% line. Gate NOT enforced yet — ratchet to ≥90% during Waves 1–6, enforce in CI in Wave 6 (see workflow comment in `.github/workflows/backend-tests.yml`).

## Disk caution
F: drive runs close to full; `bin/obj` regenerable (~2 GB). Never delete `Publish/`, `Published/`, `Backups/` without explicit approval.
