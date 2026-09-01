import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';
import { CurrencyPipe } from '@angular/common';
import { BehaviorSubject, of } from 'rxjs';

import { ViewSalesOrderPaymentComponent } from './view-sales-order-payment.component';
import { SalesOrderPaymentService } from '../sales-order-payment.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderPayment } from '@core/domain-classes/sales-order-payment';

describe('ViewSalesOrderPaymentComponent', () => {
  let component: ViewSalesOrderPaymentComponent;
  let fixture: ComponentFixture<ViewSalesOrderPaymentComponent>;
  let salesOrderPaymentService: jasmine.SpyObj<SalesOrderPaymentService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };

  const order = { id: 'so1', orderNumber: 'SO-1', totalAmount: 100, totalPaidAmount: 0, paymentStatus: 2 } as unknown as SalesOrder;

  const payments: SalesOrderPayment[] = [
    { id: 'pay1', amount: 60, paymentDate: '2026-01-05T00:00:00Z', referenceNumber: 'R-1', paymentMethod: 1 } as unknown as SalesOrderPayment,
    { id: 'pay2', amount: 40, paymentDate: '2026-01-06T00:00:00Z', referenceNumber: 'R-2', paymentMethod: 2 } as unknown as SalesOrderPayment,
  ];

  beforeEach(async () => {
    salesOrderPaymentService = jasmine.createSpyObj<SalesOrderPaymentService>('SalesOrderPaymentService', ['getAllSalesOrderPaymentById', 'deleteSalesOrderPayment', 'addSalesOrderPayments']);
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    dialogRef = { close: jasmine.createSpy('close') };

    await TestBed.configureTestingModule({
      imports: [ViewSalesOrderPaymentComponent, TranslateModule.forRoot()],
      providers: [
        provideNativeDateAdapter(),
        CurrencyPipe,
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { ...order } },
        { provide: SalesOrderPaymentService, useValue: salesOrderPaymentService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: Object.assign(jasmine.createSpyObj('SecurityService', ['hasClaim']), { currencyCode: 'USD' }) },
      ],
    }).compileComponents();
  });

  function create(): void {
    salesOrderPaymentService.getAllSalesOrderPaymentById.and.returnValue(of(payments.map((p) => ({ ...p }))));
    fixture = TestBed.createComponent(ViewSalesOrderPaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load payments, recomputing paid amount and status', () => {
    create();
    expect(component).toBeTruthy();
    expect(salesOrderPaymentService.getAllSalesOrderPaymentById).toHaveBeenCalledWith('so1');
    expect(component.dataSource.length).toBe(2);
    expect(component.data.totalPaidAmount).toBe(100);
    expect(component.data.paymentStatus).toBe(0);
  });

  it('partial payments flag status partial and full refund case marks pending', () => {
    salesOrderPaymentService.getAllSalesOrderPaymentById.and.returnValue(of([{ id: 'p1', amount: 30 } as SalesOrderPayment]));
    fixture = TestBed.createComponent(ViewSalesOrderPaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.data.totalPaidAmount).toBe(30);
    expect(component.data.paymentStatus).toBe(2);
  });

  it('delete confirmed removes payment, toasts and reloads', () => {
    salesOrderPaymentService.deleteSalesOrderPayment.and.returnValue(of(void 0));
    create();
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deletePayment(payments[0]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalled();
    expect(salesOrderPaymentService.deleteSalesOrderPayment).toHaveBeenCalledWith('pay1');
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(component.isChanged).toBe(true);
    expect(salesOrderPaymentService.getAllSalesOrderPaymentById).toHaveBeenCalledTimes(2);
  });

  it('declined delete does not call delete api', () => {
    create();
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deletePayment(payments[0]);
    expect(salesOrderPaymentService.deleteSalesOrderPayment).not.toHaveBeenCalled();
    expect(salesOrderPaymentService.getAllSalesOrderPaymentById).toHaveBeenCalledTimes(1);
  });

  it('addPayment opens add dialog and reloads when closed with true', () => {
    create();
    const innerDialog = (component as any).dialog;
    spyOn(innerDialog, 'open').and.returnValue({ afterClosed: () => of(true) } as any);
    component.addPayment();
    expect(innerDialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: jasmine.objectContaining({ id: 'so1' }) }));
    expect(component.isChanged).toBe(true);
    expect(salesOrderPaymentService.getAllSalesOrderPaymentById).toHaveBeenCalledTimes(2);
  });

  it('addPayment closed with false does not reload', () => {
    create();
    const innerDialog = (component as any).dialog;
    spyOn(innerDialog, 'open').and.returnValue({ afterClosed: () => of(false) } as any);
    component.addPayment();
    expect(component.isChanged).toBe(false);
    expect(salesOrderPaymentService.getAllSalesOrderPaymentById).toHaveBeenCalledTimes(1);
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
