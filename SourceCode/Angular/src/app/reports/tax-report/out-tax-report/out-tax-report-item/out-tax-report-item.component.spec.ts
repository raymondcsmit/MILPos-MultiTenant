import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OutTaxReportItemComponent } from './out-tax-report-item.component';

describe('OutTaxReportItemComponent', () => {
  let component: OutTaxReportItemComponent;
  let fixture: ComponentFixture<OutTaxReportItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OutTaxReportItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OutTaxReportItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
