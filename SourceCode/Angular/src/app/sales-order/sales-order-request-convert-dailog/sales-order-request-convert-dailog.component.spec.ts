import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef } from '@angular/material/dialog';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { provideNativeDateAdapter } from '@angular/material/core';
import { BehaviorSubject, of } from 'rxjs';

import { SalesOrderRequestConvertDailogComponent } from './sales-order-request-convert-dailog.component';
import { SalesOrderService } from '../sales-order.service';
import { TranslationService } from '@core/services/translation.service';
import { SalesOrder } from '@core/domain-classes/sales-order';

describe('SalesOrderRequestConvertDailogComponent', () => {
  let component: SalesOrderRequestConvertDailogComponent;
  let fixture: ComponentFixture<SalesOrderRequestConvertDailogComponent>;
  let salesOrderService: jasmine.SpyObj<SalesOrderService>;
  let dialogRef: { close: jasmine.Spy };

  const requests: SalesOrder[] = [
    { id: 'r1', orderNumber: 'SOR-1' } as unknown as SalesOrder,
    { id: 'r2', orderNumber: 'SOR-2' } as unknown as SalesOrder,
  ];

  function paginated<T>(body: T[]): HttpResponse<T[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({ 'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 5, skip: 0 }) }),
    });
  }

  beforeEach(async () => {
    salesOrderService = jasmine.createSpyObj<SalesOrderService>('SalesOrderService', ['getAllSalesOrder']);
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    dialogRef = { close: jasmine.createSpy('close') };

    await TestBed.configureTestingModule({
      imports: [SalesOrderRequestConvertDailogComponent, TranslateModule.forRoot()],
      providers: [
        provideNativeDateAdapter(),
        { provide: SalesOrderService, useValue: salesOrderService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: TranslationService, useValue: translationService },
      ],
    }).compileComponents();
  });

  function create(): void {
    salesOrderService.getAllSalesOrder.and.returnValue(of(paginated(requests)));
    fixture = TestBed.createComponent(SalesOrderRequestConvertDailogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load sales order requests with request-only resource', () => {
    create();
    expect(component).toBeTruthy();
    expect(salesOrderService.getAllSalesOrder).toHaveBeenCalledWith(jasmine.objectContaining({ isSalesOrderRequest: true, pageSize: 5, orderBy: 'sOCreatedDate asc' }));
    expect(component.salesOrderRequestList.length).toBe(2);
  });

  it('order number search reloads requests after debounce', fakeAsync(() => {
    create();
    component.searchForm.get('salesOrderRequestOrderNumber')?.setValue('SOR-2');
    tick(500);
    const args = salesOrderService.getAllSalesOrder.calls.mostRecent().args[0];
    expect(args.orderNumber).toBe('SOR-2');
    expect(args.isSalesOrderRequest).toBe(true);
  }));

  it('convert without selection marks control touched and does not close', () => {
    create();
    component.convertSalesOrderRequest();
    expect(component.searchForm.get('salesOrderRequestId')?.touched).toBe(true);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('convert with selection closes the dialog with the request id', () => {
    create();
    component.searchForm.patchValue({ salesOrderRequestId: 'r2' });
    component.convertSalesOrderRequest();
    expect(dialogRef.close).toHaveBeenCalledWith('r2');
  });

  it('onCancel closes the dialog without result', () => {
    create();
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
