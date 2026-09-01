import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';
import { CurrencyPipe } from '@angular/common';
import { BehaviorSubject, of } from 'rxjs';

import { ViewPurchaseOrderPaymentComponent } from './view-purchase-order-payment.component';
import { PurchaseOrderPaymentService } from '../purchase-order-payment.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderPayment } from '@core/domain-classes/purchase-order-payment';

describe('ViewPurchaseOrderPaymentComponent', () => {
  let component: ViewPurchaseOrderPaymentComponent;
  let fixture: ComponentFixture<ViewPurchaseOrderPaymentComponent>;
  let purchaseOrderPaymentService: jasmine.SpyObj<PurchaseOrderPaymentService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };

  const order = { id: 'po1', orderNumber: 'PO-1', totalAmount: 500, totalPaidAmount: 0, paymentStatus: 2 } as unknown as PurchaseOrder;

  const payments: PurchaseOrderPayment[] = [
    { id: 'pay1', amount: 300, paymentDate: '2026-01-05T00:00:00Z', referenceNumber: 'R-1', paymentMethod: 1 } as unknown as PurchaseOrderPayment,
    { id: 'pay2', amount: 200, paymentDate: '2026-01-06T00:00:00Z', referenceNumber: 'R-2', paymentMethod: 2 } as unknown as PurchaseOrderPayment,
  ];

  beforeEach(async () => {
    purchaseOrderPaymentService = jasmine.createSpyObj<PurchaseOrderPaymentService>('PurchaseOrderPaymentService', ['getAllPurchaseOrderPaymentById', 'deletePurchaseOrderPayment', 'addPurchaseOrderPayments', 'getPaymentMethod']);
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    dialogRef = { close: jasmine.createSpy('close') };

    await TestBed.configureTestingModule({
      imports: [ViewPurchaseOrderPaymentComponent, TranslateModule.forRoot()],
      providers: [
        provideNativeDateAdapter(),
        CurrencyPipe,
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { ...order } },
        { provide: PurchaseOrderPaymentService, useValue: purchaseOrderPaymentService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: Object.assign(jasmine.createSpyObj('SecurityService', ['hasClaim']), { currencyCode: 'USD' }) },
      ],
    }).compileComponents();
  });

  function create(): void {
    purchaseOrderPaymentService.getAllPurchaseOrderPaymentById.and.returnValue(of(payments.map((p) => ({ ...p }))));
    fixture = TestBed.createComponent(ViewPurchaseOrderPaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load payments, recomputing paid amount and status to paid', () => {
    create();
    expect(component).toBeTruthy();
    expect(purchaseOrderPaymentService.getAllPurchaseOrderPaymentById).toHaveBeenCalledWith('po1');
    expect(component.dataSource.length).toBe(2);
    expect(component.data.totalPaidAmount).toBe(500);
    expect(component.data.paymentStatus).toBe(0);
  });

  it('partial payments flag status partial', () => {
    purchaseOrderPaymentService.getAllPurchaseOrderPaymentById.and.returnValue(of([{ id: 'p1', amount: 120 } as PurchaseOrderPayment]));
    fixture = TestBed.createComponent(ViewPurchaseOrderPaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.data.totalPaidAmount).toBe(120);
    expect(component.data.paymentStatus).toBe(2);
  });

  it('null payment amounts are treated as zero in the sum', () => {
    purchaseOrderPaymentService.getAllPurchaseOrderPaymentById.and.returnValue(of([{ id: 'p1', amount: null } as unknown as PurchaseOrderPayment]));
    fixture = TestBed.createComponent(ViewPurchaseOrderPaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.data.totalPaidAmount).toBe(0);
    expect(component.data.paymentStatus).toBe(1);
  });

  it('delete confirmed removes payment, toasts and reloads', () => {
    purchaseOrderPaymentService.deletePurchaseOrderPayment.and.returnValue(of(void 0));
    create();
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deletePayment(payments[0]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalled();
    expect(purchaseOrderPaymentService.deletePurchaseOrderPayment).toHaveBeenCalledWith('pay1');
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(component.isChanged).toBe(true);
    expect(purchaseOrderPaymentService.getAllPurchaseOrderPaymentById).toHaveBeenCalledTimes(2);
  });

  it('declined delete does not call delete api', () => {
    create();
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deletePayment(payments[0]);
    expect(purchaseOrderPaymentService.deletePurchaseOrderPayment).not.toHaveBeenCalled();
    expect(purchaseOrderPaymentService.getAllPurchaseOrderPaymentById).toHaveBeenCalledTimes(1);
  });

  it('addPayment opens add dialog and reloads when closed with true', () => {
    create();
    const innerDialog = (component as any).dialog;
    spyOn(innerDialog, 'open').and.returnValue({ afterClosed: () => of(true) } as any);
    component.addPayment();
    expect(innerDialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: jasmine.objectContaining({ id: 'po1' }) }));
    expect(component.isChanged).toBe(true);
    expect(purchaseOrderPaymentService.getAllPurchaseOrderPaymentById).toHaveBeenCalledTimes(2);
  });

  it('addPayment closed with false does not reload', () => {
    create();
    const innerDialog = (component as any).dialog;
    spyOn(innerDialog, 'open').and.returnValue({ afterClosed: () => of(false) } as any);
    component.addPayment();
    expect(component.isChanged).toBe(false);
    expect(purchaseOrderPaymentService.getAllPurchaseOrderPaymentById).toHaveBeenCalledTimes(1);
  });

  it('onCancel closes with isChanged flag', () => {
    create();
    component.isChanged = true;
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('getDataIndex and isOddDataRow resolve row positions', () => {
    create();
    expect(component.getDataIndex(component.dataSource[1])).toBe(1);
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.isOddDataRow(0)).toBeFalse();
  });
});
