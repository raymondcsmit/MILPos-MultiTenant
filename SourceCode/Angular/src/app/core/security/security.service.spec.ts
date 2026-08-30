import { TestBed, inject } from '@angular/core/testing';

import { SecurityService } from './security.service';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('SecurityService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [provideHttpClient(), SecurityService, { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, CurrencyPipe, provideNativeDateAdapter()]
    });
  });

  it('should be created', inject([SecurityService], (service: SecurityService) => {
    expect(service).toBeTruthy();
  }));
});
