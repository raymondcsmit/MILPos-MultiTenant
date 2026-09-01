import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';

import { TestSmtpSettingComponent } from './test-smtp-setting.component';
import { EmailSmtpSettingService } from '../email-smtp-setting.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { EmailSMTPSetting } from '@core/domain-classes/email-smtp-setting';

describe('TestSmtpSettingComponent', () => {
  let component: TestSmtpSettingComponent;
  let fixture: ComponentFixture<TestSmtpSettingComponent>;
  let emailSmtpSettingService: jasmine.SpyObj<EmailSmtpSettingService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };

  beforeEach(async () => {
    emailSmtpSettingService = jasmine.createSpyObj('EmailSmtpSettingService', ['testEmailSMTPSetting']);
    emailSmtpSettingService.testEmailSMTPSetting.and.returnValue(of(true));
    toastrService = jasmine.createSpyObj('ToastrService', ['success']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('EMAIL_SENT');
    dialogRef = { close: jasmine.createSpy('close') };

    TestBed.configureTestingModule({
      imports: [TestSmtpSettingComponent, TranslateModule.forRoot()],
      providers: [
        { provide: EmailSmtpSettingService, useValue: emailSmtpSettingService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { host: 'smtp.x.com' } as EmailSMTPSetting },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestSmtpSettingComponent);
    component = fixture.componentInstance;
  });

  it('should create with a required email control and empty dialog form', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.smtpForm.invalid).toBeTrue();
    expect(component.smtpForm.get('toEmail')?.value).toBe('');
  });

  it('invalid submit marks touched and does not call the service', () => {
    fixture.detectChanges();
    component.testSmtpSetting();
    expect(component.smtpForm.get('toEmail')?.touched).toBeTrue();
    expect(emailSmtpSettingService.testEmailSMTPSetting).not.toHaveBeenCalled();
  });

  it('valid submit stamps toEmail on the dialog data, toasts and closes', () => {
    fixture.detectChanges();
    component.smtpForm.patchValue({ toEmail: 'me@x.com' });
    component.testSmtpSetting();
    expect(emailSmtpSettingService.testEmailSMTPSetting).toHaveBeenCalledWith(
      jasmine.objectContaining({ host: 'smtp.x.com', toEmail: 'me@x.com' })
    );
    expect(toastrService.success).toHaveBeenCalledWith('EMAIL_SENT');
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('onCancel closes the dialog', () => {
    fixture.detectChanges();
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(emailSmtpSettingService.testEmailSMTPSetting).not.toHaveBeenCalled();
  });
});
