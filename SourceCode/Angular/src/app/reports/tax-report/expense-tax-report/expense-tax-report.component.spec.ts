import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseTaxReportComponent } from './expense-tax-report.component';

describe('ExpenseTaxReportComponent', () => {
  let component: ExpenseTaxReportComponent;
  let fixture: ComponentFixture<ExpenseTaxReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseTaxReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseTaxReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
