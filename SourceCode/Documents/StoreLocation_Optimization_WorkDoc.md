# Store Location Caching Optimization — Work Document

**Date**: 2026-02-23
**Project**: MILPos Multi-Tenant POS
**Status**: ✅ Completed — Build Passed

---

## Summary

Business Location data (`GET /api/location`) was being fetched fresh on **every component open** across 40+ components, causing users to need **Ctrl+Shift+R** and experiencing UI delays. Locations are now loaded **once at login**, cached in `sessionStorage`, restored on F5 refresh, and cleared on logout.

---

## Files Changed

### 1. `cache.config.ts` — Added `'location'` to HTTP Interceptor Whitelist
**Path**: `Angular/src/app/core/config/cache.config.ts`

Added `'location'` to the `whitelist` array so the HTTP interceptor caches GET responses to `/api/location`. This means any component that still calls `getLocations()` will be served from the interceptor-level cache on subsequent calls.

```diff
+   'location',
```

---

### 2. `wr-license.service.ts` — Added `LOCATION_CACHE` Key
**Path**: `Angular/src/app/core/services/wr-license.service.ts`

Added `LOCATION_CACHE: 'location_cache'` to `keyValues` for consistent session storage key usage.

```diff
+   LOCATION_CACHE: 'location_cache',
```

---

### 3. `security.service.ts` — Load Locations at Login, Cache & Restore
**Path**: `Angular/src/app/core/security/security.service.ts`

**Changes Made:**
- Imported `BusinessLocationService`
- Added `setLocationsCache(locations: BusinessLocation[])` public method — saves to `sessionStorage['location_cache']` and merges into `_companyProfile$` BehaviorSubject
- In `login()` tap callback: calls `getLocations().subscribe()` immediately after authentication succeeds
- In `setCompany()`: restores locations from `sessionStorage['location_cache']` when profile has no locations (F5 browser refresh scenario)
- In `resetSecurityObject()`: clears `LOCATION_CACHE`, `_companyProfile$`, and `_selectedLocation` on logout

**Effect**: All subscribers of `SecurityService.locations$`, `allLocations$`, `AllLocationList$` (which power `CommonService.getLocationsForCurrentUser()` / `getAllLocations()` / `getLocationsForReport()`) now receive data immediately without any component needing to make its own API call.

---

### 4. `cache-sync.service.ts` — Added `syncLocations()`
**Path**: `Angular/src/app/core/services/cache-sync.service.ts`

Added `syncLocations()` as a private method and included it in `syncMasterData()` `Promise.all`. This call runs in parallel with products/suppliers/customers sync at login.

> **De-duplication**: Since `'location'` is now whitelisted in the HTTP interceptor, the `getLocations()` call triggerd by `SecurityService.login()` and the `syncLocations()` call triggered by `CacheSyncService.syncMasterData()` share the **same cached HTTP response** — only **one** actual network request is made.

---

### 5. `manage-user.component.ts` — Migrated to Cache
**Path**: `Angular/src/app/user/manage-user/manage-user.component.ts`

Replaced direct `BusinessLocationService.getLocations()` call (which bypassed the cache) with `CommonService.getAllLocations()` (reads from `SecurityService.companyProfile` BehaviorSubject — the cache).
- Removed `BusinessLocationService` import and constructor injection
- Updated `getLocations()` method body with a comment explaining the pattern

---

## Architecture After Changes

```
Login (SecurityService.login())
 ├── Saves JWT + auth object
 ├── getLocations() → HTTP cache (intercept) → API [ONLY call]
 │     └── setLocationsCache() → sessionStorage + _companyProfile$
 └── CacheSyncService.syncMasterData()
       ├── syncProducts()
       ├── syncSuppliers()
       ├── syncCustomers()
       └── syncLocations() → HTTP cache (interceptor serves it)  ← no extra API call

F5 Refresh: setCompany() reads sessionStorage → restores locations into _companyProfile$

Logout: resetSecurityObject() → clears LOCATION_CACHE from sessionStorage

All 40+ components:
  commonService.getLocationsForCurrentUser()  ← reads from _companyProfile$ (memory)
  commonService.getAllLocations()              ← reads from _companyProfile$ (memory)
  commonService.getLocationsForReport()       ← reads from _companyProfile$ (memory)
  ✅ ZERO extra API calls
```

---

## Verification Results

| Test | Result |
|---|---|
| `npm run build` | ✅ Exit code 0 — No compilation errors |
| Phase 1: cache whitelist | ✅ `'location'` added |
| Phase 2: LOCATION_CACHE key | ✅ Added to `keyValues` |
| Phase 3: Login loads locations | ✅ `setLocationsCache()` called in `login()` tap |
| Phase 3: F5 restore | ✅ `setCompany()` restores from sessionStorage |
| Phase 3: Logout clears cache | ✅ `resetSecurityObject()` removes cache |
| Phase 4: CacheSyncService | ✅ `syncLocations()` in `syncMasterData()` |
| Phase 5: ManageUser migration | ✅ Uses `commonService.getAllLocations()` |

---

## Components Still Calling `getLocations()` Directly

| Component | Why kept | Benefit |
|---|---|---|
| `business-location-list.component.ts` | Manages locations — intentionally needs fresh data | Now served from HTTP whitelist cache |

---

*Work Document generated post-implementation — 2026-02-23*
