import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageDamagedStockComponent } from './manage-damaged-stock.component';

describe('ManageDamagedStockComponent', () => {
  let component: ManageDamagedStockComponent;
  let fixture: ComponentFixture<ManageDamagedStockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageDamagedStockComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageDamagedStockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
