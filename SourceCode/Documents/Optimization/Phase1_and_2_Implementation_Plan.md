# Implementation Plan: Angular Performance Optimization

**Project:** MIL POS — Multi-Tenant Point of Sale & Inventory Management  
**Date:** 2026-04-11  
**Authored by:** Antigravity (AI Code Analysis)  

This document details the step-by-step implementation plan for fixing the performance bottlenecks discovered in the recent analysis. To balance risk vs. reward, we are splitting the work into phases. This plan focuses on **Phase 1 and Phase 2**.

## Phase 1: Quick Wins

### 1. Fix POS `ngOnInit` Re-invocation (BP-01)
- **File:** `src/app/pos/pos.component.ts`
- **Action:** Remove the `this.ngOnInit()` call inside the successful persistence hook of `saveSalesOrder`. Create a `resetFormForNewOrder()` method that clears the form arrays, resets totals, and calls just the `getNewSalesOrderNumber()` API without re-subscribing to streams.

### 2. Cache DOM Audio Object (BP-06)
- **File:** `src/app/pos/pos.component.ts`
- **Action:** Convert the local `new Audio()` inside `playSound()` into a class-level private field. Rewind and play on each scan instead of instantiating new instances.

### 3. Remove Production `console.log` Spam (BP-04)
- **Files:** `cache.interceptor.ts`, `cache-sync.service.ts`, `indexed-db.service.ts`
- **Action:** Wrap all diagnostic logs inside `if (isDevMode())` to prevent CPU and memory overhead during production API HTTP calls.

### 4. Remove NgRx DevTools from Production (BP-09)
- **File:** `src/app/app.config.ts`
- **Action:** Update `provideStoreDevtools` to use `{ logOnly: !isDevMode() }`.

### 5. SignalR Auto Reconnect (BP-13)
- **File:** `src/app/core/services/signalr.service.ts`
- **Action:** Add `.withAutomaticReconnect([0, 2000, 10000, 30000])` to the hub builder.

## Phase 2: High-Impact Refactors

### 6. Remove Feather Icons (BP-03)
- **File:** `src/app/app.config.ts`
- **Action:** Completely remove `FeatherModule.pick(allIcons)`. Analysis shows `feather-icons` are not used in actual production templates (`mat-icon` is heavily used). This permanently removes the entire SVG library from the payload.

### 7. POS Flat Discount Debounce (BP-05)
- **File:** `src/app/pos/pos.component.ts`
- **Action:** The existing `this.salesOrderForm.get('flatDiscount')?.valueChanges` subscription lacks a debounce. Add `.pipe(debounceTime(400), distinctUntilChanged())` to prevent recalculating all taxes/discounts on every keystroke.

### 8. Fix `@for` Loop TrackBy IDs (BP-11)
- **File:** `src/app/pos/pos.component.html`
- **Action:** Change `track $index` to `track a.id` and `track customer.id` to prevent DOM thrashing.

### 9. Optimize JWT Claim Resolution (BP-10)
- **File:** `src/app/core/security/security.service.ts`
- **Action:** Change `isClaimValid()` to utilize the already-cached array in `this.Claims` rather than repeatedly calling `getJWtToken()` and traversing `Object.keys()` on every single permission evaluation.

## Next Steps

Awaiting user approval to begin implementing these changes. Once approved, the changes will be executed, built, and verified.
