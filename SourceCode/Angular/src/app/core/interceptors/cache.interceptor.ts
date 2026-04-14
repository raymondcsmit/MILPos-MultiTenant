import { inject, isDevMode } from '@angular/core';
import {
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpInterceptorFn,
  HttpResponse
} from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { IndexedDbService } from '../services/indexed-db.service';
import { CacheSyncService } from '../services/cache-sync.service';
import { CACHE_CONFIG } from '../config/cache.config';

export const CacheInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
    const idbService = inject(IndexedDbService);
    const cacheSyncService = inject(CacheSyncService);

    // 1. Handle Writes (Invalidation)
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
        return next(req).pipe(
            tap(event => {
                if (event instanceof HttpResponse && (event.status >= 200 && event.status < 300)) {
                    handleWriteInvalidation(req, idbService, cacheSyncService);
                }
            })
        );
    }

    // 2. Check if request is GET
    if (req.method !== 'GET') {
      return next(req);
    }

    // 3. Check for "Product Search" (Master List Query)
    if (req.url.includes('product/dropdowns')) {
        return handleProductSearch(req, next, idbService);
    }

    // 4. Check for "Supplier Search"
    if (req.url.includes('SupplierSearch')) {
        return handleSupplierSearch(req, next, idbService);
    }

    // 5. Check for "Customer Search"
    if (req.url.includes('customerSearch')) {
        return handleCustomerSearch(req, next, idbService);
    }

    // 6. Check Whitelist for Lookups
    const isWhitelisted = CACHE_CONFIG.whitelist.some(url => req.url.includes(url));
    if (isWhitelisted) {
        if (isDevMode()) console.log(`[CacheInterceptor] Whitelist Matched: ${req.url}`);
        return handleLookupCache(req, next, idbService);
    } else {
         if (isDevMode()) console.log(`[CacheInterceptor] Not Whitelisted: ${req.url}`);
    }

    // Default: Pass through
    return next(req);
};

const handleWriteInvalidation = (req: HttpRequest<unknown>, idbService: IndexedDbService, cacheSyncService: CacheSyncService) => {
    try {
        // Extract Resource Name from URL
        // e.g. http://api/UnitConversation/123 -> UnitConversation
        // e.g. /api/product -> product
        
        let url = req.url;
        // Strip query params
        if (url.includes('?')) {
            url = url.split('?')[0];
        }

        // Find "api/" and get next segment
        const apiIndex = url.indexOf('api/');
        let resourceName = '';
        
        if (apiIndex > -1) {
            const afterApi = url.substring(apiIndex + 4);
            const parts = afterApi.split('/');
            if (parts.length > 0) {
                resourceName = parts[0];
            }
        } else {
             // Fallback if no 'api/' prefix found (unlikely in this app)
             const parts = url.split('/');
             resourceName = parts[parts.length - 1]; // simplistic
        }

        if (resourceName) {
            if (isDevMode()) console.log(`Cache Invalidation Triggered for: ${resourceName}`);
            
            // 1. Universal Lookup Clean
            // Delete ANY lookup key that contains this resource name
            // e.g. /api/UnitConversation/dropdown would match "UnitConversation"
            idbService.deleteByPattern('lookups', resourceName).subscribe();

            // 2. Special Case: Products
            if (resourceName.toLowerCase() === 'product') {
                // Clear Master Data
                idbService.deleteByPattern('master_data', CACHE_CONFIG.masterDataKeys.products).subscribe(() => {
                     // Trigger re-sync
                     cacheSyncService.syncMasterData();
                });
            }

            // 3. Special Case: Suppliers
            if (resourceName.toLowerCase() === 'supplier') {
               idbService.deleteByPattern('master_data', CACHE_CONFIG.masterDataKeys.suppliers).subscribe(() => {
                    cacheSyncService.syncMasterData();
               });
            }

            // 4. Special Case: Customers
            if (resourceName.toLowerCase() === 'customer') {
               idbService.deleteByPattern('master_data', CACHE_CONFIG.masterDataKeys.customers).subscribe(() => {
                    cacheSyncService.syncMasterData();
               });
            }
        }
    } catch (e) {
        console.error('Error in Cache Invalidation', e);
    }
}

const handleLookupCache = (req: HttpRequest<unknown>, next: HttpHandlerFn, idbService: IndexedDbService): Observable<HttpEvent<unknown>> => {
      const cacheKey = req.urlWithParams;
      return idbService.get('lookups', cacheKey).pipe(
          switchMap(cachedData => {
              if (cachedData) {
                  if (isDevMode()) console.log(`[CacheInterceptor] Serving from Cache: ${cacheKey}`);
                  return of(new HttpResponse({ body: cachedData, status: 200 }));
              }
              if (isDevMode()) console.log(`[CacheInterceptor] Cache Miss - Fetching: ${cacheKey}`);
              return next(req).pipe(
                  tap(event => {
                      if (event instanceof HttpResponse) {
                          if (isDevMode()) console.log(`[CacheInterceptor] Caching Response for: ${cacheKey}`);
                          idbService.put('lookups', cacheKey, event.body).subscribe({
                              next: () => { if (isDevMode()) console.log(`[CacheInterceptor] Put Success: ${cacheKey}`); },
                              error: (err) => console.error(`[CacheInterceptor] Put Failed: ${cacheKey}`, err)
                          });
                      }
                  })
              );
          })
      );
}

const handleProductSearch = (req: HttpRequest<unknown>, next: HttpHandlerFn, idbService: IndexedDbService): Observable<HttpEvent<unknown>> => {
      // Logic:
      // 1. Try to get ALL_PRODUCTS from 'master_data' store.
      // 2. If exists, perform CLIENT-SIDE filtering.
      // 3. If not, pass to network (fallback).
      
      return idbService.get<any[]>('master_data', CACHE_CONFIG.masterDataKeys.products).pipe(
          switchMap(allProducts => {
              if (allProducts && Array.isArray(allProducts) && allProducts.length > 0) {
                  const filtered = filterProducts(allProducts, req.params);
                  return of(new HttpResponse({ body: filtered, status: 200 }));
              }
              // Fallback to network (and ideally trigger a background sync)
              return next(req);
          })
      );
}

const handleSupplierSearch = (req: HttpRequest<unknown>, next: HttpHandlerFn, idbService: IndexedDbService): Observable<HttpEvent<unknown>> => {
    return idbService.get<any[]>('master_data', CACHE_CONFIG.masterDataKeys.suppliers).pipe(
        switchMap(allSuppliers => {
            if (allSuppliers && Array.isArray(allSuppliers) && allSuppliers.length > 0) {
                 const searchQuery = req.params.get('searchQuery')?.toLowerCase() || '';
                 const filtered = allSuppliers.filter(s => 
                     !searchQuery || s.supplierName?.toLowerCase().includes(searchQuery) || s.mobileNo?.includes(searchQuery)
                 ).slice(0, 50);
                 return of(new HttpResponse({ body: filtered, status: 200 }));
            }
            return next(req);
        })
    );
}

const handleCustomerSearch = (req: HttpRequest<unknown>, next: HttpHandlerFn, idbService: IndexedDbService): Observable<HttpEvent<unknown>> => {
    return idbService.get<any[]>('master_data', CACHE_CONFIG.masterDataKeys.customers).pipe(
        switchMap(allCustomers => {
            if (allCustomers && Array.isArray(allCustomers) && allCustomers.length > 0) {
                 const searchQuery = req.params.get('searchQuery')?.toLowerCase() || '';
                 const filtered = allCustomers.filter(c => 
                     !searchQuery || c.customerName?.toLowerCase().includes(searchQuery) || c.mobileNo?.includes(searchQuery)
                 ).slice(0, 50);
                 return of(new HttpResponse({ body: filtered, status: 200 }));
            }
            return next(req);
        })
    );
}

const filterProducts = (products: any[], params: any): any[] => {
      // Helper to safely get param value
      const getParam = (key: string) => params.get(key)?.toString().toLowerCase() || '';

      const searchQuery = getParam('searchQuery'); // General search
      const name = getParam('name');
      const barcode = getParam('barcode');
      const categoryId = getParam('categoryId');
      
      // Basic filtering logic mimicking backend
      return products.filter(p => {
          let match = true;

          if (searchQuery) {
              const query = searchQuery;
              const textMatch = (p.name?.toLowerCase().includes(query) || 
                               p.barcode?.toLowerCase().includes(query) ||
                               p.code?.toLowerCase().includes(query));
              if (!textMatch) match = false;
          }

          if (name && !p.name?.toLowerCase().includes(name)) match = false;
          if (barcode && !p.barcode?.toLowerCase().includes(barcode)) match = false;
          
          if (categoryId && p.categoryId?.toLowerCase() !== categoryId) match = false;

          return match;
      }).slice(0, 50); // Limit results to 50 for performance
}
