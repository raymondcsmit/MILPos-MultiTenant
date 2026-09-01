import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import { ManageEmailSmtpSettingComponent } from './manage-email-smtp-setting.component';
import { EmailSmtpSettingService } from '../email-smtp-setting.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { TestSmtpSettingComponent } from '../test-smtp-setting/test-smtp-setting.component';
import { EmailSMTPSetting } from '@core/domain-classes/email-smtp-setting';

describe('ManageEmailSmtpSettingComponent', () => {
  let component: ManageEmailSmtpSettingComponent;
  let fixture: ComponentFixture<ManageEmailSmtpSettingComponent>;
  let emailSmtpSettingService: jasmine.SpyObj<EmailSmtpSettingService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let routeData: Subject<any>;
  let router: Router;

  const smtpSetting = {
    id: 's1', host: 'smtp.x.com', userName: 'noreply@x.com', password: 'pwd',
    port: 587, isDefault: true, encryptionType: 'ssl', fromEmail: 'from@x.com', fromName: 'ERP',
  };

  beforeEach(async () => {
    routeData = new Subject<any>();
    emailSmtpSettingService = jasmine.createSpyObj('EmailSmtpSettingService', [
      'addEmailSMTPSetting', 'updateEmailSMTPSetting',
    ]);
    emailSmtpSettingService.addEmailSMTPSetting.and.returnValue(of(null as unknown as EmailSMTPSetting));
    emailSmtpSettingService.updateEmailSMTPSetting.and.returnValue(of(null as unknown as EmailSMTPSetting));
    toastrService = jasmine.createSpyObj('ToastrService', ['success']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('OK');
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    const commonService = jasmine.createSpyObj('CommonService', ['noop']);

    TestBed.configureTestingModule({
      imports: [ManageEmailSmtpSettingComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: EmailSmtpSettingService, useValue: emailSmtpSettingService },
        { provide: CommonService, useValue: commonService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: dialog },
        { provide: ActivatedRoute, useValue: { data: routeData.asObservable(), snapshot: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageEmailSmtpSettingComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  it('should create in add mode with an invalid empty form', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.isEditMode).toBeFalse();
    expect(component.smtpSettingForm.get('isDefault')?.value).toBeFalse();
    expect(component.smtpSettingForm.invalid).toBeTrue();
  });

  it('edit mode patches the form from resolver data', () => {
    fixture.detectChanges();
    routeData.next({ smtpSetting });
    expect(component.isEditMode).toBeTrue();
    expect(component.smtpSettingForm.get('host')?.value).toBe('smtp.x.com');
    expect(component.smtpSettingForm.get('port')?.value).toBe(587);
    expect(component.smtpSettingForm.get('fromEmail')?.value).toBe('from@x.com');
  });

  it('invalid save marks all touched and calls no service', () => {
    fixture.detectChanges();
    component.saveEmailSMTPSetting();
    expect(component.smtpSettingForm.get('host')?.touched).toBeTrue();
    expect(emailSmtpSettingService.addEmailSMTPSetting).not.toHaveBeenCalled();
    expect(emailSmtpSettingService.updateEmailSMTPSetting).not.toHaveBeenCalled();
  });

  it('valid save in add mode posts the built object, toasts and navigates', () => {
    fixture.detectChanges();
    component.smtpSettingForm.patchValue(smtpSetting);
    component.isEditMode = false;
    component.saveEmailSMTPSetting();
    expect(emailSmtpSettingService.addEmailSMTPSetting).toHaveBeenCalledWith(jasmine.objectContaining({
      host: 'smtp.x.com', port: 587, fromName: 'ERP',
    }));
    expect(emailSmtpSettingService.updateEmailSMTPSetting).not.toHaveBeenCalled();
    expect(toastrService.success).toHaveBeenCalledWith('OK');
    expect(router.navigate).toHaveBeenCalledWith(['/email-smtp']);
  });

  it('valid save in edit mode updates instead of posting', () => {
    fixture.detectChanges();
    routeData.next({ smtpSetting });
    component.saveEmailSMTPSetting();
    expect(emailSmtpSettingService.updateEmailSMTPSetting).toHaveBeenCalledWith(jasmine.objectContaining({ id: 's1' }));
    expect(emailSmtpSettingService.addEmailSMTPSetting).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/email-smtp']);
  });

  it('testEmailSMTPSetting opens the test dialog with the built setting when valid', () => {
    fixture.detectChanges();
    component.smtpSettingForm.patchValue(smtpSetting);
    component.testEmailSMTPSetting();
    expect(dialog.open).toHaveBeenCalledWith(TestSmtpSettingComponent, jasmine.objectContaining({
      width: '400px',
      data: jasmine.objectContaining({ host: 'smtp.x.com' }),
    }));
  });

  it('testEmailSMTPSetting does not open the dialog when invalid', () => {
    fixture.detectChanges();
    component.testEmailSMTPSetting();
    expect(dialog.open).not.toHaveBeenCalled();
  });
});
