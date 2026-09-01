import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { CustomerSalesOrderPaymentListComponent } from './customer-sales-order-payment-list.component';
import { CustomerSalesOrderService } from '../customer-sales-order.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { CommonService } from '@core/services/common.service';
import { CustomerSalesOrder } from '../customer-sales-order-list/customer-sales-order';
import { CustomerSalesOrderPayment } from './customer-sales-order-payment';

describe('CustomerSalesOrderPaymentListComponent', () => {
  let component: CustomerSalesOrderPaymentListComponent;
  let fixture: ComponentFixture<CustomerSalesOrderPaymentListComponent>;
  let customerSalesOrderService: jasmine.SpyObj<CustomerSalesOrderService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const order = { id: 'so1', customerId: 'c1', orderNumber: 'SO-1' } as unknown as CustomerSalesOrder;

  const payments: CustomerSalesOrderPayment[] = [
    { id: 'p1', orderNumber: 'SO-1', soCreatedDate: '2026-01-01T00:00:00Z', totalAmount: 100, totalTax: 10, totalDiscount: 5, totalPaidAmount: 50, remainingAmount: 50, paymentStatus: 1 } as unknown as CustomerSalesOrderPayment,
    { id: 'p2', orderNumber: 'SO-2', soCreatedDate: '2026-01-02T00:00:00Z', totalAmount: 200, totalTax: 20, totalDiscount: 0, totalPaidAmount: 200, remainingAmount: 0, paymentStatus: 0 } as unknown as CustomerSalesOrderPayment,
  ];

  beforeEach(async () => {
    customerSalesOrderService = jasmine.createSpyObj<CustomerSalesOrderService>('CustomerSalesOrderService', ['getCustomerSalesOrderPayments']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    await TestBed.configureTestingModule({
      imports: [CustomerSalesOrderPaymentListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        { provide: CustomerSalesOrderService, useValue: customerSalesOrderService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: TranslationService, useValue: translationService },
        {
          provide: SecurityService,
          useValue: Object.assign(jasmine.createSpyObj('SecurityService', ['hasClaim']), { currencyCode: 'USD' }),
        },
      ],
    }).compileComponents();
  });

  function create(): void {
    fixture = TestBed.createComponent(CustomerSalesOrderPaymentListComponent);
    component = fixture.componentInstance;
  }

  it('should create', () => {
    customerSalesOrderService.getCustomerSalesOrderPayments.and.returnValue(of([]));
    create();
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(customerSalesOrderService.getCustomerSalesOrderPayments).not.toHaveBeenCalled();
  });

  it('customerSalesOrder input change loads pending payments by customer id', () => {
    customerSalesOrderService.getCustomerSalesOrderPayments.and.returnValue(of(payments));
    create();
    fixture.componentRef.setInput('customerSalesOrder', order);
    fixture.detectChanges();
    expect(customerSalesOrderService.getCustomerSalesOrderPayments).toHaveBeenCalledWith('c1');
    expect(component.customerSalesOrderPayments.length).toBe(2);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('SO-1');
    expect(text).toContain('SO-2');
  });

  it('rebinding a new order reloads payments for the new customer', () => {
    customerSalesOrderService.getCustomerSalesOrderPayments.and.returnValues(of(payments), of([payments[0]]));
    create();
    fixture.componentRef.setInput('customerSalesOrder', order);
    fixture.detectChanges();
    fixture.componentRef.setInput('customerSalesOrder', { ...order, customerId: 'c2' });
    fixture.detectChanges();
    expect(customerSalesOrderService.getCustomerSalesOrderPayments).toHaveBeenCalledWith('c2');
    expect(component.customerSalesOrderPayments.length).toBe(1);
  });

  it('renders currency and payment status columns', () => {
    customerSalesOrderService.getCustomerSalesOrderPayments.and.returnValue(of(payments));
    create();
    fixture.componentRef.setInput('customerSalesOrder', order);
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('$100.00');
    expect(text).toContain('$50.00');
    expect(text).toContain('TRANSLATED');
  });

  it('getDataIndex and isOddDataRow resolve row positions', () => {
    customerSalesOrderService.getCustomerSalesOrderPayments.and.returnValue(of(payments));
    create();
    fixture.componentRef.setInput('customerSalesOrder', order);
    fixture.detectChanges();
    expect(component.getDataIndex(payments[1])).toBe(1);
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.isOddDataRow(0)).toBeFalse();
  });

  it('empty payments renders table without rows', () => {
    customerSalesOrderService.getCustomerSalesOrderPayments.and.returnValue(of([]));
    create();
    fixture.componentRef.setInput('customerSalesOrder', order);
    fixture.detectChanges();
    expect(component.customerSalesOrderPayments.length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('tbody tr[mat-row]').length).toBe(0);
  });
});
