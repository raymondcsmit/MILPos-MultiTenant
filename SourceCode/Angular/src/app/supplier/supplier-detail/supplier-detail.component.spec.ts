import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject, Subject, of, EMPTY } from 'rxjs';

import { SupplierDetailComponent } from './supplier-detail.component';
import { SupplierService } from '../supplier.service';
import { SupplierStore } from '../supplier-store';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { environment } from '@environments/environment';
import { Supplier } from '@core/domain-classes/supplier';
import { City } from '@core/domain-classes/city';

describe('SupplierDetailComponent', () => {
  let component: SupplierDetailComponent;
  let fixture: ComponentFixture<SupplierDetailComponent>;
  let supplierService: jasmine.SpyObj<SupplierService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let router: Router;
  let routeData: Subject<{ supplier?: Supplier }>;

  const resolvedSupplier: Supplier = {
    id: 'sup-9',
    supplierName: 'Acme',
    contactPerson: 'Bo',
    mobileNo: '0300',
    email: 'acme@x.com',
    taxNumber: 'TX1',
    imageUrl: '/uploads/sup.png',
    billingAddress: { id: 'ba1', address: 'Bill St', countryName: 'Pakistan', cityName: 'Lahore' },
    shippingAddress: { id: 'sa1', address: 'Ship St', countryName: 'Pakistan', cityName: 'Karachi' },
  } as unknown as Supplier;

  function fillValidForm(): void {
    component.supplierForm.patchValue({
      supplierName: 'Sup A',
      email: 'a@b.com',
      billingAddress: { address: 'B1', countryName: 'Pakistan', cityName: 'Lahore' },
      shippingAddress: { address: 'S1', countryName: 'Pakistan', cityName: 'Karachi' },
    });
  }

  beforeEach(() => {
    supplierService = jasmine.createSpyObj<SupplierService>('SupplierService', ['getSuppliers', 'saveSupplier', 'updateSupplier']);
    supplierService.getSuppliers.and.returnValue(EMPTY);
    supplierService.saveSupplier.and.callFake((s: Supplier) => of({ ...s, id: 'new-1' } as Supplier));
    supplierService.updateSupplier.and.returnValue(of(resolvedSupplier));
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getPageHelperText', 'getCountry', 'getCityByName']);
    commonService.getCountry.and.returnValue(of([{ id: 'pk', countryName: 'Pakistan' }, { id: 'ae', countryName: 'UAE' }]));
    commonService.getCityByName.and.returnValue(of([{ id: 'ct1', cityName: 'Lahore' } as City]));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    routeData = new Subject<{ supplier?: Supplier }>();

    TestBed.configureTestingModule({
      imports: [SupplierDetailComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { data: routeData.asObservable() } },
        { provide: SupplierService, useValue: supplierService },
        { provide: CommonService, useValue: commonService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
      ],
    });
  });

  function create(dialogRef?: { close: jasmine.Spy }): void {
    if (dialogRef) {
      TestBed.overrideProvider(MatDialogRef, { useValue: dialogRef });
    }
    fixture = TestBed.createComponent(SupplierDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  }

  it('should create with empty form and load countries', () => {
    create();
    expect(component).toBeTruthy();
    expect(component.isDialog).toBeFalse();
    expect(component.supplierForm.get('supplierName')?.value).toBe('');
    expect(component.supplierForm.get('email')?.value).toBe('');
    expect(component.supplierForm.invalid).toBeTrue();
    expect(component.countries.length).toBe(2);
  });

  it('route data patches form, title and image url', () => {
    create();
    routeData.next({ supplier: resolvedSupplier });
    expect(component.titlePage).toBe('TRANSLATED');
    expect(component.supplierForm.get('supplierName')?.value).toBe('Acme');
    expect(component.supplierForm.get('billingAddress')?.get('address')?.value).toBe('Bill St');
    expect(component.imgSrc).toBe(environment.apiUrl + '/uploads/sup.png');
  });

  it('invalid submit marks controls touched and skips store', () => {
    create();
    spyOn(component.supplierStore, 'addSupplier');
    spyOn(component.supplierStore, 'updateSupplier');
    component.onSupplierSubmit();
    expect(component.supplierStore.addSupplier).not.toHaveBeenCalled();
    expect(component.supplierStore.updateSupplier).not.toHaveBeenCalled();
    expect(component.supplierForm.get('supplierName')?.touched).toBeTrue();
  });

  it('valid new submit calls store addSupplier', fakeAsync(() => {
    create();
    tick(400);
    spyOn(component.supplierStore, 'addSupplier');
    spyOn(component.supplierStore, 'updateSupplier');
    fillValidForm();
    component.onSupplierSubmit();
    expect(component.supplierStore.addSupplier).toHaveBeenCalledWith(jasmine.objectContaining({
      id: '',
      supplierName: 'Sup A',
      email: 'a@b.com',
      logo: null,
      isImageUpload: false,
    }));
    expect(component.supplierStore.updateSupplier).not.toHaveBeenCalled();
  }));

  it('valid edit submit calls store updateSupplier with resolved id', fakeAsync(() => {
    create();
    tick(400);
    routeData.next({ supplier: resolvedSupplier });
    spyOn(component.supplierStore, 'updateSupplier');
    spyOn(component.supplierStore, 'addSupplier');
    component.supplierForm.patchValue({ supplierName: 'Acme Max' });
    component.onSupplierSubmit();
    expect(component.supplierStore.updateSupplier).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 'sup-9',
      supplierName: 'Acme Max',
    }));
    expect(component.supplierStore.addSupplier).not.toHaveBeenCalled();
  }));

  it('successful add navigates back to list in page mode', fakeAsync(() => {
    create();
    tick(400);
    fillValidForm();
    component.onSupplierSubmit();
    fixture.detectChanges();
    tick();
    expect(component.supplierStore.isAddUpdate()).toBeTrue();
    expect(supplierService.saveSupplier).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/supplier']);
  }));

  it('successful update closes dialog with current supplier in dialog mode', fakeAsync(() => {
    const dialogRef = { close: jasmine.createSpy('close') };
    create(dialogRef);
    tick(400);
    routeData.next({ supplier: resolvedSupplier });
    component.supplierForm.patchValue({ supplierName: 'Acme Max' });
    component.onSupplierSubmit();
    fixture.detectChanges();
    tick();
    expect(component.supplierStore.isAddUpdate()).toBeTrue();
    expect(supplierService.updateSupplier).toHaveBeenCalledWith('sup-9', jasmine.objectContaining({ supplierName: 'Acme Max' }));
    expect(dialogRef.close).toHaveBeenCalledWith(jasmine.objectContaining({ supplierName: 'Acme Max' }));
    expect(router.navigate).not.toHaveBeenCalled();
  }));

  it('same as billing copies address, unchecked resets it', () => {
    create();
    component.supplierForm.patchValue({ billingAddress: { address: 'B1', countryName: 'Pakistan', cityName: 'Lahore' } });
    component.onSameAsBillingAddress({ checked: true } as any);
    const shipping = component.supplierForm.get('shippingAddress')?.value;
    expect(shipping.address).toBe('B1');
    expect(shipping.cityName).toBe('Lahore');
    component.onSameAsBillingAddress({ checked: false } as any);
    expect(component.supplierForm.get('shippingAddress')?.get('address')?.value).toBeNull();
  });

  it('onCountryChange clears city and queries cities for country', fakeAsync(() => {
    create();
    tick(400);
    component.onCountryChange({ value: 'Pakistan' }, 'billingAddress');
    expect(component.supplierForm.get('billingAddress')?.get('cityName')?.value).toBe('');
    tick(1100);
    expect(commonService.getCityByName).toHaveBeenCalledWith('Pakistan', '');
    component.onCountryChange({ value: '' }, 'billingAddress');
    expect(component.cities.length).toBe(0);
  }));

  it('handleFilterCity fetches cities by country and city after debounce', fakeAsync(() => {
    create();
    tick(400);
    component.supplierForm.patchValue({ billingAddress: { countryName: 'Pakistan', cityName: 'Lahore' } });
    component.handleFilterCity(null, 'billingAddress');
    tick(1100);
    expect(commonService.getCityByName).toHaveBeenCalledWith('Pakistan', 'Lahore');
    expect(component.cities.length).toBe(1);
  }));

  it('onSupplierList navigates to list in page mode', () => {
    create();
    component.onSupplierList();
    expect(router.navigate).toHaveBeenCalledWith(['/supplier']);
  });

  it('onSupplierList closes dialog in dialog mode', () => {
    const dialogRef = { close: jasmine.createSpy('close') };
    create(dialogRef);
    component.onSupplierList();
    expect(dialogRef.close).toHaveBeenCalled();
  });
});
