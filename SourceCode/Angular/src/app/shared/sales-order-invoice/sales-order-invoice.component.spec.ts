import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { CurrencyPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { SalesOrderInvoiceComponent } from './sales-order-invoice.component';
import { SecurityService } from '@core/security/security.service';
import { CompanyProfile } from '@core/domain-classes/company-profile';
import { SalesOrder } from '@core/domain-classes/sales-order';

describe('SalesOrderInvoiceComponent', () => {
  let component: SalesOrderInvoiceComponent;
  let fixture: ComponentFixture<SalesOrderInvoiceComponent>;
  let securityService: jasmine.SpyObj<SecurityService>;
  let companyProfile$: Subject<CompanyProfile | null>;

  const buildOrder = (isRequest = false) =>
    ({
      orderNumber: 'SO-1',
      soCreatedDate: '2026-01-01T00:00:00Z',
      isSalesOrderRequest: isRequest,
      paymentStatus: 0,
      totalDiscount: 1,
      totalTax: 2,
      totalAmount: 100,
      totalPaidAmount: 50,
      totalRefundAmount: 0,
      location: { name: 'Main', address: 'St 1', mobile: '0300', email: 'a@b.c' },
      customer: { customerName: 'Coke', mobileNo: '0311' },
      termAndCondition: 'T&C',
      note: 'note',
      salesOrderItems: [
        { status: 0, quantity: 5, unitPrice: 10, discount: 1, taxValue: 2, product: { name: 'Coke' }, unitConversation: { name: 'pcs' }, salesOrderItemTaxes: [] },
        { status: 1, quantity: 3, unitPrice: 10, discount: 0, taxValue: 0, product: { name: 'Pepsi' }, unitConversation: { name: 'pcs' }, salesOrderItemTaxes: [] },
      ],
    }) as unknown as SalesOrder;

  beforeEach(async () => {
    companyProfile$ = new Subject<CompanyProfile | null>();
    securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);
    (securityService as any).companyProfile = companyProfile$.asObservable();
    (securityService as any).currencyCode = 'USD';

    TestBed.configureTestingModule({
      imports: [SalesOrderInvoiceComponent, TranslateModule.forRoot()],
      providers: [{ provide: SecurityService, useValue: securityService }, CurrencyPipe],
    }).compileComponents();

    fixture = TestBed.createComponent(SalesOrderInvoiceComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    Array.from(document.body.querySelectorAll('app-sales-order-invoice')).forEach(el => {
      if (el.parentElement === document.body) {
        document.body.removeChild(el);
      }
    });
    Array.from(document.body.querySelectorAll('iframe')).forEach(el => {
      if (el.parentElement === document.body) {
        document.body.removeChild(el);
      }
    });
  });

  it('should create and receive company profile from security stream', fakeAsync(() => {
    fixture.componentRef.setInput('salesOrder', buildOrder());
    fixture.componentRef.setInput('sendEmail', false);
    fixture.detectChanges();
    tick(4000);
    flush();
    expect(component).toBeTruthy();
    expect(component.salesOrderItems.length).toBe(1);
    companyProfile$.next({ taxName: 'GST', taxNumber: 'T1' } as CompanyProfile);
    fixture.detectChanges();
    expect(component.companyProfile).toEqual(jasmine.objectContaining({ taxName: 'GST', taxNumber: 'T1' }));
  }));

  it('ngOnChanges splits sale/return items, computes totalQuantity and stores the order', fakeAsync(() => {
    fixture.componentRef.setInput('salesOrder', buildOrder());
    fixture.componentRef.setInput('sendEmail', false);
    fixture.detectChanges();
    tick(4000);
    flush();
    expect(component.isquatation).toBeFalse();
    expect(component.salesOrderItems.length).toBe(1);
    expect(component.salesOrderItems[0].product?.name).toBe('Coke');
    expect(component.salesOrderReturnsItems.length).toBe(1);
    expect(component.salesOrderReturnsItems[0].product?.name).toBe('Pepsi');
    expect(component.salesOrderForInvoice?.totalQuantity).toBe(2);
    expect(component.salesOrderForInvoice?.orderNumber).toBe('SO-1');
    expect(component.salesOrder).toBeNull();
  }));

  it('flags quotation orders', fakeAsync(() => {
    fixture.componentRef.setInput('salesOrder', buildOrder(true));
    fixture.componentRef.setInput('sendEmail', false);
    fixture.detectChanges();
    tick(4000);
    flush();
    expect(component.isquatation).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('SALES_ORDER_REQUEST');
  }));

  it('printInvoice bails out when invoice content is not attached to the document', fakeAsync(() => {
    if (document.body.contains(fixture.nativeElement)) {
      document.body.removeChild(fixture.nativeElement);
    }
    fixture.componentRef.setInput('salesOrder', buildOrder());
    fixture.componentRef.setInput('sendEmail', false);
    fixture.detectChanges();
    tick(4000);
    flush();
    const iframesBefore = document.body.querySelectorAll('iframe').length;
    component.printInvoice();
    expect(component.isVisible).toBeFalse();
    expect(document.body.querySelectorAll('iframe').length).toBe(iframesBefore);
  }));

  it('printInvoice renders, prints and removes the iframe when content is attached', fakeAsync(() => {
    document.body.appendChild(fixture.elementRef.nativeElement);
    fixture.componentRef.setInput('salesOrder', buildOrder());
    fixture.componentRef.setInput('sendEmail', false);
    fixture.detectChanges();
    tick(1000);
    expect(component.isVisible).toBeFalse();
    expect(document.body.querySelectorAll('iframe').length).toBe(1);
    tick(3000);
    flush();
    expect(document.body.querySelectorAll('iframe').length).toBe(0);
  }));

  it('emailInvoice emits a base64 pdf blob for sendEmail requests', async () => {
    document.body.appendChild(fixture.elementRef.nativeElement);
    const emitted: string[] = [];
    component.emailBlob.subscribe(v => emitted.push(v));
    fixture.componentRef.setInput('salesOrder', buildOrder());
    fixture.componentRef.setInput('sendEmail', true);
    fixture.detectChanges();
    expect(component.isVisible).toBeTrue();
    for (let i = 0; i < 60 && emitted.length === 0; i++) {
      await new Promise(r => setTimeout(r, 100));
    }
    expect(emitted.length).toBe(1);
    expect(emitted[0].length).toBeGreaterThan(100);
    expect(component.isVisible).toBeFalse();
  }, 15000);
});
