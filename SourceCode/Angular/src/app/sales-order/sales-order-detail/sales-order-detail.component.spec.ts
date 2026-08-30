import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesOrderDetailComponent } from './sales-order-detail.component';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ActivatedRoute } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('SalesOrderDetailComponent', () => {
  let component: SalesOrderDetailComponent;
  let fixture: ComponentFixture<SalesOrderDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, { provide: ActivatedRoute, useValue: { snapshot: { data: { salesorder: { id: 'so-1', orderNumber: 'SO-001', customer: { customerName: 'Test Customer' }, location: {}, soCreatedDate: '2026-01-01T00:00:00Z', paymentStatus: 0, createdByName: 'Test', totalDiscount: 0, totalTax: 0, totalAmount: 0, totalPaidAmount: 0, totalRefundAmount: 0, salesOrderPayments: [], salesOrderItems: [{ status: 0, quantity: 2, price: 5 }] } }, paramMap: { get: () => null, has: () => false }, queryParamMap: { get: () => null } }, data: { subscribe: () => ({ unsubscribe: () => {} }) }, url: { subscribe: () => ({ unsubscribe: () => {} }) }, params: { subscribe: () => ({ unsubscribe: () => {} }) }, queryParams: { subscribe: () => ({ unsubscribe: () => {} }) }, paramMap: { subscribe: () => ({ unsubscribe: () => {} }) }, queryParamMap: { subscribe: () => ({ unsubscribe: () => {} }) } } }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [ SalesOrderDetailComponent , TranslateModule.forRoot()]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SalesOrderDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
