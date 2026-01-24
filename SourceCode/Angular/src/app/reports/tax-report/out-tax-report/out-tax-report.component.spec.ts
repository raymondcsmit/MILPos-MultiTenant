import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OutTaxReportComponent } from './out-tax-report.component';

describe('OutTaxReportComponent', () => {
  let component: OutTaxReportComponent;
  let fixture: ComponentFixture<OutTaxReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OutTaxReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OutTaxReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
