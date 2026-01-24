import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerSalesOrderPaymentListComponent } from './customer-sales-order-payment-list.component';

describe('CustomerSalesOrderPaymentListComponent', () => {
  let component: CustomerSalesOrderPaymentListComponent;
  let fixture: ComponentFixture<CustomerSalesOrderPaymentListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerSalesOrderPaymentListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomerSalesOrderPaymentListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
