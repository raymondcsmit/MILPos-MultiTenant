import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneralEntryReportComponent } from './general-entry-report.component';

describe('GeneralEntryReportComponent', () => {
  let component: GeneralEntryReportComponent;
  let fixture: ComponentFixture<GeneralEntryReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneralEntryReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneralEntryReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
