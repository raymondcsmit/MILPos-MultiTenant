import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputTaxReportItemComponent } from './input-tax-report-item.component';

describe('InputTaxReportItemComponent', () => {
  let component: InputTaxReportItemComponent;
  let fixture: ComponentFixture<InputTaxReportItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputTaxReportItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InputTaxReportItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
