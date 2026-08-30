import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderInvoiceComponent } from './purchase-order-invoice.component';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('PurchaseOrderInvoiceComponent', () => {
  let component: PurchaseOrderInvoiceComponent;
  let fixture: ComponentFixture<PurchaseOrderInvoiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [ PurchaseOrderInvoiceComponent , TranslateModule.forRoot()]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PurchaseOrderInvoiceComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('purchaseOrder', {
      id: 'po-1',
      orderNumber: 'PO-001',
      poCreatedDate: new Date(),
      deliveryDate: new Date(),
      supplierId: 'supplier-1',
      locationId: 'location-1',
      totalAmount: 100,
      totalTax: 10,
      totalDiscount: 0,
      purchaseOrderStatus: 0,
      deliveryStatus: 0,
      purchaseOrderItems: [{
        productId: 'product-1',
        product: { name: 'Product A' } as any,
        unitPrice: 50,
        quantity: 2,
        status: 0,
        discount: 0,
        taxValue: 0,
        purchaseOrderItemTaxes: []
      } as any]
    } as any);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
