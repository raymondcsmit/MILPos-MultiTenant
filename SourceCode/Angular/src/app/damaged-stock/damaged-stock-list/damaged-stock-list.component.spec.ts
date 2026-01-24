import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DamagedStockListComponent } from './damaged-stock-list.component';

describe('DamagedStockListComponent', () => {
  let component: DamagedStockListComponent;
  let fixture: ComponentFixture<DamagedStockListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DamagedStockListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DamagedStockListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
