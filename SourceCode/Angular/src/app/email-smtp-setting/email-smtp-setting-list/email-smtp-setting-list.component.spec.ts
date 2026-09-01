import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { EmailSmtpSettingListComponent } from './email-smtp-setting-list.component';
import { EmailSmtpSettingService } from '../email-smtp-setting.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { EmailSMTPSetting } from '@core/domain-classes/email-smtp-setting';

describe('EmailSmtpSettingListComponent', () => {
  let component: EmailSmtpSettingListComponent;
  let fixture: ComponentFixture<EmailSmtpSettingListComponent>;
  let emailSmtpSettingService: jasmine.SpyObj<EmailSmtpSettingService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const settings = [
    { id: 's1', userName: 'noreply@x.com', host: 'smtp.x.com', port: 587, isDefault: true },
    { id: 's2', userName: 'sales@x.com', host: 'smtp2.x.com', port: 465, isDefault: false },
  ] as EmailSMTPSetting[];

  beforeEach(async () => {
    emailSmtpSettingService = jasmine.createSpyObj('EmailSmtpSettingService', [
      'getEmailSMTPSettings', 'deleteEmailSMTPSetting',
    ]);
    emailSmtpSettingService.getEmailSMTPSettings.and.returnValue(of(settings));
    emailSmtpSettingService.deleteEmailSMTPSetting.and.returnValue(of(null as unknown as EmailSMTPSetting));
    commonDialogService = jasmine.createSpyObj('CommonDialogService', ['deleteConformationDialog']);
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);
    (translationService as any).lanDir$ = of('ltr');
    const dialog = jasmine.createSpyObj('MatDialog', ['open']);
    const commonService = jasmine.createSpyObj('CommonService', ['getPageHelperText']);
    const securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);

    TestBed.configureTestingModule({
      imports: [EmailSmtpSettingListComponent, TranslateModule.forRoot()],
      providers: [
        { provide: EmailSmtpSettingService, useValue: emailSmtpSettingService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: dialog },
        { provide: CommonService, useValue: commonService },
        { provide: SecurityService, useValue: securityService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailSmtpSettingListComponent);
    component = fixture.componentInstance;
  });

  it('should create and load smtp settings into the table', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.emailSMTPSettings.length).toBe(2);
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('smtp.x.com');
  });

  it('delete flow confirms, deletes by id, toasts and reloads', () => {
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    fixture.detectChanges();
    component.deleteEmailSMTPSetting(settings[1]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith('ARE_YOU_SURE_YOU_WANT_TO_DELETE smtp2.x.com');
    expect(emailSmtpSettingService.deleteEmailSMTPSetting).toHaveBeenCalledWith('s2');
    expect(toastrService.success).toHaveBeenCalledWith('EMAIL_SMTP_SETTING_DELETED_SUCCESSFULLY');
    expect(emailSmtpSettingService.getEmailSMTPSettings).toHaveBeenCalledTimes(2);
  });

  it('delete flow does nothing when confirmation is declined', () => {
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    fixture.detectChanges();
    component.deleteEmailSMTPSetting(settings[0]);
    expect(emailSmtpSettingService.deleteEmailSMTPSetting).not.toHaveBeenCalled();
    expect(toastrService.success).not.toHaveBeenCalled();
  });

  it('isOddDataRow and getDataIndex map rows correctly', () => {
    fixture.detectChanges();
    expect(component.isOddDataRow(0)).toBeFalse();
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.getDataIndex(settings[1])).toBe(1);
    expect(component.getDataIndex({} as any)).toBe(-1);
  });
});
