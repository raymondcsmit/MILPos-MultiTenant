import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpResponse } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { ProductStockBulkUpdateComponent } from './product-stock-bulk-update.component';
import { InventoryService } from '../inventory.service';
import { CommonService } from '@core/services/common.service';
import { TaxService } from '@core/services/tax.service';
import { ToastrService } from '@core/services/toastr.service';
import { SecurityService } from '@core/security/security.service';
import { Inventory } from '@core/domain-classes/inventory';

describe('ProductStockBulkUpdateComponent', () => {
  let component: ProductStockBulkUpdateComponent;
  let fixture: ComponentFixture<ProductStockBulkUpdateComponent>;
  let inventoryService: jasmine.SpyObj<InventoryService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let taxService: jasmine.SpyObj<TaxService>;
  let toastrService: jasmine.SpyObj<ToastrService>;

  const inventories: Inventory[] = [
    { id: 'i1', productId: 'p1', productName: 'Coke', categoryName: 'Drinks', brandName: 'B1', unitId: 'u1', averageSalesPrice: 10 } as unknown as Inventory,
    { id: 'i2', productId: 'p2', productName: 'Pepsi', categoryName: 'Drinks', brandName: 'B2', unitId: 'u2', averageSalesPrice: 11 } as unknown as Inventory,
    { id: 'i3', productId: 'p3', productName: 'Chips', categoryName: 'Food', brandName: 'B1', unitId: 'u3', averageSalesPrice: 5 } as unknown as Inventory,
  ];

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getInventories', 'bulkUpdateProductStock']);
    inventoryService.getInventories.and.returnValue(of(new HttpResponse<Inventory[]>({ body: inventories })));
    inventoryService.bulkUpdateProductStock.and.returnValue(of({ success: true }));
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForCurrentUser']);
    commonService.getLocationsForCurrentUser.and.returnValue(of({ locations: [{ id: 'loc1', name: 'Main' }], selectedLocation: 'loc1' } as any));
    taxService = jasmine.createSpyObj<TaxService>('TaxService', ['getAll']);
    taxService.getAll.and.returnValue(of([{ id: 't1', name: 'GST', percentage: 17 }]));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning', 'info']);

    TestBed.configureTestingModule({
      imports: [ProductStockBulkUpdateComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: InventoryService, useValue: inventoryService },
        { provide: CommonService, useValue: commonService },
        { provide: TaxService, useValue: taxService },
        { provide: ToastrService, useValue: toastrService },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
      ],
    });
    fixture = TestBed.createComponent(ProductStockBulkUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load locations, taxes and products for the first location', () => {
    expect(component).toBeTruthy();
    expect(component.locations.length).toBe(1);
    expect(component.currentUpdate.locationId).toBe('loc1');
    expect(component.taxes.length).toBe(1);
    expect(component.allProducts.length).toBe(3);
    expect(component.loading).toBeFalse();
    expect(inventoryService.getInventories).toHaveBeenCalledWith(jasmine.objectContaining({ locationId: 'loc1', pageSize: 1000, orderBy: 'productName asc' }));
  });

  it('groups products by category by default and regroups by brand', () => {
    expect(component.groupedData.get('Drinks')?.length).toBe(2);
    expect(component.groupedData.get('Food')?.length).toBe(1);
    component.onGroupByChange('Brand');
    expect(component.groupedData.get('B1')?.length).toBe(2);
    expect(component.groupedData.get('B2')?.length).toBe(1);
  });

  it('search filters grouped products by name', () => {
    component.onSearch('co');
    expect(component.groupedData.get('Drinks')?.length).toBe(1);
    expect(component.groupedData.get('Drinks')?.[0].productName).toBe('Coke');
    component.onSearch('chip');
    expect(component.groupedData.get('Food')?.length).toBe(1);
    expect(component.groupedData.has('Drinks')).toBeFalse();
  });

  it('selectProduct seeds the update form from the product', () => {
    component.selectProduct(inventories[0]);
    expect(component.selectedProduct).toBe(inventories[0]);
    expect(component.currentUpdate.productId).toBe('p1');
    expect(component.currentUpdate.unitId).toBe('u1');
    expect(component.currentUpdate.pricePerUnit).toBe(10);
    expect(component.currentUpdate.currentStock).toBe(0);
  });

  it('addToQueue validates quantity and reference number', () => {
    component.selectProduct(inventories[0]);
    component.currentUpdate.currentStock = 0;
    component.addToQueue();
    expect(toastrService.warning).toHaveBeenCalledWith('Quantity must be greater than 0');
    component.currentUpdate.currentStock = 3;
    component.addToQueue();
    expect(toastrService.warning).toHaveBeenCalledWith('Reference Number is required');
    expect(component.pendingUpdates.length).toBe(0);
  });

  it('addToQueue pushes signed quantity with tax for add and remove', () => {
    component.selectProduct(inventories[0]);
    component.currentUpdate.currentStock = 3;
    component.currentUpdate.referenceNumber = 'REF-1';
    component.selectedTaxId = 't1';
    component.addToQueue();
    expect(component.pendingUpdates.length).toBe(1);
    expect(component.pendingUpdates[0].currentStock).toBe(3);
    expect(component.pendingUpdates[0].productTaxes).toEqual([{ taxId: 't1', taxName: 'GST', percentage: 17 }]);
    expect(toastrService.info).toHaveBeenCalledWith('Added to queue');
    expect(component.currentUpdate.currentStock).toBe(0);
    component.currentUpdateOperation = 'remove';
    component.currentUpdate.currentStock = 2;
    component.currentUpdate.referenceNumber = 'REF-2';
    component.addToQueue();
    expect(component.pendingUpdates[1].currentStock).toBe(-2);
  });

  it('removeFromQueue and hasPendingUpdate manage the queue', () => {
    component.selectProduct(inventories[0]);
    component.currentUpdate.currentStock = 1;
    component.currentUpdate.referenceNumber = 'R';
    component.addToQueue();
    expect(component.hasPendingUpdate('p1')).toBeTrue();
    expect(component.getProductName('p1')).toBe('Coke');
    expect(component.getLocationName('loc1')).toBe('Main');
    expect(component.getLocationName('nope')).toBe('Unknown');
    component.removeFromQueue(0);
    expect(component.hasPendingUpdate('p1')).toBeFalse();
  });

  it('saveAllChanges posts the queue, clears it and reloads products on success', () => {
    component.selectProduct(inventories[0]);
    component.currentUpdate.currentStock = 4;
    component.currentUpdate.referenceNumber = 'REF-1';
    component.addToQueue();
    component.saveAllChanges();
    expect(inventoryService.bulkUpdateProductStock).toHaveBeenCalledWith(jasmine.objectContaining({ stockUpdates: jasmine.anything() }));
    expect(component.pendingUpdates.length).toBe(0);
    expect(toastrService.success).toHaveBeenCalledWith('Stock updated successfully');
    expect(inventoryService.getInventories).toHaveBeenCalledTimes(2);
    expect(component.saving).toBeFalse();
  });

  it('saveAllChanges without queue is a no-op', () => {
    component.saveAllChanges();
    expect(inventoryService.bulkUpdateProductStock).not.toHaveBeenCalled();
  });

  it('failed bulk update reports error and keeps the queue', () => {
    inventoryService.bulkUpdateProductStock.and.returnValue(of({ success: false }));
    component.selectProduct(inventories[0]);
    component.currentUpdate.currentStock = 1;
    component.currentUpdate.referenceNumber = 'R';
    component.addToQueue();
    component.saveAllChanges();
    expect(toastrService.error).toHaveBeenCalledWith('Failed to update stock');
    expect(component.pendingUpdates.length).toBe(1);
  });

  it('errored bulk update reports save failure', () => {
    inventoryService.bulkUpdateProductStock.and.returnValue(throwError(() => ({ message: 'boom' })));
    component.selectProduct(inventories[0]);
    component.currentUpdate.currentStock = 1;
    component.currentUpdate.referenceNumber = 'R';
    component.addToQueue();
    component.saveAllChanges();
    expect(toastrService.error).toHaveBeenCalledWith('Failed to save stock');
    expect(component.saving).toBeFalse();
  });

  it('product load failure reports error and clears loading', () => {
    inventoryService.getInventories.and.returnValue(throwError(() => ({ message: 'boom' })));
    component.loadProducts();
    expect(toastrService.error).toHaveBeenCalledWith('Failed to load products');
    expect(component.loading).toBeFalse();
  });
});

