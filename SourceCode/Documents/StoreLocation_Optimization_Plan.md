# Store Location Caching Optimization — Implementation Plan

## Problem Summary

**Business Location** is used in **40+ components** across the Angular app (Sales Orders, Purchase Orders, Reports, POS, Dashboard, Inventory, etc.). Currently:

1. **Multiple fresh API calls per session**: Several components directly call `BusinessLocationService.getLocations()` — each makes a live `GET /api/location` HTTP request every time a form opens.
2. **`CommonService.getLocationsForCurrentUser()`** reads from `SecurityService.companyProfile` (BehaviorSubject backed by session storage) — this is the correct pattern, but only works when `companyProfile.locations` is populated.
3. **`CompanyProfileResolver`** fetches the company profile (including locations) when navigating to authenticated routes — but this is a route resolver triggered on navigation, not at login.
4. **`CacheSyncService.syncMasterData()`** is called at login (syncs products, suppliers, customers to IndexedDB) but **does NOT include locations**.
5. **HTTP Interceptor whitelist** caches several GET routes (`Brand`, `Tax`, `UnitConversation`, etc.) — but `'location'` is **not whitelisted**, so it is never cached at interceptor level.
6. Users are forced to **Ctrl+Shift+R** (hard refresh) to see updated location data — a sign that data isn't being pre-loaded reliably.

**The fix**: Load business locations once at login, cache them into `SecurityService.companyProfile` (session storage), add `'location'` to the HTTP interceptor whitelist, and migrate the 2 components that bypass the cache with direct API calls.

---

## Root Cause Analysis

### Current Data Flow (Broken)

```
Login
 └── SecurityService.login()
       ├── Saves JWT + auth object
       ├── Calls cacheSyncService.syncMasterData()   ← products/suppliers/customers only
       └── ❌ Locations NOT loaded

CompanyProfileResolver (on each route navigation for authenticated routes)
 └── Fetches /api/company-profile
       └── securityService.updateProfile(profile)   ← sets companyProfile$.  
                                                       IF profile includes locations array, they work.

Components (40+)
 ├── Pattern A — CORRECT (works when companyProfile is populated):
 │     commonService.getLocationsForCurrentUser()
 │      └── reads from securityService.companyProfile (BehaviorSubject)
 │
 └── Pattern B — WRONG (makes fresh HTTP call every time component opens):
       businessLocationService.getLocations()
        └── live GET /api/location — no cache
```

### Components Using Pattern B (Direct API Calls — Must Migrate)

| Component | File |
|---|---|
| `ManageUserComponent` | `user/manage-user/manage-user.component.ts` (line 146) |
| `BusinessLocationListComponent` | `business-location/business-location-list/business-location-list.component.ts` (line 54) |

> **Note**: `BusinessLocationListComponent` is the management page itself — it **should** always hit the API for fresh data. It will benefit from the HTTP whitelist cache (Phase 1) but does not need a code migration.

---

## Proposed Changes (6 Phases)

### Phase 1 — Add `'location'` to HTTP Interceptor Cache Whitelist

**File**: `Angular/src/app/core/config/cache.config.ts`

Add `'location'` to the `whitelist` array so the HTTP interceptor caches GET requests to `/api/location`.

```typescript
// Before
whitelist: [
  'UnitConversation', 'Tax', 'Brand', ..., 'Suppliers'
],

// After
whitelist: [
  'UnitConversation', 'Tax', 'Brand', ..., 'Suppliers',
  'location',   // ← ADD THIS
],
```

---

### Phase 2 — Add `LOCATION_CACHE` Key to `WrLicenseService`

**File**: `Angular/src/app/core/services/wr-license.service.ts`

Add `LOCATION_CACHE: 'location_cache'` to the `keyValues` object for consistency across the app.

---

### Phase 3 — Load & Cache Locations at Login in `SecurityService`

**File**: `Angular/src/app/core/security/security.service.ts`

**Inject** `BusinessLocationService` into `SecurityService`.

**New method** `setLocationsCache(locations: BusinessLocation[])`:
```typescript
setLocationsCache(locations: BusinessLocation[]) {
  sessionStorage.setItem(
    this.wrLicenseService.keyValues.LOCATION_CACHE,
    JSON.stringify(locations)
  );
  const current = this._companyProfile$.value;
  if (current) {
    this._companyProfile$.next({ ...current, locations });
  }
}
```

**In `login()` tap callback** — call after setting token:
```typescript
// After this.updateSelectedLocation(userLocations[0])
this.businessLocationService.getLocations().subscribe({
  next: (locations) => this.setLocationsCache(locations),
  error: (err) => console.error('Could not pre-load locations:', err)
});
```

**In `setCompany()` — restore locations after F5 refresh**:
```typescript
// After restoring companyProfile from sessionStorage
const locationJson = sessionStorage.getItem(this.wrLicenseService.keyValues.LOCATION_CACHE);
if (locationJson && profileData && !profileData.locations?.length) {
  profileData.locations = JSON.parse(locationJson);
}
```

**In `resetSecurityObject()` — clear on logout**:
```typescript
sessionStorage.removeItem(this.wrLicenseService.keyValues.LOCATION_CACHE);
```

---

### Phase 4 — Add Locations to `CacheSyncService`

**File**: `Angular/src/app/core/services/cache-sync.service.ts`

Add `syncLocations()` and call it from `syncMasterData()`:

```typescript
async syncMasterData() {
  await Promise.all([
    this.syncProducts(),
    this.syncSuppliers(),
    this.syncCustomers(),
    this.syncLocations(),      // ← ADD
  ]);
}

private async syncLocations() {
  try {
    const locations = await firstValueFrom(this.businessLocationService.getLocations());
    if (locations) {
      this.securityService.setLocationsCache(locations);
      console.log('Master Data (Locations) Synced:', locations.length);
    }
  } catch (error) {
    console.error('Failed to sync locations', error);
  }
}
```

> Since `CacheSyncService` is called right after `login()`, and `login()` already triggers `getLocations()` (Phase 3), they will share the whitelisted HTTP cache from Phase 1 — only **one** actual network call will be made.

---

### Phase 5 — Migrate `ManageUserComponent` to Use Cache

**File**: `Angular/src/app/user/manage-user/manage-user.component.ts`

Replace direct `BusinessLocationService.getLocations()` call with `CommonService.getAllLocations()`:

```typescript
// Remove
import { BusinessLocationService } from '../../business-location/business-location.service';

// Keep (already imported via CommonService)
getLocations() {
  this.commonService.getAllLocations().subscribe((locations: BusinessLocation[]) => {
    this.locations = locations;
  });
}
```

---

### Phase 6 — Verification Checklist (after implementation)

| Test | Expected Result |
|---|---|
| Login → Network tab → filter `location` | Exactly **1** GET `/api/location` call |
| Open Sales Order Add/Edit | Locations dropdown populated, **no** new `/api/location` call |
| Open POS | Location dropdown populated, **no** new `/api/location` call |
| Open any Report | Location filter populated, **no** new `/api/location` call |
| F5 Refresh after login | Locations restored from session storage, no extra API call |
| Logout → Login | Cache cleared, fresh load on login (1 call) |
| Visit `/locations` page | Fresh load expected (it's the management page), works fine |
| Build | `npm run build` completes with 0 errors |

---

## Files to Modify (Summary)

| File | Change |
|---|---|
| `core/config/cache.config.ts` | Add `'location'` to whitelist |
| `core/services/wr-license.service.ts` | Add `LOCATION_CACHE` key |
| `core/security/security.service.ts` | Inject `BusinessLocationService`, add `setLocationsCache()`, load at login, restore on refresh, clear on logout |
| `core/services/cache-sync.service.ts` | Inject `BusinessLocationService` + `SecurityService`, add `syncLocations()` |
| `user/manage-user/manage-user.component.ts` | Migrate to `commonService.getAllLocations()` |

---

*Created: 2026-02-23 | Project: MILPos Multi-Tenant POS*
