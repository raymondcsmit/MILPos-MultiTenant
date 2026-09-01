import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Location } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject, Subject, of, EMPTY } from 'rxjs';

import { CustomerDetailComponent } from './customer-detail.component';
import { CustomerService } from '../customer.service';
import { CustomerStore } from '../customer-store';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { environment } from '@environments/environment';
import { Customer } from '@core/domain-classes/customer';
import { City } from '@core/domain-classes/city';

describe('CustomerDetailComponent', () => {
  let component: CustomerDetailComponent;
  let fixture: ComponentFixture<CustomerDetailComponent>;
  let customerService: jasmine.SpyObj<CustomerService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let router: Router;
  let location: { back: jasmine.Spy };
  let routeData: Subject<{ customer?: Customer }>;

  const resolvedCustomer: Customer = {
    id: 'cust-9',
    customerName: 'Coke',
    contactPerson: 'Ali',
    mobileNo: '0300',
    phoneNo: '042',
    email: 'coke@x.com',
    website: 'coke.com',
    description: 'desc',
    taxNumber: 'TX1',
    imageUrl: '/uploads/cust.png',
    billingAddress: { id: 'ba1', address: 'Bill St', countryName: 'Pakistan', cityName: 'Lahore' },
    shippingAddress: { id: 'sa1', address: 'Ship St', countryName: 'Pakistan', cityName: 'Karachi' },
  } as unknown as Customer;

  function fillValidForm(): void {
    component.customerForm.patchValue({
      customerName: 'Cust A',
      mobileNo: '0300',
      email: 'a@b.com',
      billingAddress: { address: 'B1', countryName: 'Pakistan', cityName: 'Lahore' },
      shippingAddress: { address: 'S1', countryName: 'Pakistan', cityName: 'Karachi' },
    });
  }

  beforeEach(() => {
    customerService = jasmine.createSpyObj<CustomerService>('CustomerService', ['getCustomers', 'saveCustomer', 'updateCustomer']);
    customerService.getCustomers.and.returnValue(EMPTY);
    customerService.saveCustomer.and.callFake((c: Customer) => of({ ...c, id: 'new-1' } as Customer));
    customerService.updateCustomer.and.callFake((id: string, c: Customer) => of({ ...c, id } as Customer));
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getPageHelperText', 'getCountry', 'getCityByName']);
    commonService.getCountry.and.returnValue(of([{ id: 'pk', countryName: 'Pakistan' }, { id: 'ae', countryName: 'UAE' }]));
    commonService.getCityByName.and.returnValue(of([{ id: 'ct1', cityName: 'Lahore' } as City]));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    location = { back: jasmine.createSpy('back') };
    routeData = new Subject<{ customer?: Customer }>();

    TestBed.configureTestingModule({
      imports: [CustomerDetailComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { data: routeData.asObservable() } },
        { provide: Location, useValue: location },
        { provide: CustomerService, useValue: customerService },
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
    fixture = TestBed.createComponent(CustomerDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  }

  it('should create with empty form and load countries', () => {
    create();
    expect(component).toBeTruthy();
    expect(component.isDialog).toBeFalse();
    expect(component.customerForm.get('customerName')?.value).toBe('');
    expect(component.customerForm.invalid).toBeTrue();
    expect(component.countries.length).toBe(2);
  });

  it('route data patches form and prefixes image url', () => {
    create();
    routeData.next({ customer: resolvedCustomer });
    expect(component.customerForm.get('customerName')?.value).toBe('Coke');
    expect(component.customerForm.get('email')?.value).toBe('coke@x.com');
    expect(component.customerForm.get('billingAddress')?.get('address')?.value).toBe('Bill St');
    expect(component.imgSrc).toBe(environment.apiUrl + '/uploads/cust.png');
  });

  it('invalid submit marks controls touched and skips store', () => {
    create();
    spyOn(component.customerStore, 'addUpdateCustomer');
    component.onCustomerSubmit();
    expect(component.customerStore.addUpdateCustomer).not.toHaveBeenCalled();
    expect(component.customerForm.get('customerName')?.touched).toBeTrue();
    expect(component.customerForm.get('email')?.touched).toBeTrue();
  });

  it('valid new submit calls store addUpdateCustomer without id', fakeAsync(() => {
    create();
    tick(400);
    spyOn(component.customerStore, 'addUpdateCustomer');
    fillValidForm();
    component.onCustomerSubmit();
    expect(component.customerStore.addUpdateCustomer).toHaveBeenCalledWith(jasmine.objectContaining({
      id: '',
      customerName: 'Cust A',
      email: 'a@b.com',
      mobileNo: '0300',
      logo: null,
      isImageUpload: false,
    }));
  }));

  it('valid edit submit keeps resolved customer id and address ids', fakeAsync(() => {
    create();
    tick(400);
    routeData.next({ customer: resolvedCustomer });
    spyOn(component.customerStore, 'addUpdateCustomer');
    component.customerForm.patchValue({ customerName: 'Coke Max' });
    component.onCustomerSubmit();
    expect(component.customerStore.addUpdateCustomer).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 'cust-9',
      customerName: 'Coke Max',
      billingAddress: jasmine.objectContaining({ id: 'ba1' }),
      shippingAddress: jasmine.objectContaining({ id: 'sa1' }),
    }));
  }));

  it('successful save navigates back to list in page mode', fakeAsync(() => {
    create();
    tick(400);
    fillValidForm();
    component.onCustomerSubmit();
    fixture.detectChanges();
    tick();
    expect(component.customerStore.isAddUpdate()).toBeTrue();
    expect(customerService.saveCustomer).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/customer']);
    expect(location.back).not.toHaveBeenCalled();
  }));

  it('successful save closes dialog with saved customer in dialog mode', fakeAsync(() => {
    const dialogRef = { close: jasmine.createSpy('close') };
    create(dialogRef);
    tick(400);
    routeData.next({ customer: resolvedCustomer });
    component.customerForm.patchValue({ customerName: 'Coke Max' });
    component.onCustomerSubmit();
    fixture.detectChanges();
    tick();
    expect(component.customerStore.isAddUpdate()).toBeTrue();
    expect(customerService.updateCustomer).toHaveBeenCalledWith('cust-9', jasmine.objectContaining({ customerName: 'Coke Max' }));
    expect(dialogRef.close).toHaveBeenCalledWith(jasmine.objectContaining({ customerName: 'Coke Max' }));
    expect(router.navigate).not.toHaveBeenCalled();
  }));

  it('same as billing copies address plus contact and mobile', () => {
    create();
    component.customerForm.patchValue({
      contactPerson: 'Ali',
      mobileNo: '0300',
      billingAddress: { address: 'B1', countryName: 'Pakistan', cityName: 'Lahore' },
    });
    component.onSameAsBillingAddress({ checked: true });
    const shipping = component.customerForm.get('shippingAddress')?.value;
    expect(shipping.address).toBe('B1');
    expect(shipping.countryName).toBe('Pakistan');
    expect(shipping.contactPerson).toBe('Ali');
    expect(shipping.mobileNo).toBe('0300');
    component.onSameAsBillingAddress({ checked: false });
    expect(component.customerForm.get('shippingAddress')?.get('address')?.value).toBeNull();
  });

  it('onCountryChange clears city and queries cities for country', fakeAsync(() => {
    create();
    tick(400);
    component.onCountryChange({ value: 'Pakistan' }, 'billingAddress');
    expect(component.customerForm.get('billingAddress')?.get('cityName')?.value).toBe('');
    tick(1100);
    expect(commonService.getCityByName).toHaveBeenCalledWith('Pakistan', '');
    component.onCountryChange({ value: '' }, 'billingAddress');
    expect(component.cities.length).toBe(0);
  }));

  it('handleFilterCity fetches cities by country and city after debounce', fakeAsync(() => {
    create();
    tick(400);
    component.customerForm.patchValue({ billingAddress: { countryName: 'Pakistan', cityName: 'Lahore' } });
    component.handleFilterCity(null, 'billingAddress');
    tick(1100);
    expect(commonService.getCityByName).toHaveBeenCalledWith('Pakistan', 'Lahore');
    expect(component.cities.length).toBe(1);
  }));

  it('onCustomerList in page mode goes back', () => {
    create();
    component.onCustomerList();
    expect(location.back).toHaveBeenCalled();
  });

  it('onCustomerList in dialog mode closes dialog', () => {
    const dialogRef = { close: jasmine.createSpy('close') };
    create(dialogRef);
    component.onCustomerList(resolvedCustomer);
    expect(dialogRef.close).toHaveBeenCalledWith(resolvedCustomer);
  });
});
