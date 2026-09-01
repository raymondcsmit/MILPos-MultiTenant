import { ComponentFixture, TestBed, fakeAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { InputTaxReportItemComponent } from './input-tax-report-item.component';
import { PurchaseOrderService } from '../../../../purchase-order/purchase-order.service';
import { TranslationService } from '@core/services/translation.service';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';

describe('InputTaxReportItemComponent', () => {
  let component: InputTaxReportItemComponent;
  let fixture: ComponentFixture<InputTaxReportItemComponent>;
  let purchaseOrderService: jasmine.SpyObj<PurchaseOrderService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const purchaseOrder = { id: 'po-1', purchaseOrderItems: [] } as unknown as PurchaseOrder;
  const taxItems: any[] = [
    { taxName: 'GST 17%', taxValue: 170 },
    { taxName: 'GST 5%', taxValue: 25 },
  ];

  beforeEach(() => {
    purchaseOrderService = jasmine.createSpyObj<PurchaseOrderService>('PurchaseOrderService', ['getPurchaseOrderTaxItems']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    TestBed.configureTestingModule({
      imports: [InputTaxReportItemComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        CurrencyPipe,
        provideNativeDateAdapter(),
        { provide: JwtHelperService, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: PurchaseOrderService, useValue: purchaseOrderService },
        { provide: TranslationService, useValue: translationService },
      ],
    });
  });

  function create(): void {
    fixture = TestBed.createComponent(InputTaxReportItemComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('purchaseOrder', purchaseOrder);
    purchaseOrderService.getPurchaseOrderTaxItems.and.returnValue(of(taxItems));
    fixture.detectChanges();
  }

  it('should create and load tax items for the purchase order', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(purchaseOrderService.getPurchaseOrderTaxItems).toHaveBeenCalledOnceWith('po-1');
    expect(component.purchaseOrderTaxItems).toEqual(taxItems);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('GST 17%');
    expect(text).toContain('GST 5%');
  }));

  it('row helpers index the loaded tax items', fakeAsync(() => {
    create();
    expect(component.isOddDataRow(0)).toBeFalse();
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.getDataIndex(taxItems[1])).toBe(1);
    expect(component.getDataIndex({} as any)).toBe(-1);
  }));
});
