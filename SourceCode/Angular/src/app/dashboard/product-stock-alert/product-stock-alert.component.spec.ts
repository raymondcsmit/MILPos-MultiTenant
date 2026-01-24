import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductStockAlertComponent } from './product-stock-alert.component';

describe('ProductStockAlertComponent', () => {
  let component: ProductStockAlertComponent;
  let fixture: ComponentFixture<ProductStockAlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProductStockAlertComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductStockAlertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
