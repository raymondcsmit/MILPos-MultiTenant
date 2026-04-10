# Analysis of Shared vs. Tenant-Specific Entities

## Overview
This document analyzes entities that are currently implemented as tenant-specific (having a `TenantId`) but contain data that is arguably global or common to all tenants. Sharing these entities can reduce database redundancy and simplify maintenance.

## Current State
The specific entities analyzed below currently inherit from `BaseEntity`, which automatically includes a `TenantId` property. This means every tenant has their own isolated copy of this data.

### 1. Countries & Cities
*   **Current Implementation**: Inherits `BaseEntity`.
*   **Observation**: Geographic data is standard global data. It does not vary between tenants.
*   **Redundancy**: If you have 1000 tenants, you will have 1000 copies of "United States", "Pakistan", etc., and 1000 copies of every city.
*   **Recommendation**: **Make Shared**.
    *   Remove `TenantId` (or make it nullable/ignored).
    *   Exclude from Global Query Filters.
    *   Seed once with a null or default `TenantId`.

### 2. Languages
*   **Current Implementation**: Inherits `BaseEntity`.
*   **Observation**: The list of supported application languages (English, Spanish, Urdu) is defined by the platform, not the tenant.
*   **Recommendation**: **Make Shared**.
    *   Tenants might want to *select* which languages they enable, but the definition of the language itself should be global.

### 3. Units (UnitConversation)
*   **Current Implementation**: Inherits `BaseEntity`.
*   **Observation**: Standard units (kg, meter, piece) are universal.
*   **Nuance**: However, some businesses might define custom units specific to their industry (e.g., "Barrel" for Oil vs "Crate" for Fruits).
*   **Recommendation**: **Hybrid Approach**.
    *   Seed specific standard units as Global (TenantId = null).
    *   Allow tenants to add their own custom units (TenantId = specific).
    *   Update Query Filter to show records where `TenantId == CurrentTenant OR TenantId == null`.

### 4. Currencies
*   **Current Implementation**: Inherits `BaseEntity`.
*   **Observation**: Currencies (USD, PKR, EUR) are standard ISO definitions.
*   **Recommendation**: **Make Shared**.

### 5. Tenants
*   **Current Implementation**: Does NOT inherit `BaseEntity`.
*   **Statue**: Correct. The Tenant entity defines the tenant itself and is naturally global in the context of the SaaS platform (the "System" owns the list of tenants).

## Implementation Strategy for Shared Entities
1.  **Modify Entity**: Remove inheritance from `BaseEntity` or override the behavior. Alternatively, keep `BaseEntity` but treat `TenantId` as nullable in logic.
    *   *Preferable*: Create a `ISharedEntity` interface or `SharedBaseEntity` class that does not have `TenantId`.
2.  **Update DbContext**:
    *   Modify `OnModelCreating` to **exclude** these entities from the global tenant query filter.
    *   `builder.Entity<Country>().HasQueryFilter(e => true);` (No filter)
3.  **Update Seeding**:
    *   Seed these tables only once (when the system initializes), not every time a new tenant is registered.
    *   Ensure they are seeded with a NULL or specific System Tenant ID.

## Summary Table

| Entity | Current Type | Recommendation | Reason |
| :--- | :--- | :--- | :--- |
| **Country** | Tenant-Specific | **Global** | Standard geographic data. |
| **City** | Tenant-Specific | **Global** | Standard geographic data. |
| **Language** | Tenant-Specific | **Global** | Platform-level settings. |
| **Currency** | Tenant-Specific | **Global** | ISO standards. |
| **UnitConversation** | Tenant-Specific | **Hybrid** | Standard units should be global; custom units allowed per tenant. |
| **Tenant** | Global | **Global** | Already correct. |

