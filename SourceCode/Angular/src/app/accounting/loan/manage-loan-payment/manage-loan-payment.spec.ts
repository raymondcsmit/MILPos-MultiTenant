import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageLoanPayment } from './manage-loan-payment';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('ManageLoanPayment', () => {
  let component: ManageLoanPayment;
  let fixture: ComponentFixture<ManageLoanPayment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [ManageLoanPayment, TranslateModule.forRoot()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageLoanPayment);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
