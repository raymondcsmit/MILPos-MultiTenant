# Master Test Strategy and Environment Setup

## 1. Overview
This document defines the comprehensive end-to-end testing strategy for the POS with Inventory Management system. It establishes the testing methodologies, environment setup, execution guidelines, and standard reporting templates.

## 2. Testing Methodologies
The test suite enforces a multi-layered testing approach, comprising four distinct methodologies:

### 2.1 Unit Tests (White-Box)
* **Objective**: Validate individual components, MediatR handlers, utility functions, and Angular services in total isolation.
* **Scope**: Focuses on algorithmic correctness, data transformations, and branch logic.
* **Tools**: xUnit, Moq (Backend); Jasmine, Karma (Frontend).

### 2.2 Integration Tests (White-Box / Black-Box Hybrid)
* **Objective**: Verify proper interaction between architectural layers (e.g., API Controllers to MediatR to EF Core Repositories).
* **Scope**: Ensures the CQRS pattern executes seamlessly against an in-memory or dedicated test database.
* **Tools**: `WebApplicationFactory`, TestContainers.

### 2.3 End-to-End System Tests (Black-Box)
* **Objective**: Examine the application's functionality from an end-user perspective, with zero knowledge of internal implementations.
* **Scope**: UI interactions, authentication flows, module navigations, and error message rendering.
* **Tools**: Cypress, Playwright, or Postman (for API Black-box).

### 2.4 White-Box Internal Logic Tests
* **Objective**: Validate specific, complex internal code paths (e.g., unit conversion formulas, tax aggregations, concurrent transaction rollback).
* **Scope**: Code coverage metrics, cyclomatic complexity checks, and data integrity assertions (e.g., `IDbContextTransaction` atomicity).

## 3. Environment Setup Requirements

### 3.1 Local Test Environment
* **Database**: Dedicated SQLite (for fast integration) or a clean PostgreSQL container (`pos_test_db`).
* **Backend**: .NET 10 SDK, running on `http://localhost:5000`.
* **Frontend**: Node.js 20+, Angular CLI, running on `http://localhost:4200`.
* **Data Seeding**: Execute the `POS-Test-Data-Collection.postman_collection.json` via Newman to establish baseline entities (Tenant, Roles, Default Products) before black-box testing.

### 3.2 CI/CD Integration
* Automated tests run on every pull request targeting the `main` or `develop` branch.
* Pipeline halts if unit test coverage falls below 80% or if any integration test fails.

## 4. Standard Format for Test Cases
Every module-specific document in this directory adheres to the following table format for execution tracking:

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|

## 5. Test Execution Instructions
1. Navigate to the solution root.
2. **Unit & Integration**: Run `dotnet test SourceCode/SQLAPI/Tests/POS.API.Tests`
3. **Frontend Tests**: Run `npm run test` in `SourceCode/Angular`
4. **Manual Black-Box**: Use the credentials provided in the specific module documentation to log in via the UI, execute the "Steps", and record the "Actual Result".
