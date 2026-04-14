# MILPOS (POS with Inventory Management)

This repository contains a multi-tenant Point of Sale system with Inventory Management, Accounting, Purchasing, CRM, and Reporting.

## Architecture

- Backend: ASP.NET Core + CQRS/MediatR (Clean Architecture layered projects under `SourceCode/SQLAPI`)
- Frontend: Angular app (under `SourceCode/Angular`)
- Deployment: PowerShell scripts for local publish and remote deployment

## Standardization (Required)

This repo follows the standardized development strategy already documented here:

- [AI_Optimized_Development_Approach.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Strategy/AI_Optimized_Development_Approach.md)
- [BestApproach Index](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Strategy/BestApproach/00_Index_and_Overview.md)
- Verification loop (mandatory): [04_The_Verification_Loop.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Strategy/BestApproach/04_The_Verification_Loop.md)

Before opening a PR, follow the verification checklist in:

- [CONTRIBUTING.md](file:///f:/MIllyass/pos-with-inventory-management/CONTRIBUTING.md)
- [AI_DECISIONS.md](file:///f:/MIllyass/pos-with-inventory-management/AI_DECISIONS.md)

## Quick Start (Local)

### Backend API

- Solution: `SourceCode/SQLAPI/POS.sln`
- Main API project: `SourceCode/SQLAPI/POS.API/POS.API.csproj`

### Frontend (Angular)

- App workspace: `SourceCode/Angular`

## Documentation

- Strategy and process: `Documentation/Strategy`
- Testing docs: `SourceCode/Documents/Testing`
- API Performance Profiling & Dapper Hybrid Strategy: `SourceCode/Documents/Api Performance Issues/SlowRunningApiFindings/DapperIntegration`
  - To migrate a slow EF Core QueryHandler to Dapper, type `// MIGRATE-TO-DAPPER` and use the [DapperMigration.snippet](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Documents/Api%20Performance%20Issues/SlowRunningApiFindings/DapperIntegration/DapperMigration.snippet).

