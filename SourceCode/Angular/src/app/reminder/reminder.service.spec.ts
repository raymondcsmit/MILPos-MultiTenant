import { TestBed } from '@angular/core/testing';

import { ReminderService } from './reminder.service';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('ReminderService', () => {
  let service: ReminderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
          providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, CurrencyPipe, provideNativeDateAdapter()]
        });
    service = TestBed.inject(ReminderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
