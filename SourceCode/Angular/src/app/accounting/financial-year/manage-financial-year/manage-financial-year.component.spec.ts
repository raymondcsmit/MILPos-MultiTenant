import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageFinancialYearComponent } from './manage-financial-year.component';

describe('ManageFinancialYearComponent', () => {
  let component: ManageFinancialYearComponent;
  let fixture: ComponentFixture<ManageFinancialYearComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageFinancialYearComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageFinancialYearComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
