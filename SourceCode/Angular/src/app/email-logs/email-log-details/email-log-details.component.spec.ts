import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailLogDetailsComponent } from './email-log-details.component';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('EmailLogDetailsComponent', () => {
  let component: EmailLogDetailsComponent;
  let fixture: ComponentFixture<EmailLogDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: { statusName: 'Sent', body: '', senderEmail: 'sender@milpos.com', recipientEmail: 'recipient@milpos.com', subject: 'Subject', sentAt: new Date(), emailLogAttachments: [], errorMessage: '' } }, { provide: JwtHelperService, useValue: {} }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [EmailLogDetailsComponent, TranslateModule.forRoot()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmailLogDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
