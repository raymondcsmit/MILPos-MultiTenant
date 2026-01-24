import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesOrderRequestListComponent } from './sales-order-request-list.component';

describe('SalesOrderRequestListComponent', () => {
  let component: SalesOrderRequestListComponent;
  let fixture: ComponentFixture<SalesOrderRequestListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesOrderRequestListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesOrderRequestListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
