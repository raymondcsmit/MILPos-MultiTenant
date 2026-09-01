import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';
import { CurrencyPipe } from '@angular/common';
import { BehaviorSubject, of } from 'rxjs';

import { AddPurchaseOrderPaymentsComponent } from './add-purchase-order-payments.component';
import { PurchaseOrderPaymentService } from '../purchase-order-payment.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';

describe('AddPurchaseOrderPaymentsComponent', () => {
  let component: AddPurchaseOrderPaymentsComponent;
  let fixture: ComponentFixture<AddPurchaseOrderPaymentsComponent>;
  let purchaseOrderPaymentService: jasmine.SpyObj<PurchaseOrderPaymentService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };

  const order = {
    id: 'po1', orderNumber: 'PO-1', totalAmount: 500, totalPaidAmount: 200, totalRefundAmount: 50,
  } as unknown as PurchaseOrder;

  beforeEach(async () => {
    purchaseOrderPaymentService = jasmine.createSpyObj<PurchaseOrderPaymentService>('PurchaseOrderPaymentService', ['getPaymentMethod', 'addPurchaseOrderPayments']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    dialogRef = { close: jasmine.createSpy('close') };

    await TestBed.configureTestingModule({
      imports: [AddPurchaseOrderPaymentsComponent, TranslateModule.forRoot()],
      providers: [
        provideNativeDateAdapter(),
        CurrencyPipe,
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: order },
        { provide: PurchaseOrderPaymentService, useValue: purchaseOrderPaymentService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: Object.assign(jasmine.createSpyObj('SecurityService', ['hasClaim']), { currencyCode: 'USD' }) },
      ],
    }).compileComponents();
  });

  function create(): void {
    purchaseOrderPaymentService.getPaymentMethod.and.returnValue(of([{ id: 1, name: 'CASH' } as any]));
    fixture = TestBed.createComponent(AddPurchaseOrderPaymentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create with remaining amount net of refunds, order id and first payment method', () => {
    create();
    expect(component).toBeTruthy();
    expect(component.paymentsForm.get('amount')?.value).toBe(250);
    expect(component.paymentsForm.get('purchaseOrderId')?.value).toBe('po1');
    expect(component.paymentsForm.get('paymentMethod')?.value).toBe(1);
    expect(component.paymentsForm.get('paymentDate')?.value).toEqual(jasmine.any(Date));
  });

  it('amount above remaining balance is invalid and blocks save', () => {
    create();
    component.paymentsForm.patchValue({ amount: 400, paymentMethod: 1 });
    expect(component.paymentsForm.get('amount')?.hasError('max')).toBe(true);
    component.savePurchaseOrderPayment();
    expect(purchaseOrderPaymentService.addPurchaseOrderPayments).not.toHaveBeenCalled();
    expect(component.paymentsForm.get('amount')?.touched).toBe(true);
  });

  it('valid payment saves with form value, toasts and closes with true', () => {
    purchaseOrderPaymentService.addPurchaseOrderPayments.and.returnValue(of({} as any));
    create();
    component.paymentsForm.patchValue({ amount: 250, paymentMethod: 1, referenceNumber: 'REF-9', note: 'wire' });
    component.savePurchaseOrderPayment();
    expect(purchaseOrderPaymentService.addPurchaseOrderPayments).toHaveBeenCalledWith(jasmine.objectContaining({ purchaseOrderId: 'po1', amount: 250, paymentMethod: 1, referenceNumber: 'REF-9' }));
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('missing payment method blocks save without api call', () => {
    create();
    component.paymentsForm.patchValue({ amount: 250 });
    component.paymentsForm.get('paymentMethod')?.setValue(null);
    component.savePurchaseOrderPayment();
    expect(component.paymentsForm.invalid).toBe(true);
    expect(purchaseOrderPaymentService.addPurchaseOrderPayments).not.toHaveBeenCalled();
  });

  it('onCancel closes the dialog without result', () => {
    create();
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
