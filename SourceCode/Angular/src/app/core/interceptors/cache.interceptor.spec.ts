import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CacheInterceptor } from './cache.interceptor';
import { IndexedDbService } from '../services/indexed-db.service';
import { CacheSyncService } from '../services/cache-sync.service';
import { of } from 'rxjs';
import { CACHE_CONFIG } from '../config/cache.config';

describe('CacheInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let idbServiceSpy: jasmine.SpyObj<IndexedDbService>;
  let cacheSyncServiceSpy: jasmine.SpyObj<CacheSyncService>;

  beforeEach(() => {
    idbServiceSpy = jasmine.createSpyObj('IndexedDbService', ['get', 'put', 'deleteByPattern']);
    cacheSyncServiceSpy = jasmine.createSpyObj('CacheSyncService', ['syncMasterData']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([CacheInterceptor])),
        provideHttpClientTesting(),
        { provide: IndexedDbService, useValue: idbServiceSpy },
        { provide: CacheSyncService, useValue: cacheSyncServiceSpy }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should passthrough non-GET requests but trigger invalidation on success', () => {
    idbServiceSpy.deleteByPattern.and.returnValue(of(undefined));
    httpClient.post('/api/test', {}).subscribe();
    const req = httpMock.expectOne('/api/test');
    expect(req.request.method).toBe('POST');
    req.flush({});
    expect(idbServiceSpy.deleteByPattern).toHaveBeenCalledWith('lookups', 'test');
  });

  it('should invalidate cache on specific resource update', () => {
      idbServiceSpy.deleteByPattern.and.returnValue(of(undefined));
      httpClient.put('/api/UnitConversation/123', {}).subscribe();
      const req = httpMock.expectOne('/api/UnitConversation/123');
      req.flush({}); // Success
      
      // Should extract "UnitConversation"
      expect(idbServiceSpy.deleteByPattern).toHaveBeenCalledWith('lookups', 'UnitConversation');
  });

  it('should sync master data AND clear cache on Product update', () => {
      idbServiceSpy.deleteByPattern.and.returnValue(of(undefined));
      
      httpClient.post('/api/Product', {}).subscribe();
      const req = httpMock.expectOne('/api/Product');
      req.flush({});
      
      expect(idbServiceSpy.deleteByPattern).toHaveBeenCalledWith('lookups', 'Product');
      expect(idbServiceSpy.deleteByPattern).toHaveBeenCalledWith('master_data', CACHE_CONFIG.masterDataKeys.products);
      expect(cacheSyncServiceSpy.syncMasterData).toHaveBeenCalled();
  });

  it('should intercept product dropdown search and filter locally if master data exists', () => {
    const mockProducts = [
      { id: '1', name: 'Apple', barcode: 'A100', categoryId: 'cat1' },
      { id: '2', name: 'Banana', barcode: 'B200', categoryId: 'cat1' },
      { id: '3', name: 'Orange', barcode: 'O300', categoryId: 'cat2' }
    ];

    // Mock IDB to return master data
    idbServiceSpy.get.and.returnValue(of(mockProducts));

    // Request with query params
    httpClient.get('/api/product/dropdowns?name=app').subscribe(res => {
      expect(res).toBeTruthy();
      const products = res as any[];
      expect(products.length).toBe(1);
      expect(products[0].name).toBe('Apple');
    });

    // Expect NO network request to be made
    httpMock.expectNone('/api/product/dropdowns?name=app');
    
    expect(idbServiceSpy.get).toHaveBeenCalledWith('master_data', CACHE_CONFIG.masterDataKeys.products);
  });

  it('should fallback to network for product search if master data is missing', () => {
    // Mock IDB to return null
    idbServiceSpy.get.and.returnValue(of(null));

    httpClient.get('/api/product/dropdowns?name=test').subscribe(res => {
      expect(res).toBeTruthy();
    });

    // Expect network request
    const req = httpMock.expectOne('/api/product/dropdowns?name=test');
    req.flush([]);
  });

  it('should invalidate cache AND sync master data on Supplier update', () => {
      idbServiceSpy.deleteByPattern.and.returnValue(of(undefined));
      httpClient.post('/api/supplier', {}).subscribe();
      const req = httpMock.expectOne('/api/supplier');
      req.flush({});

      expect(idbServiceSpy.deleteByPattern).toHaveBeenCalledWith('lookups', 'supplier');
      expect(idbServiceSpy.deleteByPattern).toHaveBeenCalledWith('master_data', CACHE_CONFIG.masterDataKeys.suppliers);
      expect(cacheSyncServiceSpy.syncMasterData).toHaveBeenCalled();
  });

  it('should intercept Supplier Search and filter locally', () => {
    const mockSuppliers = [
      { id: '1', supplierName: 'Alpha Supply', mobileNo: '111' },
      { id: '2', supplierName: 'Beta Trade', mobileNo: '222' }
    ];
    idbServiceSpy.get.and.returnValue(of(mockSuppliers));

    httpClient.get('/api/SupplierSearch?searchQuery=alpha').subscribe(res => {
        expect(res).toBeTruthy();
        const list = res as any[];
        expect(list.length).toBe(1);
        expect(list[0].supplierName).toBe('Alpha Supply');
    });

    httpMock.expectNone('/api/SupplierSearch?searchQuery=alpha');
    expect(idbServiceSpy.get).toHaveBeenCalledWith('master_data', CACHE_CONFIG.masterDataKeys.suppliers);
  });

  it('should intercept Customer Search and filter locally', () => {
      const mockCustomers = [
        { id: '1', customerName: 'John Doe', mobileNo: '999' },
        { id: '2', customerName: 'Jane Smith', mobileNo: '888' }
      ];
      idbServiceSpy.get.and.returnValue(of(mockCustomers));
  
      httpClient.get('/api/customerSearch?searchQuery=jane').subscribe(res => {
          expect(res).toBeTruthy();
          const list = res as any[];
          expect(list.length).toBe(1);
          expect(list[0].customerName).toBe('Jane Smith');
      });
  
      httpMock.expectNone('/api/customerSearch?searchQuery=jane');
      expect(idbServiceSpy.get).toHaveBeenCalledWith('master_data', CACHE_CONFIG.masterDataKeys.customers);
    });

  it('should cache whitelisted lookup requests', () => {
    idbServiceSpy.get.and.returnValue(of(undefined)); // Cache miss

    httpClient.get('/api/UnitConversation').subscribe();

    const req = httpMock.expectOne('/api/UnitConversation');
    req.flush([{ id: 1, name: 'Unit' }]);

    expect(idbServiceSpy.put).toHaveBeenCalled();
  });

  it('should return cached lookup response if available', () => {
    const cachedData = [{ id: 1, name: 'Cached Unit' }];
    idbServiceSpy.get.and.returnValue(of(cachedData));

    httpClient.get('/api/UnitConversation').subscribe(res => {
      expect(res).toEqual(cachedData);
    });

    httpMock.expectNone('/api/UnitConversation');
  });
});
