import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';
import { BehaviorSubject, of } from 'rxjs';

import { AddSalesOrderPaymentComponent } from './add-sales-order-payment.component';
import { SalesOrderPaymentService } from '../sales-order-payment.service';
import { PurchaseOrderPaymentService } from '../../purchase-order/purchase-order-payment.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { SalesOrder } from '@core/domain-classes/sales-order';

describe('AddSalesOrderPaymentComponent', () => {
  let component: AddSalesOrderPaymentComponent;
  let fixture: ComponentFixture<AddSalesOrderPaymentComponent>;
  let salesOrderPaymentService: jasmine.SpyObj<SalesOrderPaymentService>;
  let purchaseOrderPaymentService: jasmine.SpyObj<PurchaseOrderPaymentService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };

  const order = {
    id: 'so1', orderNumber: 'SO-1', totalAmount: 100, totalPaidAmount: 40,
  } as unknown as SalesOrder;

  beforeEach(async () => {
    salesOrderPaymentService = jasmine.createSpyObj<SalesOrderPaymentService>('SalesOrderPaymentService', ['addSalesOrderPayments']);
    purchaseOrderPaymentService = jasmine.createSpyObj<PurchaseOrderPaymentService>('PurchaseOrderPaymentService', ['getPaymentMethod']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    dialogRef = { close: jasmine.createSpy('close') };

    await TestBed.configureTestingModule({
      imports: [AddSalesOrderPaymentComponent, TranslateModule.forRoot()],
      providers: [
        provideNativeDateAdapter(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: order },
        { provide: SalesOrderPaymentService, useValue: salesOrderPaymentService },
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
    fixture = TestBed.createComponent(AddSalesOrderPaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create with remaining amount, order id and first payment method prefilled', () => {
    create();
    expect(component).toBeTruthy();
    expect(component.paymentsForm.get('amount')?.value).toBe(60);
    expect(component.paymentsForm.get('salesOrderId')?.value).toBe('so1');
    expect(component.paymentsForm.get('paymentMethod')?.value).toBe(1);
    expect(component.paymentsForm.get('paymentDate')?.value).toEqual(jasmine.any(Date));
    expect(purchaseOrderPaymentService.getPaymentMethod).toHaveBeenCalled();
  });

  it('amount above remaining balance is invalid and blocks save', () => {
    create();
    component.paymentsForm.patchValue({ amount: 100, paymentMethod: 1 });
    expect(component.paymentsForm.get('amount')?.hasError('max')).toBe(true);
    component.saveSalesOrderPayment();
    expect(salesOrderPaymentService.addSalesOrderPayments).not.toHaveBeenCalled();
    expect(component.paymentsForm.get('amount')?.touched).toBe(true);
  });

  it('valid payment saves with form value, toasts and closes with true', () => {
    salesOrderPaymentService.addSalesOrderPayments.and.returnValue(of({} as any));
    create();
    component.paymentsForm.patchValue({ amount: 60, paymentMethod: 1, referenceNumber: 'REF-1', note: 'part pay' });
    component.saveSalesOrderPayment();
    expect(salesOrderPaymentService.addSalesOrderPayments).toHaveBeenCalledWith(jasmine.objectContaining({ salesOrderId: 'so1', amount: 60, paymentMethod: 1, referenceNumber: 'REF-1' }));
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('missing payment method blocks save without api call', () => {
    create();
    component.paymentsForm.patchValue({ amount: 60 });
    component.paymentsForm.get('paymentMethod')?.setValue(null);
    component.saveSalesOrderPayment();
    expect(component.paymentsForm.invalid).toBe(true);
    expect(salesOrderPaymentService.addSalesOrderPayments).not.toHaveBeenCalled();
  });

  it('onCancel closes the dialog without result', () => {
    create();
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
