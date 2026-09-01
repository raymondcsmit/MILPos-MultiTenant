import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { CurrencyPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { PurchaseOrderInvoiceComponent } from './purchase-order-invoice.component';
import { SecurityService } from '@core/security/security.service';
import { CompanyProfile } from '@core/domain-classes/company-profile';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';

describe('PurchaseOrderInvoiceComponent', () => {
  let component: PurchaseOrderInvoiceComponent;
  let fixture: ComponentFixture<PurchaseOrderInvoiceComponent>;
  let securityService: jasmine.SpyObj<SecurityService>;
  let companyProfile$: Subject<CompanyProfile | null>;

  const buildOrder = (isRequest = false) =>
    ({
      orderNumber: 'PO-1',
      poCreatedDate: '2026-01-01T00:00:00Z',
      isPurchaseOrderRequest: isRequest,
      paymentStatus: 0,
      totalDiscount: 2,
      totalTax: 3,
      totalAmount: 200,
      totalPaidAmount: 120,
      totalRefundAmount: 0,
      location: { name: 'Main', address: 'St 1', mobile: '0300', email: 'a@b.c' },
      supplier: { supplierName: 'Acme', mobileNo: '0321' },
      termAndCondition: 'T&C',
      note: 'note',
      purchaseOrderItems: [
        { status: 0, quantity: 7, unitPrice: 20, discount: 2, taxValue: 3, product: { name: 'Wood' }, unitConversation: { name: 'kg' }, purchaseOrderItemTaxes: [] },
        { status: 1, quantity: 2, unitPrice: 20, discount: 0, taxValue: 0, product: { name: 'Steel' }, unitConversation: { name: 'kg' }, purchaseOrderItemTaxes: [] },
      ],
    }) as unknown as PurchaseOrder;

  beforeEach(async () => {
    companyProfile$ = new Subject<CompanyProfile | null>();
    securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);
    (securityService as any).companyProfile = companyProfile$.asObservable();
    (securityService as any).currencyCode = 'USD';

    TestBed.configureTestingModule({
      imports: [PurchaseOrderInvoiceComponent, TranslateModule.forRoot()],
      providers: [{ provide: SecurityService, useValue: securityService }, CurrencyPipe],
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderInvoiceComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    Array.from(document.body.querySelectorAll('app-purchase-order-invoice')).forEach(el => {
      if (el.parentElement === document.body) {
        document.body.removeChild(el);
      }
    });
    Array.from(document.body.querySelectorAll('iframe')).forEach(el => {
      if (el.parentElement === document.body) {
        document.body.removeChild(el);
      }
    });
    (window as any).open = (window as any).openOrig ?? window.open;
  });

  it('should create and receive company profile from security stream', fakeAsync(() => {
    fixture.componentRef.setInput('purchaseOrder', buildOrder());
    fixture.componentRef.setInput('sendEmail', false);
    spyOn(window, 'open').and.returnValue(null);
    fixture.detectChanges();
    tick(4000);
    flush();
    expect(component).toBeTruthy();
    companyProfile$.next({ taxName: 'GST', taxNumber: 'T1' } as CompanyProfile);
    fixture.detectChanges();
    expect(component.companyProfile).toEqual(jasmine.objectContaining({ taxName: 'GST', taxNumber: 'T1' }));
  }));

  it('ngOnChanges splits purchase/return items, computes totalQuantity and stores the order', fakeAsync(() => {
    fixture.componentRef.setInput('purchaseOrder', buildOrder());
    fixture.componentRef.setInput('sendEmail', false);
    spyOn(window, 'open').and.returnValue(null);
    fixture.detectChanges();
    tick(4000);
    flush();
    expect(component.isquatation).toBeFalse();
    expect(component.purchaseOrderItems.length).toBe(1);
    expect(component.purchaseOrderItems[0].product?.name).toBe('Wood');
    expect(component.purchaseOrderReturnsItems.length).toBe(1);
    expect(component.purchaseOrderReturnsItems[0].product?.name).toBe('Steel');
    expect(component.purchaseOrderForInvoice.totalQuantity).toBe(5);
    expect(component.purchaseOrder).toBeNull();
  }));

  it('flags purchase request orders', fakeAsync(() => {
    fixture.componentRef.setInput('purchaseOrder', buildOrder(true));
    fixture.componentRef.setInput('sendEmail', false);
    spyOn(window, 'open').and.returnValue(null);
    fixture.detectChanges();
    tick(4000);
    flush();
    expect(component.isquatation).toBeTrue();
  }));

  it('printInvoice opens a popup and writes the invoice when content is attached', fakeAsync(() => {
    document.body.appendChild(fixture.elementRef.nativeElement);
    fixture.componentRef.setInput('purchaseOrder', buildOrder());
    fixture.componentRef.setInput('sendEmail', false);
    const popup = {
      document: {
        open: jasmine.createSpy('open'),
        write: jasmine.createSpy('write'),
        close: jasmine.createSpy('close'),
      },
    };
    const openSpy = spyOn(window, 'open').and.returnValue(popup as unknown as Window);
    fixture.detectChanges();
    tick(1000);
    expect(component.isVisible).toBeFalse();
    expect(openSpy).toHaveBeenCalledWith('', '_blank', 'top=0,left=0,height=100%,width=auto');
    expect(popup.document.write).toHaveBeenCalledWith(jasmine.stringContaining('PO-1'));
    expect(popup.document.close).toHaveBeenCalled();
    tick(3000);
    flush();
  }));

  it('printInvoice skips writing when the popup is blocked', fakeAsync(() => {
    document.body.appendChild(fixture.elementRef.nativeElement);
    fixture.componentRef.setInput('purchaseOrder', buildOrder());
    fixture.componentRef.setInput('sendEmail', false);
    const openSpy = spyOn(window, 'open').and.returnValue(null);
    fixture.detectChanges();
    tick(4000);
    flush();
    expect(openSpy).toHaveBeenCalled();
    expect(component.isVisible).toBeFalse();
  }));

  it('emailInvoice emits a base64 pdf blob for sendEmail requests', async () => {
    document.body.appendChild(fixture.elementRef.nativeElement);
    const emitted: string[] = [];
    component.emailBlob.subscribe(v => emitted.push(v));
    fixture.componentRef.setInput('purchaseOrder', buildOrder());
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
