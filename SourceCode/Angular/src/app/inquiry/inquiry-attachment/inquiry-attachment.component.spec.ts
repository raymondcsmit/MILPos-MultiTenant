import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { HttpResponse } from '@angular/common/http';
import { provideNativeDateAdapter } from '@angular/material/core';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { InquiryAttachmentComponent } from './inquiry-attachment.component';
import { InquiryAttachmentService } from './inquiry-attachment.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { InquiryAttachment } from '@core/domain-classes/inquiry-attachment';

describe('InquiryAttachmentComponent', () => {
  let component: InquiryAttachmentComponent;
  let fixture: ComponentFixture<InquiryAttachmentComponent>;
  let inquiryAttachmentService: jasmine.SpyObj<InquiryAttachmentService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const attachments: InquiryAttachment[] = [
    { id: 'a1', name: 'contract.pdf', extension: 'pdf', createdDate: '2026-01-01T00:00:00Z', assignToName: 'Ali' } as unknown as InquiryAttachment,
    { id: 'a2', name: 'notes.docx', extension: 'docx', createdDate: '2026-01-02T00:00:00Z', assignToName: 'Bo' } as unknown as InquiryAttachment,
  ];

  beforeEach(async () => {
    inquiryAttachmentService = jasmine.createSpyObj<InquiryAttachmentService>('InquiryAttachmentService', ['getInquiryAttachments', 'saveInquiryAttachment', 'deleteInquiryAttachment', 'downloadFile']);
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open', 'closeAll']);
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);

    await TestBed.configureTestingModule({
      imports: [InquiryAttachmentComponent, TranslateModule.forRoot()],
      providers: [
        provideNativeDateAdapter(),
        { provide: InquiryAttachmentService, useValue: inquiryAttachmentService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: dialog },
        {
          provide: SecurityService,
          useValue: Object.assign(jasmine.createSpyObj('SecurityService', ['hasClaim']), { currencyCode: 'USD' }),
        },
      ],
    }).compileComponents();
  });

  function create(): void {
    inquiryAttachmentService.getInquiryAttachments.and.returnValue(of(attachments.map((a) => ({ ...a }))));
    fixture = TestBed.createComponent(InquiryAttachmentComponent);
    fixture.componentRef.setInput('inquiryId', 'i1');
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load attachments by inquiry id', () => {
    create();
    expect(component).toBeTruthy();
    expect(inquiryAttachmentService.getInquiryAttachments).toHaveBeenCalledWith('i1');
    expect(component.inquiryAttachments.length).toBe(2);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('contract.pdf');
    expect(text).toContain('notes.docx');
  });

  it('onAddInquiryAttachement opens add dialog with inquiry id and reloads on close', () => {
    create();
    component.onAddInquiryAttachement();
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: { inquiryId: 'i1', inquiryAttachment: null } }));
    expect(inquiryAttachmentService.getInquiryAttachments).toHaveBeenCalledTimes(2);
  });

  it('onDownload response event triggers download and error reports toastr', () => {
    create();
    inquiryAttachmentService.downloadFile.and.returnValue(of(new HttpResponse({ body: new Blob(['pdf']) })));
    component.onDownload(attachments[0]);
    expect(inquiryAttachmentService.downloadFile).toHaveBeenCalledWith('a1');
    inquiryAttachmentService.downloadFile.and.returnValue(throwError(() => ({ message: 'boom' })));
    component.onDownload(attachments[0]);
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
  });

  it('onDeleted confirmed deletes and reloads with success toast', () => {
    inquiryAttachmentService.deleteInquiryAttachment.and.returnValue(of(true));
    create();
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.onDeleted(attachments[0]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalled();
    expect(inquiryAttachmentService.deleteInquiryAttachment).toHaveBeenCalledWith('a1');
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(inquiryAttachmentService.getInquiryAttachments).toHaveBeenCalledTimes(2);
  });

  it('onDeleted false response skips toast and reload', () => {
    inquiryAttachmentService.deleteInquiryAttachment.and.returnValue(of(false));
    create();
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.onDeleted(attachments[0]);
    expect(inquiryAttachmentService.deleteInquiryAttachment).toHaveBeenCalledWith('a1');
    expect(toastrService.success).not.toHaveBeenCalled();
    expect(inquiryAttachmentService.getInquiryAttachments).toHaveBeenCalledTimes(1);
  });

  it('declined delete confirmation does not call delete api', () => {
    create();
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.onDeleted(attachments[0]);
    expect(inquiryAttachmentService.deleteInquiryAttachment).not.toHaveBeenCalled();
    expect(inquiryAttachmentService.getInquiryAttachments).toHaveBeenCalledTimes(1);
  });

  it('getDataIndex and isOddDataRow resolve row positions', () => {
    create();
    expect(component.getDataIndex(component.inquiryAttachments[1])).toBe(1);
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.isOddDataRow(0)).toBeFalse();
  });
});
