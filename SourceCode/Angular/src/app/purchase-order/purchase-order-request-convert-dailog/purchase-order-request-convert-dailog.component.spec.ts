import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef } from '@angular/material/dialog';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { provideNativeDateAdapter } from '@angular/material/core';
import { BehaviorSubject, of } from 'rxjs';

import { PurchaseOrderRequestConvertDailogComponent } from './purchase-order-request-convert-dailog.component';
import { PurchaseOrderService } from '../purchase-order.service';
import { TranslationService } from '@core/services/translation.service';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';

describe('PurchaseOrderRequestConvertDailogComponent', () => {
  let component: PurchaseOrderRequestConvertDailogComponent;
  let fixture: ComponentFixture<PurchaseOrderRequestConvertDailogComponent>;
  let purchaseOrderService: jasmine.SpyObj<PurchaseOrderService>;
  let dialogRef: { close: jasmine.Spy };

  const requests: PurchaseOrder[] = [
    { id: 'r1', orderNumber: 'POR-1' } as unknown as PurchaseOrder,
    { id: 'r2', orderNumber: 'POR-2' } as unknown as PurchaseOrder,
  ];

  function paginated<T>(body: T[]): HttpResponse<T[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({ 'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 5, skip: 0 }) }),
    });
  }

  beforeEach(async () => {
    purchaseOrderService = jasmine.createSpyObj<PurchaseOrderService>('PurchaseOrderService', ['getAllPurchaseOrder']);
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    dialogRef = { close: jasmine.createSpy('close') };

    await TestBed.configureTestingModule({
      imports: [PurchaseOrderRequestConvertDailogComponent, TranslateModule.forRoot()],
      providers: [
        provideNativeDateAdapter(),
        { provide: PurchaseOrderService, useValue: purchaseOrderService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: TranslationService, useValue: translationService },
      ],
    }).compileComponents();
  });

  function create(): void {
    purchaseOrderService.getAllPurchaseOrder.and.returnValue(of(paginated(requests)));
    fixture = TestBed.createComponent(PurchaseOrderRequestConvertDailogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load purchase order requests with request-only resource', () => {
    create();
    expect(component).toBeTruthy();
    expect(purchaseOrderService.getAllPurchaseOrder).toHaveBeenCalledWith(jasmine.objectContaining({ isPurchaseOrderRequest: true, pageSize: 5, orderBy: 'poCreatedDate asc', orderNumber: '' }));
    expect(component.purchaseOrderRequestList.length).toBe(2);
  });

  it('order number search reloads requests after debounce', fakeAsync(() => {
    create();
    component.searchForm.get('purchaseOrderRequestOrderNumber')?.setValue('POR-2');
    tick(500);
    const args = purchaseOrderService.getAllPurchaseOrder.calls.mostRecent().args[0];
    expect(args.orderNumber).toBe('POR-2');
    expect(args.isPurchaseOrderRequest).toBe(true);
  }));

  it('convert without selection marks control touched and does not close', () => {
    create();
    component.convertPurchaseOrderRequest();
    expect(component.searchForm.get('purchaseOrderRequestId')?.touched).toBe(true);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('convert with selection closes the dialog with the request id', () => {
    create();
    component.searchForm.patchValue({ purchaseOrderRequestId: 'r1' });
    component.convertPurchaseOrderRequest();
    expect(dialogRef.close).toHaveBeenCalledWith('r1');
  });

  it('onCancel closes the dialog without result', () => {
    create();
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
