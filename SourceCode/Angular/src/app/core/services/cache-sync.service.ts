import { Injectable, isDevMode } from '@angular/core';
import { ProductService } from '../../product/product.service';
import { SupplierService } from '../../supplier/supplier.service';
import { CustomerService } from '../../customer/customer.service';
import { IndexedDbService } from './indexed-db.service';
import { ProductResourceParameter } from '../domain-classes/product-resource-parameter';
import { SupplierResourceParameter } from '../domain-classes/supplier-resource-parameter';
import { CustomerResourceParameter } from '../domain-classes/customer-resource-parameter';
import { CACHE_CONFIG } from '../config/cache.config';
import { ToastrService } from './toastr.service';
import { firstValueFrom } from 'rxjs';
import { HttpResponse } from '@angular/common/http';
import { Supplier } from '@core/domain-classes/supplier';
import { Customer } from '@core/domain-classes/customer';
import { BusinessLocationService } from '../../business-location/business-location.service';

@Injectable({
  providedIn: 'root'
})
export class CacheSyncService {

  constructor(
    private productService: ProductService,
    private supplierService: SupplierService,
    private customerService: CustomerService,
    private idbService: IndexedDbService,
    private toastrService: ToastrService,
    private businessLocationService: BusinessLocationService
  ) { }

  async syncMasterData() {
    await Promise.all([
        this.syncProducts(),
        this.syncSuppliers(),
        this.syncCustomers(),
        this.syncLocations(),
    ]);
  }

  private async syncProducts() {
    try {
      const params = new ProductResourceParameter();
      params.pageSize = 10000;
      params.orderBy = 'name asc';
      const products = await firstValueFrom(this.productService.getProductsDropdown(params));
      if (products) {
        await firstValueFrom(this.idbService.put('master_data', CACHE_CONFIG.masterDataKeys.products, products));
        if (isDevMode()) console.log('Master Data (Products) Synced:', products.length);
      }
    } catch (error) {
      console.error('Failed to sync products', error);
    }
  }

  private async syncSuppliers() {
      try {
          const params = new SupplierResourceParameter();
          params.pageSize = 10000;
          params.orderBy = 'supplierName asc';
          
          const resp = await firstValueFrom(this.supplierService.getSuppliers(params)) as HttpResponse<Supplier[]>;
          if (resp && resp.body) {
              await firstValueFrom(this.idbService.put('master_data', CACHE_CONFIG.masterDataKeys.suppliers, resp.body));
              if (isDevMode()) console.log('Master Data (Suppliers) Synced:', resp.body.length);
          }
      } catch (error) {
          console.error('Failed to sync suppliers', error);
      }
  }

  private async syncCustomers() {
      try {
          const params = new CustomerResourceParameter();
          params.pageSize = 10000;
          params.orderBy = 'customerName asc';
          const resp = await firstValueFrom(this.customerService.getCustomers(params)) as HttpResponse<Customer[]>;
          if (resp && resp.body) {
              await firstValueFrom(this.idbService.put('master_data', CACHE_CONFIG.masterDataKeys.customers, resp.body));
              if (isDevMode()) console.log('Master Data (Customers) Synced:', resp.body.length);
          }
      } catch (error) {
          console.error('Failed to sync customers', error);
      }
  }

  async clearCache() {
      await firstValueFrom(this.idbService.clearDatabase());
      if (isDevMode()) console.log('Cache Cleared');
  }

  private async syncLocations() {
    try {
      // SecurityService.login() also calls getLocations() — because 'location' is
      // whitelisted in the HTTP interceptor, both calls share the same cached
      // response so only ONE actual network request is made.
      const locations = await firstValueFrom(this.businessLocationService.getLocations());
      if (locations && locations.length > 0) {
        if (isDevMode()) console.log('Master Data (Locations) Synced:', locations.length);
      }
    } catch (error) {
      console.error('Failed to sync locations', error);
    }
  }
}
