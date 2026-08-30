import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { CustomerDetailResolver } from './customer-detail-resolver';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('CustomerDetailResolver', () => {
  const executeResolver = (...resolverParameters: Parameters<typeof CustomerDetailResolver>) =>
      TestBed.runInInjectionContext(() => CustomerDetailResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, CurrencyPipe, provideNativeDateAdapter()]
    });
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
