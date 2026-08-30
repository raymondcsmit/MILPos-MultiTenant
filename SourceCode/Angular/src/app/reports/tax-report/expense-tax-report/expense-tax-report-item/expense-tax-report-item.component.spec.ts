import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseTaxReportItemComponent } from './expense-tax-report-item.component';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('ExpenseTaxReportItemComponent', () => {
  let component: ExpenseTaxReportItemComponent;
  let fixture: ComponentFixture<ExpenseTaxReportItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [ExpenseTaxReportItemComponent, TranslateModule.forRoot()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseTaxReportItemComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('expense', { id: 'exp-1', expenseTaxes: [] } as any);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
