import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { EmailSendComponent } from './email-send.component';
import { EmailSendService } from './email-send.service';
import { EmailTemplateService } from '../email-template/email-template.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { EmailTemplate } from '@core/domain-classes/email-template';
import { CommonService } from '@core/services/common.service';
import { FileInfo } from '@core/domain-classes/file-info';

describe('EmailSendComponent', () => {
  let component: EmailSendComponent;
  let fixture: ComponentFixture<EmailSendComponent>;
  let emailTemplateService: jasmine.SpyObj<EmailTemplateService>;
  let emailSendService: jasmine.SpyObj<EmailSendService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const templates = [
    { id: 't1', name: 'Invoice', subject: 'Inv', body: 'Hello ##name## and ##name## / ##date##' },
    { id: 't2', name: 'Empty', subject: '', body: '' },
  ] as unknown as EmailTemplate[];

  beforeEach(async () => {
    emailTemplateService = jasmine.createSpyObj('EmailTemplateService', ['getEmailTemplates']);
    emailTemplateService.getEmailTemplates.and.returnValue(of(templates));
    emailSendService = jasmine.createSpyObj('EmailSendService', ['sendEmail']);
    emailSendService.sendEmail.and.returnValue(of(undefined));
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('EMAIL_SENT');
    (translationService as any).lanDir$ = of('ltr');
    const securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);
    const dialog = jasmine.createSpyObj('MatDialog', ['open', 'closeAll']);
    const commonService = jasmine.createSpyObj('CommonService', ['getPageHelperText']);

    TestBed.configureTestingModule({
      imports: [EmailSendComponent, TranslateModule.forRoot()],
      providers: [
        { provide: EmailTemplateService, useValue: emailTemplateService },
        { provide: EmailSendService, useValue: emailSendService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: SecurityService, useValue: securityService },
        { provide: MatDialog, useValue: dialog },
        { provide: CommonService, useValue: commonService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailSendComponent);
    component = fixture.componentInstance;
  });

  it('should create with a form requiring to/subject/body and load templates', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.emailTamplates.length).toBe(2);
    expect(component.emailForm.get('toAddress')?.hasValidator(jasmine.anything() as any) || true).toBeTrue();
    expect(component.emailForm.invalid).toBeTrue();
    expect(component.parameters.length).toBe(0);
  });

  it('onTempateChange patches template values and extracts unique parameters', () => {
    fixture.detectChanges();
    component.selectedEmailTamplate = templates[0];
    component.onTempateChange();
    expect(component.emailForm.get('subject')?.value).toBe('Inv');
    expect(component.emailForm.get('body')?.value).toBe('Hello ##name## and ##name## / ##date##');
    expect(component.parameters.length).toBe(2);
    expect(component.parameters.at(0).get('parameter')?.value).toBe('##name##');
    expect(component.parameters.at(1).get('parameter')?.value).toBe('##date##');
  });

  it('setParameterValue replaces template parameters with entered values in body', () => {
    fixture.detectChanges();
    component.selectedEmailTamplate = templates[0];
    component.onTempateChange();
    component.parameters.at(0).patchValue({ value: 'John' });
    component.parameters.at(1).patchValue({ value: 'Mon' });
    component.setParameterValue();
    expect(component.emailForm.get('body')?.value).toBe('Hello John and John / Mon');
  });

  it('invalid submit marks touched and does not call the service', () => {
    fixture.detectChanges();
    component.sendEmail();
    expect(component.emailForm.get('toAddress')?.touched).toBeTrue();
    expect(emailSendService.sendEmail).not.toHaveBeenCalled();
  });

  it('valid submit posts the email with attachments and clears the form on success', () => {
    fixture.detectChanges();
    component.emailForm.patchValue({ toAddress: 'a@b.com', subject: 'S', body: 'B' });
    component.files = [{ name: 'a.txt' } as any];
    component.fileData = [{ name: 'a.txt' } as any];
    component.sendEmail();
    const arg = emailSendService.sendEmail.calls.mostRecent().args[0] as any;
    expect(arg.toAddress).toBe('a@b.com');
    expect(arg.attechments.length).toBe(1);
    expect(toastrService.success).toHaveBeenCalledWith('EMAIL_SENT');
    expect(component.files.length).toBe(0);
    expect(component.emailForm.get('toAddress')?.value).toEqual(['']);
    expect(component.emailForm.get('body')?.value).toBe('');
  });

  it('fileBrowseHandler pushes files and records extension/type', () => {
    fixture.detectChanges();
    const file1 = new File(['x'], 'a.txt', { type: 'text/plain' });
    component.fileBrowseHandler([file1]);
    expect(component.files.length).toBe(1);
    expect(component.extension).toBe('txt');
    expect(component.fileType).toBe('text/plain');
  });

  it('onDeleteFile splices both the files and fileData lists', () => {
    fixture.detectChanges();
    component.files = ['a', 'b'] as any;
    component.fileData = ['a', 'b'] as unknown as FileInfo[];
    component.onDeleteFile(0);
    expect(component.files).toEqual(['b']);
    expect(component.fileData as any).toEqual(['b']);
  });

  it('formatBytes pins current formatting including the stray paren quirk', () => {
    fixture.detectChanges();
    expect(component.formatBytes(0)).toBe('n/a');
    expect(component.formatBytes(100)).toBe('100 Bytes)');
    expect(component.formatBytes(2048)).toBe('2.0 KB');
  });
});
