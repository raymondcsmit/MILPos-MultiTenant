import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderDetailComponent } from './purchase-order-detail.component';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ActivatedRoute } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('PurchaseOrderDetailComponent', () => {
  let component: PurchaseOrderDetailComponent;
  let fixture: ComponentFixture<PurchaseOrderDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, { provide: ActivatedRoute, useValue: { snapshot: { data: { purchaseorder: { id: 'po-1', orderNumber: 'PO-001', supplier: { supplierName: 'Test Supplier' }, location: {}, poCreatedDate: '2026-01-01T00:00:00Z', paymentStatus: 0, createdByName: 'Test', totalDiscount: 0, totalTax: 0, totalAmount: 0, totalPaidAmount: 0, totalRefundAmount: 0, purchaseOrderPayments: [], purchaseOrderItems: [{ status: 0, quantity: 2, price: 5 }] } }, paramMap: { get: () => null, has: () => false }, queryParamMap: { get: () => null } }, data: { subscribe: () => ({ unsubscribe: () => {} }) }, url: { subscribe: () => ({ unsubscribe: () => {} }) }, params: { subscribe: () => ({ unsubscribe: () => {} }) }, queryParams: { subscribe: () => ({ unsubscribe: () => {} }) }, paramMap: { subscribe: () => ({ unsubscribe: () => {} }) }, queryParamMap: { subscribe: () => ({ unsubscribe: () => {} }) } } }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [ PurchaseOrderDetailComponent , TranslateModule.forRoot()]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PurchaseOrderDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
