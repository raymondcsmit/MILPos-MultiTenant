import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import { EmailTemplateManageComponent } from './email-template-manage.component';
import { EmailTemplateService } from '../email-template.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { MatDialog } from '@angular/material/dialog';
import { EmailTemplate } from '@core/domain-classes/email-template';

describe('EmailTemplateManageComponent', () => {
  let component: EmailTemplateManageComponent;
  let fixture: ComponentFixture<EmailTemplateManageComponent>;
  let emailTemplateService: jasmine.SpyObj<EmailTemplateService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let routeData: Subject<any>;
  let router: Router;

  const template = { id: 't1', name: 'Invoice', subject: 'Invoice Mail', body: 'Hi ##name##' } as EmailTemplate;

  beforeEach(async () => {
    routeData = new Subject<any>();
    emailTemplateService = jasmine.createSpyObj('EmailTemplateService', ['getEmailTemplates', 'addEmailTemplate', 'updateEmailTemplate']);
    emailTemplateService.addEmailTemplate.and.returnValue(of(template));
    emailTemplateService.updateEmailTemplate.and.returnValue(of(template));
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);
    (translationService as any).lanDir$ = of('ltr');

    TestBed.configureTestingModule({
      imports: [EmailTemplateManageComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: EmailTemplateService, useValue: emailTemplateService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: ActivatedRoute, useValue: { data: routeData.asObservable(), snapshot: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailTemplateManageComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  it('should create in add mode with an invalid empty form', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.emailTemplate).toBeUndefined();
    expect(component.emailTemplateForm.invalid).toBeTrue();
  });

  it('resolver data patches the form and switches to edit mode', () => {
    fixture.detectChanges();
    routeData.next({ emailTemplate: template });
    expect(component.emailTemplateForm.get('name')?.value).toBe('Invoice');
    expect(component.emailTemplateForm.get('body')?.value).toBe('Hi ##name##');
  });

  it('invalid submit marks controls dirty and calls no service', () => {
    fixture.detectChanges();
    component.addUpdateEmailTemplate();
    expect(component.emailTemplateForm.get('name')?.dirty).toBeTrue();
    expect(emailTemplateService.addEmailTemplate).not.toHaveBeenCalled();
    expect(emailTemplateService.updateEmailTemplate).not.toHaveBeenCalled();
  });

  it('valid save in add mode posts a new template, toasts and navigates', () => {
    fixture.detectChanges();
    component.emailTemplateForm.patchValue({ name: 'New', subject: 'Sub', body: 'Body' });
    component.addUpdateEmailTemplate();
    expect(emailTemplateService.addEmailTemplate).toHaveBeenCalledWith({ id: '', name: 'New', subject: 'Sub', body: 'Body' });
    expect(emailTemplateService.updateEmailTemplate).not.toHaveBeenCalled();
    expect(toastrService.success).toHaveBeenCalledWith('EMAIL_TEMPLATE_SAVE_SUCCESSFULLY');
    expect(router.navigate).toHaveBeenCalledWith(['/emailtemplate']);
  });

  it('valid save in edit mode updates with the existing id', () => {
    fixture.detectChanges();
    routeData.next({ emailTemplate: template });
    component.emailTemplateForm.patchValue({ name: 'Renamed', subject: 'Sub2', body: 'Body2' });
    component.addUpdateEmailTemplate();
    expect(emailTemplateService.updateEmailTemplate).toHaveBeenCalledWith({ id: 't1', name: 'Renamed', subject: 'Sub2', body: 'Body2' });
    expect(emailTemplateService.addEmailTemplate).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/emailtemplate']);
  });
});
