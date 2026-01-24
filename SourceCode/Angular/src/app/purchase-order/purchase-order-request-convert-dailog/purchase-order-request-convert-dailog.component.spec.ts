import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderRequestConvertDailogComponent } from './purchase-order-request-convert-dailog.component';

describe('PurchaseOrderRequestConvertDailogComponent', () => {
  let component: PurchaseOrderRequestConvertDailogComponent;
  let fixture: ComponentFixture<PurchaseOrderRequestConvertDailogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderRequestConvertDailogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderRequestConvertDailogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
