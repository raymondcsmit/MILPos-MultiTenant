import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { UntypedFormArray, UntypedFormBuilder } from '@angular/forms';
import { HttpResponse } from '@angular/common/http';
import { BehaviorSubject, of } from 'rxjs';

import { ManageDamagedStockComponent } from './manage-damaged-stock.component';
import { DamagedStore } from '../damaged-store';
import { DamagedStockService } from '../damaged-stock.service';
import { ProductService } from '../../product/product.service';
import { InventoryService } from '../../inventory/inventory.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { DamagedStock } from '@core/domain-classes/damaged-stock';
import { Product } from '@core/domain-classes/product';
import { User } from '@core/domain-classes/user';
import { UnitConversation } from '@core/domain-classes/unit-conversation';

describe('ManageDamagedStockComponent', () => {
  let component: ManageDamagedStockComponent;
  let fixture: ComponentFixture<ManageDamagedStockComponent>;
  let productService: jasmine.SpyObj<ProductService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let inventoryService: jasmine.SpyObj<InventoryService>;
  let router: Router;
  let fb: UntypedFormBuilder;

  const users: User[] = [{ id: 'u1', userName: 'admin' } as unknown as User];
  const products: Product[] = [{ id: 'p1', name: 'Coke', unitId: 'u1', productUrl: '/p.png' } as unknown as Product];
  const units: UnitConversation[] = [{ id: 'u1', name: 'Pcs' } as unknown as UnitConversation];

  beforeEach(() => {
    productService = jasmine.createSpyObj<ProductService>('ProductService', ['getProductsDropdown']);
    productService.getProductsDropdown.and.returnValue(of(products));
    const damagedStockService = jasmine.createSpyObj<DamagedStockService>('DamagedStockService', ['getDamagedStocks', 'addDamagedStock']);
    damagedStockService.getDamagedStocks.and.returnValue(of(new HttpResponse<DamagedStock[]>({ body: [] })));
    damagedStockService.addDamagedStock.and.returnValue(of({ id: 'd9' } as DamagedStock));
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getInventories', 'getInventoryByProductId']);
    inventoryService.getInventoryByProductId.and.returnValue(of(9));
    commonService = jasmine.createSpyObj<CommonService>('CommonService', [
      'getPageHelperText', 'getLocationsForCurrentUser', 'getAllUsers', 'getUsers',
    ]);
    commonService.getLocationsForCurrentUser.and.returnValue(of({ locations: [{ id: 'loc1', name: 'Main' }], selectedLocation: 'loc1' } as any));
    commonService.getAllUsers.and.returnValue(of(users));
    commonService.getUsers.and.returnValue(of(users));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    TestBed.configureTestingModule({
      imports: [ManageDamagedStockComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideNativeDateAdapter(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { units }, paramMap: { get: () => null }, queryParamMap: { get: () => null }, routeConfig: { path: 'damaged-stock' } } } },
        { provide: ProductService, useValue: productService },
        { provide: DamagedStockService, useValue: damagedStockService },
        { provide: InventoryService, useValue: inventoryService },
        { provide: CommonService, useValue: commonService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
      ],
    });
    router = TestBed.inject(Router);
    fb = TestBed.inject(UntypedFormBuilder);
    spyOn(router, 'navigate');
  });

  function create(): void {
    fixture = TestBed.createComponent(ManageDamagedStockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create with form defaults, users and first location', () => {
    create();
    expect(component).toBeTruthy();
    expect(component.damagedForm.get('damagedDate')?.value).toEqual(component.CurrentDate);
    expect(component.damagedForm.get('locationId')?.value).toBe('loc1');
    expect(component.damagedForm.get('reportedId')?.value).toBe('u1');
    expect(component.users.length).toBe(1);
    expect(component.damagedStockItemsArray.length).toBe(0);
  });

  it('invalid submit marks touched and skips the store', () => {
    create();
    component.damagedForm.patchValue({ locationId: '' });
    spyOn(component.damagedStore, 'addUpdateDamagedStock');
    component.onDamagedSubmit();
    expect(component.damagedStore.addUpdateDamagedStock).not.toHaveBeenCalled();
    expect(component.damagedForm.get('locationId')?.touched).toBeTrue();
  });

  it('submit with no items shows error toast and skips the store', () => {
    create();
    spyOn(component.damagedStore, 'addUpdateDamagedStock');
    component.damagedForm.patchValue({ reportedId: 'u1', locationId: 'loc1' });
    component.onDamagedSubmit();
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
    expect(component.damagedStore.addUpdateDamagedStock).not.toHaveBeenCalled();
  });

  it('submit with an item posts damaged stock through the store', () => {
    create();
    spyOn(component.damagedStore, 'addUpdateDamagedStock');
    component.damagedForm.patchValue({ reportedId: 'u1', locationId: 'loc1', reason: 'Dropped' });
    (component.damagedForm.get('damagedStockItems') as UntypedFormArray).push(fb.group({
      productId: ['p1'],
      productName: ['Coke'],
      productUrl: [''],
      stock: [{ value: 5, disabled: true }],
      damagedQuantity: [2],
      unitId: ['u1'],
    }));
    component.onDamagedSubmit();
    expect(component.damagedStore.addUpdateDamagedStock).toHaveBeenCalledWith(jasmine.objectContaining({
      reportedId: 'u1',
      locationId: 'loc1',
      reason: 'Dropped',
      damagedStockItems: [{ productId: 'p1', damagedQuantity: 2, unitId: 'u1' }],
    }));
  });

  it('onLocationChange clears items and reason', () => {
    create();
    component.damagedForm.patchValue({ reason: 'Dropped' });
    (component.damagedForm.get('damagedStockItems') as UntypedFormArray).push(fb.group({ productId: 'p1' }));
    component.onLocationChange();
    expect(component.damagedStockItemsArray.length).toBe(0);
    expect(component.damagedForm.get('reason')?.value).toBe('');
  });

  it('product name changes query the dropdown after debounce', fakeAsync(() => {
    create();
    tick();
    component.productNameControl.setValue('Cok');
    tick(1100);
    expect(productService.getProductsDropdown).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Cok', pageSize: 10 }));
  }));

  it('barcode changes query the dropdown after debounce', fakeAsync(() => {
    create();
    tick();
    component.barCodeNameControl.setValue('BC1');
    tick(600);
    expect(productService.getProductsDropdown).toHaveBeenCalledWith(jasmine.objectContaining({ barcode: 'BC1' }));
  }));

  it('store addUpdate flip navigates back to the list', fakeAsync(() => {
    create();
    tick(400);
    component.damagedStore.addUpdateDamagedStock({
      id: '', reportedId: 'u1', reason: '', damagedDate: new Date(), locationId: 'loc1',
      damagedStockItems: [{ productId: 'p1', damagedQuantity: 1, unitId: 'u1' }],
    } as any);
    tick();
    expect(component.damagedStore.isAddUpdate()).toBeTrue();
    fixture.detectChanges();
    tick(400);
    expect(router.navigate).toHaveBeenCalledWith(['/damaged-stock/list']);
  }));
});
