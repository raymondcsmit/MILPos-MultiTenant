import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesOrderRequestConvertDailogComponent } from './sales-order-request-convert-dailog.component';

describe('SalesOrderRequestConvertDailogComponent', () => {
  let component: SalesOrderRequestConvertDailogComponent;
  let fixture: ComponentFixture<SalesOrderRequestConvertDailogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesOrderRequestConvertDailogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesOrderRequestConvertDailogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
