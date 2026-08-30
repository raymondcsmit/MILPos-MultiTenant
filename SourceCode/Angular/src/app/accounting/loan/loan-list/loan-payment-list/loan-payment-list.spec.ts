import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanPaymentList } from './loan-payment-list';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('LoanPaymentList', () => {
  let component: LoanPaymentList;
  let fixture: ComponentFixture<LoanPaymentList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [LoanPaymentList, TranslateModule.forRoot()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanPaymentList);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('loanId', 'loan-1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
