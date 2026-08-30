import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyReportSummary } from './daily-report-summary';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('DailyReportSummary', () => {
  let component: DailyReportSummary;
  let fixture: ComponentFixture<DailyReportSummary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [DailyReportSummary, TranslateModule.forRoot()]
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
