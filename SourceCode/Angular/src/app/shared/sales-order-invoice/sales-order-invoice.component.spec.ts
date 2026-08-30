import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesOrderInvoiceComponent } from './sales-order-invoice.component';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('SalesOrderInvoiceComponent', () => {
  let component: SalesOrderInvoiceComponent;
  let fixture: ComponentFixture<SalesOrderInvoiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [ SalesOrderInvoiceComponent , TranslateModule.forRoot()]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SalesOrderInvoiceComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('salesOrder', {
      id: 'so-1',
      orderNumber: 'SO-001',
      isSalesOrderRequest: false,
      customer: { customerName: 'Test Customer' },
      location: {},
      soCreatedDate: '2026-01-01T00:00:00Z',
      paymentStatus: 0,
      totalDiscount: 0,
      totalTax: 0,
      totalAmount: 0,
      totalPaidAmount: 0,
      totalRefundAmount: 0,
      salesOrderPayments: [],
      salesOrderItems: [{ id: 'soi-1', status: 0, quantity: 2, unitPrice: 5, discount: 0, taxValue: 0, tax: 0, salesOrderItemTaxes: [] }]
    } as any);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
