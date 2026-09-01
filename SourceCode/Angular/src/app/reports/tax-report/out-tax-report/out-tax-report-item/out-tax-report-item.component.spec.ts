import { ComponentFixture, TestBed, fakeAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { OutTaxReportItemComponent } from './out-tax-report-item.component';
import { SalesOrderService } from '../../../../sales-order/sales-order.service';
import { TranslationService } from '@core/services/translation.service';
import { SalesOrder } from '@core/domain-classes/sales-order';

describe('OutTaxReportItemComponent', () => {
  let component: OutTaxReportItemComponent;
  let fixture: ComponentFixture<OutTaxReportItemComponent>;
  let salesOrderService: jasmine.SpyObj<SalesOrderService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const salesOrder = { id: 'so-1' } as unknown as SalesOrder;
  const taxItems: any[] = [
    { taxName: 'GST 17%', taxValue: 85 },
    { taxName: 'GST 5%', taxValue: 15 },
  ];

  beforeEach(() => {
    salesOrderService = jasmine.createSpyObj<SalesOrderService>('SalesOrderService', ['getSalesOrderTaxItems']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    TestBed.configureTestingModule({
      imports: [OutTaxReportItemComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        CurrencyPipe,
        provideNativeDateAdapter(),
        { provide: JwtHelperService, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: SalesOrderService, useValue: salesOrderService },
        { provide: TranslationService, useValue: translationService },
      ],
    });
  });

  function create(): void {
    fixture = TestBed.createComponent(OutTaxReportItemComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('salesOrder', salesOrder);
    salesOrderService.getSalesOrderTaxItems.and.returnValue(of(taxItems));
    fixture.detectChanges();
  }

  it('should create and load tax items for the sales order', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    expect(salesOrderService.getSalesOrderTaxItems).toHaveBeenCalledOnceWith('so-1');
    expect(component.salesOrderTaxItems).toEqual(taxItems);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('GST 17%');
    expect(text).toContain('GST 5%');
  }));

  it('row helpers index the loaded tax items', fakeAsync(() => {
    create();
    expect(component.isOddDataRow(0)).toBeFalse();
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.getDataIndex(taxItems[0])).toBe(0);
    expect(component.getDataIndex({} as any)).toBe(-1);
  }));
});
