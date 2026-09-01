import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { throwError, of } from 'rxjs';

import { EmailTemplateListComponent } from './email-template-list.component';
import { EmailTemplateService } from '../email-template.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { EmailTemplate } from '@core/domain-classes/email-template';

describe('EmailTemplateListComponent', () => {
  let component: EmailTemplateListComponent;
  let fixture: ComponentFixture<EmailTemplateListComponent>;
  let emailTemplateService: jasmine.SpyObj<EmailTemplateService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const templates = [
    { id: 't1', name: 'Invoice', subject: 'Invoice Mail', body: 'Hi ##name##' },
    { id: 't2', name: 'Reminder', subject: 'Reminder Mail', body: 'Pay' },
  ] as unknown as EmailTemplate[];

  beforeEach(async () => {
    emailTemplateService = jasmine.createSpyObj('EmailTemplateService', ['getEmailTemplates', 'deleteEmailTemplate']);
    commonDialogService = jasmine.createSpyObj('CommonDialogService', ['deleteConformationDialog']);
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);
    (translationService as any).lanDir$ = of('ltr');

    TestBed.configureTestingModule({
      imports: [EmailTemplateListComponent, TranslateModule.forRoot()],
      providers: [
        { provide: EmailTemplateService, useValue: emailTemplateService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailTemplateListComponent);
    component = fixture.componentInstance;
  });

  it('should create and load templates into the table', () => {
    emailTemplateService.getEmailTemplates.and.returnValue(of(templates));
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.emailTemplates.length).toBe(2);
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Invoice');
  });

  it('delete flow confirms with the template name, deletes, toasts and reloads', () => {
    emailTemplateService.getEmailTemplates.and.returnValue(of(templates));
    emailTemplateService.deleteEmailTemplate.and.returnValue(of(null as unknown as EmailTemplate));
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    fixture.detectChanges();
    component.delteEmailTemplate(templates[1]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith('ARE_YOU_SURE_YOU_WANT_TO_DELETE:: Reminder');
    expect(emailTemplateService.deleteEmailTemplate).toHaveBeenCalledWith(templates[1]);
    expect(toastrService.success).toHaveBeenCalledWith('EMAIL_TEMPLATE_DELETED_SUCCESSFULLY');
    expect(emailTemplateService.getEmailTemplates).toHaveBeenCalledTimes(2);
  });

  it('delete flow does nothing when confirmation is declined', () => {
    emailTemplateService.getEmailTemplates.and.returnValue(of(templates));
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    fixture.detectChanges();
    component.delteEmailTemplate(templates[0]);
    expect(emailTemplateService.deleteEmailTemplate).not.toHaveBeenCalled();
  });

  it('load errors surface each message as an error toast', () => {
    emailTemplateService.getEmailTemplates.and.returnValue(throwError(() => ({ messages: ['E1', 'E2'] })));
    fixture.detectChanges();
    expect(component.emailTemplates).toEqual([]);
    expect(toastrService.error).toHaveBeenCalledWith('E1');
    expect(toastrService.error).toHaveBeenCalledWith('E2');
  });

  it('isOddDataRow and getDataIndex map rows correctly', () => {
    emailTemplateService.getEmailTemplates.and.returnValue(of(templates));
    fixture.detectChanges();
    expect(component.isOddDataRow(0)).toBeFalse();
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.getDataIndex(templates[1])).toBe(1);
    expect(component.getDataIndex({} as any)).toBe(-1);
  });
});
