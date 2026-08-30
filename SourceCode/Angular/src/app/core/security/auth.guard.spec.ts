import { TestBed, inject, waitForAsync } from '@angular/core/testing';

import { AuthGuard } from './auth.guard';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('AuthGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [provideHttpClient(), AuthGuard, { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, CurrencyPipe, provideNativeDateAdapter()]
    });
  });

  it('should ...', inject([AuthGuard], (guard: AuthGuard) => {
    expect(guard).toBeTruthy();
  }));
});
