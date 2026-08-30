import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BalanceSheetReportComponent } from './balance-sheet-report.component';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('BalanceSheetReportComponent', () => {
  let component: BalanceSheetReportComponent;
  let fixture: ComponentFixture<BalanceSheetReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [BalanceSheetReportComponent, TranslateModule.forRoot()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BalanceSheetReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
