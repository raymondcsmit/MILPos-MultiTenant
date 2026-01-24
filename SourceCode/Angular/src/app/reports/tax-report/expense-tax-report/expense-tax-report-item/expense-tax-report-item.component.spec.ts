import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseTaxReportItemComponent } from './expense-tax-report-item.component';

describe('ExpenseTaxReportItemComponent', () => {
  let component: ExpenseTaxReportItemComponent;
  let fixture: ComponentFixture<ExpenseTaxReportItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseTaxReportItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseTaxReportItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
