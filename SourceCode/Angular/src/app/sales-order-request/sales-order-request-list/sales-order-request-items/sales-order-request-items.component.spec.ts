import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesOrderRequestItemsComponent } from './sales-order-request-items.component';

describe('SalesOrderRequestItemsComponent', () => {
  let component: SalesOrderRequestItemsComponent;
  let fixture: ComponentFixture<SalesOrderRequestItemsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesOrderRequestItemsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesOrderRequestItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
