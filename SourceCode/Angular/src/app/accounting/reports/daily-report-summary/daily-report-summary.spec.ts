import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyReportSummary } from './daily-report-summary';

describe('DailyReportSummary', () => {
  let component: DailyReportSummary;
  let fixture: ComponentFixture<DailyReportSummary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyReportSummary]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyReportSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
