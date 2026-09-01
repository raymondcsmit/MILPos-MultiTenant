import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HttpResponse } from '@angular/common/http';

import { CacheSyncService } from './cache-sync.service';
import { ProductService } from '../../product/product.service';
import { SupplierService } from '../../supplier/supplier.service';
import { CustomerService } from '../../customer/customer.service';
import { IndexedDbService } from './indexed-db.service';
import { ToastrService } from './toastr.service';
import { BusinessLocationService } from '../../business-location/business-location.service';
import { CACHE_CONFIG } from '../config/cache.config';

describe('CacheSyncService', () => {
  let service: CacheSyncService;
  let productService: jasmine.SpyObj<ProductService>;
  let supplierService: jasmine.SpyObj<SupplierService>;
  let customerService: jasmine.SpyObj<CustomerService>;
  let idbService: jasmine.SpyObj<IndexedDbService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let businessLocationService: jasmine.SpyObj<BusinessLocationService>;

  beforeEach(() => {
    productService = jasmine.createSpyObj<ProductService>('ProductService', ['getProductsDropdown']);
    supplierService = jasmine.createSpyObj<SupplierService>('SupplierService', ['getSuppliers']);
    customerService = jasmine.createSpyObj<CustomerService>('CustomerService', ['getCustomers']);
    idbService = jasmine.createSpyObj<IndexedDbService>('IndexedDbService', ['put', 'clearDatabase']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    businessLocationService = jasmine.createSpyObj<BusinessLocationService>('BusinessLocationService', ['getLocations']);

    TestBed.configureTestingModule({
      providers: [
        CacheSyncService,
        { provide: ProductService, useValue: productService },
        { provide: SupplierService, useValue: supplierService },
        { provide: CustomerService, useValue: customerService },
        { provide: IndexedDbService, useValue: idbService },
        { provide: ToastrService, useValue: toastr },
        { provide: BusinessLocationService, useValue: businessLocationService },
      ],
    });
    service = TestBed.inject(CacheSyncService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('syncMasterData', () => {
    it('syncs products, suppliers, customers and locations', async () => {
      const products = [{ id: 'p1', name: 'A' }];
      const suppliers: any = [{ id: 's1', companyName: 'S' }];
      const customers: any = [{ id: 'c1', customerName: 'C' }];
      const locations = [{ id: 'l1', name: 'L' }];

      productService.getProductsDropdown.and.returnValue(of(products) as any);
      supplierService.getSuppliers.and.returnValue(of(new HttpResponse({ body: suppliers })) as any);
      customerService.getCustomers.and.returnValue(of(new HttpResponse({ body: customers })) as any);
      businessLocationService.getLocations.and.returnValue(of(locations) as any);
      idbService.put.and.returnValue(of(undefined));
      idbService.clearDatabase.and.returnValue(of(undefined));

      await service.syncMasterData();

      const p = productService.getProductsDropdown.calls.mostRecent().args[0] as any;
      expect(p.pageSize).toBe(10000);
      expect(p.orderBy).toBe('name asc');
      expect(idbService.put).toHaveBeenCalledWith('master_data', CACHE_CONFIG.masterDataKeys.products, products);
      expect(idbService.put).toHaveBeenCalledWith('master_data', CACHE_CONFIG.masterDataKeys.suppliers, suppliers);
      expect(idbService.put).toHaveBeenCalledWith('master_data', CACHE_CONFIG.masterDataKeys.customers, customers);
      expect(businessLocationService.getLocations).toHaveBeenCalled();
    });

    it('tolerates product sync failure', async () => {
      productService.getProductsDropdown.and.throwError('boom');
      const spy = spyOn(console, 'error');
      supplierService.getSuppliers.and.returnValue(of(new HttpResponse({ body: [] })) as any);
      customerService.getCustomers.and.returnValue(of(new HttpResponse({ body: [] })) as any);
      businessLocationService.getLocations.and.returnValue(of([]) as any);
      idbService.put.and.returnValue(of(undefined));

      await service.syncMasterData();
      expect(spy).toHaveBeenCalled();
    });

    it('skips IDB put when products response is empty/null', async () => {
      productService.getProductsDropdown.and.returnValue(of(null) as any);
      supplierService.getSuppliers.and.returnValue(of(new HttpResponse({ body: null })) as any);
      customerService.getCustomers.and.returnValue(of(new HttpResponse({ body: null })) as any);
      businessLocationService.getLocations.and.returnValue(of([]) as any);

      await service.syncMasterData();
      expect(idbService.put).not.toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('clears the database', async () => {
      idbService.clearDatabase.and.returnValue(of(undefined));
      await service.clearCache();
      expect(idbService.clearDatabase).toHaveBeenCalled();
    });
  });
});
