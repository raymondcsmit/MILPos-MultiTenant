import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesOrderRequestAddEditComponent } from './sales-order-request-add-edit.component';

describe('SalesOrderRequestAddEditComponent', () => {
  let component: SalesOrderRequestAddEditComponent;
  let fixture: ComponentFixture<SalesOrderRequestAddEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesOrderRequestAddEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesOrderRequestAddEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
