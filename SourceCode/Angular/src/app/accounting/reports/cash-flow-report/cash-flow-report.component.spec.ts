import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CashFlowReportComponent } from './cash-flow-report.component';

describe('CashFlowReportComponent', () => {
  let component: CashFlowReportComponent;
  let fixture: ComponentFixture<CashFlowReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CashFlowReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CashFlowReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
