import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductStockAlertDailogComponent } from './product-stock-alert-dailog.component';

describe('ProductStockAlertDailogComponent', () => {
  let component: ProductStockAlertDailogComponent;
  let fixture: ComponentFixture<ProductStockAlertDailogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductStockAlertDailogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductStockAlertDailogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
