import { TestBed } from '@angular/core/testing';

import { PurchaseOrderPaymentService } from './purchase-order-payment.service';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('PurchaseOrderPaymentService', () => {
  let service: PurchaseOrderPaymentService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
          providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, CurrencyPipe, provideNativeDateAdapter()]
        });
    service = TestBed.inject(PurchaseOrderPaymentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
