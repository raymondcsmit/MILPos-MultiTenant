import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject, of, throwError } from 'rxjs';

import { SendEmailComponent } from './send-email.component';
import { EmailSendService } from './email-send.service';
import { EmailSmtpSettingService } from '../../email-smtp-setting/email-smtp-setting.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';

describe('SendEmailComponent', () => {
  let component: SendEmailComponent;
  let fixture: ComponentFixture<SendEmailComponent>;
  let emailSendService: jasmine.SpyObj<EmailSendService>;
  let emailSmtpSettingService: jasmine.SpyObj<EmailSmtpSettingService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };
  let sendResult: Subject<void>;

  const dialogData = { subject: 'Invoice 42', blob: 'BLOB', name: 'inv.pdf', contentType: 'application/pdf' };

  beforeEach(async () => {
    sendResult = new Subject<void>();
    emailSendService = jasmine.createSpyObj('EmailSendService', ['sendEmailSalesOrPurchase']);
    emailSmtpSettingService = jasmine.createSpyObj('EmailSmtpSettingService', ['getEmailSMTPSettings']);
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('EMAIL_SENT');
    dialogRef = { close: jasmine.createSpy('close') };

    TestBed.configureTestingModule({
      imports: [SendEmailComponent, TranslateModule.forRoot()],
      providers: [
        { provide: EmailSendService, useValue: emailSendService },
        { provide: EmailSmtpSettingService, useValue: emailSmtpSettingService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SendEmailComponent);
    component = fixture.componentInstance;
  });

  it('should create and prefill subject/body from dialog data', () => {
    emailSmtpSettingService.getEmailSMTPSettings.and.returnValue(of([]));
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.emailForm.get('subject')?.value).toBe('Invoice 42');
    expect(component.emailForm.get('body')?.value).toBe('Invoice 42');
    expect(component.emailForm.get('toAddress')?.value).toBe('');
    expect(component.emailForm.invalid).toBeTrue();
  });

  it('marks smtpConfigured false when no settings and disables send button', () => {
    emailSmtpSettingService.getEmailSMTPSettings.and.returnValue(of([]));
    fixture.detectChanges();
    expect(component.smtpConfigured).toBeFalse();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button.success');
    expect(btn.disabled).toBeTrue();
  });

  it('marks smtpConfigured true when settings exist and enables send button', () => {
    emailSmtpSettingService.getEmailSMTPSettings.and.returnValue(of([{} as any]));
    fixture.detectChanges();
    expect(component.smtpConfigured).toBeTrue();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button.success');
    expect(btn.disabled).toBeFalse();
  });

  it('invalid submit marks all touched and does not call service', () => {
    emailSmtpSettingService.getEmailSMTPSettings.and.returnValue(of([]));
    fixture.detectChanges();
    component.sendEmail();
    expect(component.emailForm.get('toAddress')?.touched).toBeTrue();
    expect(emailSendService.sendEmailSalesOrPurchase).not.toHaveBeenCalled();
  });

  it('valid submit sends built payload, toasts, closes and resets loading', () => {
    emailSmtpSettingService.getEmailSMTPSettings.and.returnValue(of([{} as any]));
    emailSendService.sendEmailSalesOrPurchase.and.returnValue(sendResult.asObservable());
    fixture.detectChanges();
    component.emailForm.patchValue({ toAddress: 'a@b.com', body: 'Body text' });
    component.sendEmail();
    expect(component.isLoading).toBeTrue();
    expect(emailSendService.sendEmailSalesOrPurchase).toHaveBeenCalledWith({
      toAddress: 'a@b.com',
      subject: 'Invoice 42',
      message: 'Body text',
      attachement: 'BLOB',
      name: 'inv.pdf',
      fileType: 'application/pdf',
    });
    sendResult.next(undefined);
    expect(toastrService.success).toHaveBeenCalledWith('EMAIL_SENT');
    expect(component.isLoading).toBeFalse();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('keeps dialog open and resets loading on send error', () => {
    emailSmtpSettingService.getEmailSMTPSettings.and.returnValue(of([{} as any]));
    emailSendService.sendEmailSalesOrPurchase.and.returnValue(sendResult.asObservable());
    fixture.detectChanges();
    component.emailForm.patchValue({ toAddress: 'a@b.com', body: 'Body text' });
    component.sendEmail();
    sendResult.error({ status: 500 });
    expect(component.isLoading).toBeFalse();
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(toastrService.success).not.toHaveBeenCalled();
  });

  it('closeDialog closes the dialog ref', () => {
    emailSmtpSettingService.getEmailSMTPSettings.and.returnValue(of([]));
    fixture.detectChanges();
    component.closeDialog();
    expect(dialogRef.close).toHaveBeenCalled();
  });
});
