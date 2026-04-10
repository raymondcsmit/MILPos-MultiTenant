# Frontend Optimization Plan: IndexedDB Caching & Interceptor

## 1. Executive Summary
**Goal**: Eliminate redundant API calls for static/semi-static data and enable instant UI interactions (e.g., product search) by implementing a robust client-side caching layer using **IndexedDB**.

**Key Benefits**:
*   **Zero Latency**: Instant load for dropdowns and lists.
*   **Reduced Server Load**: Drastic reduction in GET requests.
*   **Offline Capability**: Foundation for future offline-first features.
*   **Scalability**: Handles large datasets (products/customers) efficiently where `localStorage` fails.
*   **Resilience**: Robust error handling and fallback strategies ensure app stability even if caching fails.

## 2. Target Data Analysis
We have identified high-frequency read operations that are ideal candidates for caching.

### A. Static / Lookup Data (Low Volatility)
*These change rarely and are fetched frequently (e.g., every time a modal opens).*
*   **Units**: `UnitConversationService.getAll()`
*   **Taxes**: `TaxService.getAll()`
*   **Brands**: `BrandService.getAll()`
*   **Categories**: `ProductCategoryService.getAll()`
*   **Expense Categories**: `ExpenseCategoryService.getAll()`
*   **Inquiry Statuses**: `InquiryStatusService.getAll()`
*   **Inquiry Sources**: `InquirySourceService.getAll()`
*   **Roles**: `RoleService.getRoles()`
*   **Payment Methods**: `PurchaseOrderPaymentService.getPaymentMethod()`

### B. Dynamic / Business Data (Medium Volatility)
*These change during operations but are read frequently.*
*   **Products**: `ProductService.getProducts()` (Critical for POS/Sales)
*   **Customers**: `CustomerService.getCustomers()`
*   **Suppliers**: `SupplierService.getSuppliers()`
*   **Warehouses/Locations**: Used for inventory checks.

## 3. Architecture Design

### A. `IndexedDbService` (The Storage Layer)
Wrapper around the `idb` library to manage raw storage interactions.
*   **Database**: `pos-db`
*   **Stores (Tables)**:
    *   `lookups`: Key-value store for small lists.
    *   `products`: Specialized store for the product catalog.
    *   `customers`: Specialized store for the customer directory.
    *   `metadata`: Stores TTL, versioning, and LRU stats.
*   **Features**:
    *   **Compression**: Use `lz-string` for datasets > 100KB to save space.
    *   **LRU Eviction**: Track access time and remove least recently used items when quota is hit.
    *   **Quota Management**: Graceful handling of `QuotaExceededError` by clearing old entries.

### B. `CacheInterceptor` (The Logic Layer)
Intercepts HTTP requests to implement the caching strategy automatically.
1.  **GET Requests (Read-Through Strategy)**:
    *   **Check Cache**: Is valid data in IndexedDB?
        *   **Yes**: Return `of(data)` immediately.
        *   **No**: Forward request -> Get Response -> Save to IndexedDB -> Return Response.
    *   **Fallback**: If IDB fails (corruption/quota), automatically fall back to network without breaking the app.
2.  **POST/PUT/DELETE Requests (Write-Invalidation Strategy)**:
    *   **Granular Updates**: Instead of clearing the whole list, update specific items where possible (e.g., update single product in `products` store).
    *   **Invalidation**: If granular update isn't safe, invalidate the specific cache entry.

### C. `CacheSyncService` (Cross-Tab Synchronization)
Handles consistency when multiple tabs are open.
*   **Mechanism**: Use `BroadcastChannel` API.
*   **Flow**: Tab A updates data -> Sends 'INVALIDATE' message -> Tab B receives message -> Tab B clears/updates its local cache.

### D. `CacheConfig` (The Rules)
A centralized configuration.
*   **Whitelist**: API endpoints eligible for caching.
*   **TTL (Time-To-Live)**: Lookups (24h), Business Data (1h).
*   **Limits**: Max items per store (e.g., 10,000 products) to prevent memory issues on low-end devices.

## 4. Specific Optimization Strategies

### A. The "Product Search" Problem
*   **Pre-load**: Fetch lightweight "All Products" list on app start (idle time).
*   **Local Search**: `SalesOrder` and `POS` components query IndexedDB locally.
*   **Indexing**: Create IDB indices on `name`, `sku`, `barcode` for fast lookups.

### B. Optimistic UI Updates
*   **Strategy**: Update the UI and Local Cache *immediately* on user action (e.g., "Add Product").
*   **Rollback**: If the server request fails, revert the cache change and show an error.

### C. Preloading Strategy
*   **Idle Pre-fetch**: Use `requestIdleCallback` to fetch common data (Dashboard stats, Top Products) when the main thread is free.
*   **Navigation Prediction**: Start fetching data when user hovers over a menu item.

## 5. Implementation Roadmap

### Phase 1: Foundation (Core Infrastructure)
1.  Install `idb` and `lz-string`.
2.  Create `IndexedDbService` with generic CRUD, **Compression**, and **Error Handling**.
3.  Create `CacheConfig` with whitelist and size limits.
4.  Implement `CacheInterceptor` with basic Read-Through and **Network Fallback**.

### Phase 2: Reliability & Consistency
1.  Implement **Write-Invalidation** and **Granular Updates** (Partial Updates).
2.  Create `CacheSyncService` with **BroadcastChannel** for multi-tab support.
3.  Implement **TTL** and **LRU Eviction** policies.
4.  Handle `Logout`: Clear DB to ensure tenant/user isolation.

### Phase 3: Performance & Experience
1.  **Product Search**: Refactor to use local IDB search + indices.
2.  **Optimistic UI**: Implement optimistic updates for simple entities (Brands, Units).
3.  **Preloading**: Add `PreloadService` for idle-time fetching.
4.  **Cache Warming**: Warm critical caches on app initialization.

### Phase 4: Production Hardening
1.  **Monitoring**: Track Cache Hit/Miss rates and latency.
2.  **Load Testing**: Verify performance with large datasets (10k+ products).
3.  **Service Worker**: (Optional) Investigate background sync for offline mutations.

## 6. Security & Isolation
*   **Tenant/User Isolation**: `AuthService.logout()` triggers `IndexedDbService.clearDatabase()`.
*   **Encryption**: (Optional) If sensitive PII is cached, consider encryption at rest (though IDB is origin-sandboxed).
