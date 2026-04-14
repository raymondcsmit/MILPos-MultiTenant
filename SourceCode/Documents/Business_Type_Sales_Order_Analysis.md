# Business Type Sales Order Implementation Plan

## Overview
This plan details the implementation of multiple Sales Order interfaces tailored for specific business types (Retail, Pharmacy, Petrol Pump). The implementation will use a **Split-Screen Design** (Mockups Approved) and a **Dynamic Routing** strategy to load the appropriate component based on the company's profile.

## 1. Backend Implementation (Data Layer)

### 1.1. Add BusinessType to Company Profile
- **Enum Definition**:
  ```csharp
  public enum BusinessType
  {
      Retail = 0,
      Pharmacy = 1,
      AgriPharma = 2,
      PetrolPump = 3,
      GeneralStore = 4
  }
  ```
- **Entity Update**: Add `BusinessType` property to `CompanyProfile` entity.
- **DTO Update**: Update `CompanyProfileDto` to expose this field to the frontend.

### 1.2. Extend SalesOrderItem
Add nullable fields to `SalesOrderItem` entity to support diverse data requirements without separate tables:
- `BatchNumber` (string, nullable) - for Pharmacy/Agri
- `ExpiryDate` (DateTime?, nullable) - for Pharmacy/Agri
- `NozzleId` (Guid?, nullable) - for Petrol Pump
- `MeterReadingStart` (decimal?, nullable) - for Petrol Pump
- `MeterReadingEnd` (decimal?, nullable) - for Petrol Pump

### 1.3. Database Migration
- Generate and apply `AddBusinessTypeAndOrderFields` migration.

## 2. Frontend Architecture (Angular)

### 2.1. Model Updates
- Update `CompanyProfile` interface in `company-profile.ts` to include `businessType`.
- Update `SalesOrderItem` interface to include new fields.

### 2.2. New Components (Split-Screen Layouts)
Create three new standalone components in `src/app/sales-order/`:
1.  **`SalesOrderRetailComponent`**: Implements `Retail_POS_Layout.html`. Standard POS with visual grid + cart.
2.  **`SalesOrderPharmacyComponent`**: Implements `Pharmacy_POS_Layout.html`. Adds Batch/Expiry logic and Modal.
3.  **`SalesOrderPetrolComponent`**: Implements `PetrolPump_POS_Layout.html`. Adds Nozzle grid and Reading inputs.

*Note: Logic from the existing `SalesOrderAddEditComponent` (e.g., `saveSalesOrder`, `onProductSelection`) will be reused or duplicated (refactored into a mixin/service if possible, but duplication is safer for now to strictly follow "no change to current component" rule).*

### 2.3. Container & Routing Logic
Create a **`SalesOrderContainerComponent`** to act as the dispatcher.

**Routing Update (`sales-order-routes.ts`)**:
```typescript
{
  path: ':id',
  component: SalesOrderContainerComponent, // Replaces SalesOrderAddEditComponent
  resolve: { ... }
}
```

**Container Logic**:
- Inject `SecurityService` (to get `CompanyProfile`).
- `ngOnInit`: Check `this.securityService.userProfile.companyProfile.businessType`.
- Use `ngSwitch` in template to render the correct child component:
  ```html
  <app-sales-order-retail *ngIf="isRetail"></app-sales-order-retail>
  <app-sales-order-pharmacy *ngIf="isPharmacy"></app-sales-order-pharmacy>
  <app-sales-order-petrol *ngIf="isPetrol"></app-sales-order-petrol>
  <!-- Fallback -->
  <app-sales-order-add-edit *ngIf="isLegacy"></app-sales-order-add-edit>
  ```

## 3. Execution Steps

1.  **Backend**: Modify Entities, Create Migration, Update DB.
2.  **Frontend Models**: Update Interfaces.
3.  **Frontend Components**: Scaffold the 3 new components using the HTML mockups.
4.  **Frontend Logic**: Implement TypeScript logic for each component (fetching products, handling cart, saving).
5.  **Frontend Routing**: Create Container and update Routes.
6.  **Verification**: Test each mode by changing the database value of `BusinessType`.
