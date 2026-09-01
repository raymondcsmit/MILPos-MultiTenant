import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { EmailLogDetailsComponent } from './email-log-details.component';
import { EmailLogService } from '../email-log.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';

describe('EmailLogDetailsComponent', () => {
  let component: EmailLogDetailsComponent;
  let fixture: ComponentFixture<EmailLogDetailsComponent>;
  let emailLogService: jasmine.SpyObj<EmailLogService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };
  let logData: any;

  beforeEach(async () => {
    logData = {
      sentAt: '2026-01-01T10:00:00Z',
      senderEmail: 'from@x.com',
      recipientEmail: 'to@x.com',
      subject: 'Invoice',
      body: '<p>Hello</p>',
      statusName: 'Sent',
      errorMessage: '',
      emailLogAttachments: [{ id: 'a1', name: 'doc.pdf' }],
    };
    emailLogService = jasmine.createSpyObj('EmailLogService', ['downloadAttachment']);
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);
    dialogRef = { close: jasmine.createSpy('close') };

    TestBed.configureTestingModule({
      imports: [EmailLogDetailsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: EmailLogService, useValue: emailLogService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: logData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailLogDetailsComponent);
    component = fixture.componentInstance;
  });

  it('should create, prefill body from the log and render header fields', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.body.value).toBe('<p>Hello</p>');
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('from@x.com');
    expect(text).toContain('to@x.com');
    expect(text).toContain('doc.pdf');
  });

  it('renders success badge for sent logs and hides error message block', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.badge.bg-success')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.badge.bg-danger')).toBeNull();
  });

  it('renders failed badge for failed logs', () => {
    logData.statusName = 'Failed';
    fixture = TestBed.createComponent(EmailLogDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.badge.bg-danger')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.badge.bg-success')).toBeNull();
  });

  it('close closes the dialog', () => {
    fixture.detectChanges();
    component.close();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('downloadAttachment streams the file and anchors a download', () => {
    const blob = new Blob(['pdf-bytes'], { type: 'application/pdf' });
    const response = new HttpResponse({ body: blob });
    (response as any).type = HttpEventType.Response;
    emailLogService.downloadAttachment.and.returnValue(of(response));
    const createObjectURL = spyOn(URL, 'createObjectURL').and.returnValue('blob:url');
    fixture.detectChanges();
    component.downloadAttachment(logData.emailLogAttachments[0]);
    expect(emailLogService.downloadAttachment).toHaveBeenCalledWith('a1');
    expect(createObjectURL).toHaveBeenCalled();
    expect(document.body.querySelectorAll('a[download]').length).toBe(0);
    expect(toastrService.error).not.toHaveBeenCalled();
  });

  it('downloadAttachment toasts an error when the stream errors', () => {
    emailLogService.downloadAttachment.and.returnValue(throwError(() => ({ status: 500 })));
    fixture.detectChanges();
    component.downloadAttachment(logData.emailLogAttachments[0]);
    expect(toastrService.error).toHaveBeenCalledWith('ERROR_WHILE_DOWNLOADING_DOCUMENT');
  });
});
