import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerSalesOrderListComponent } from './customer-sales-order-list.component';

describe('CustomerSalesOrderListComponent', () => {
  let component: CustomerSalesOrderListComponent;
  let fixture: ComponentFixture<CustomerSalesOrderListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerSalesOrderListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomerSalesOrderListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
