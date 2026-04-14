# Template Download 500 Error Fix - Work Document

## Issue Description
When attempting to download an excel template in the Electron build, the application returned a `500 Internal Server Error`.
The failure URL pattern was observed to be malformed, containing a double URL prefix:
`http://localhost:5000/api/http://localhost:5000/importexport/products/template...`

## Root Cause Analysis
1.  **Service Layer**: `ImportExportService` was constructing an absolute URL by manually prepending `environment.apiUrl`.
2.  **Interceptor Layer**: The global `HttpRequestInterceptor` was configured to blindly prepend `api/` and `environment.apiUrl` to all requests, regardless of whether the URL was already absolute.
3.  **Combination**: This resulted in the base URL being added twice—once by the service and once by the interceptor.

## Implementation Details

### 1. src/app/core/services/import-export.service.ts
**Change**: Updated `apiUrl` from absolute to relative path.
**Code**:
```typescript
// Before
private apiUrl = `${environment.apiUrl}importexport`;

// After
private apiUrl = 'importexport';
```

### 2. src/app/http-request-interceptor.ts
**Change**: Added a check to detect if the request URL is already absolute (`http://` or `https://`).
**Logic**:
*   If the URL is absolute: Preserve it (prevent double-prefixing) but still attach the Authorization token.
*   If the URL is relative: Proceed with standard logic (prepend base URL and `api/`).

**Code**:
```typescript
if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
    // Handle absolute URL: attach token only, do not prepend base URL
    newReq = req.clone({
      headers: token ? req.headers.set('Authorization', 'Bearer ' + token) : req.headers
    });
} else {
   // Existing logic for relative URLs
}
```

## Verification
*   **Action**: Click "Download Excel Template" in Electron app.
*   **Result**: File downloads successfully.
*   **Network Request**: Verified URL is correctly formatted (single base URL).
