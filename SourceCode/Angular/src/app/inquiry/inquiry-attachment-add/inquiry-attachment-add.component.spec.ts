import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { InquiryAttachmentAddComponent } from './inquiry-attachment-add.component';
import { InquiryAttachmentService } from '../inquiry-attachment/inquiry-attachment.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { InquiryAttachmentDialog } from '@core/domain-classes/inquiry-attachment-dialog';

describe('InquiryAttachmentAddComponent', () => {
  let component: InquiryAttachmentAddComponent;
  let fixture: ComponentFixture<InquiryAttachmentAddComponent>;
  let inquiryAttachmentService: jasmine.SpyObj<InquiryAttachmentService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };
  let dialogData: InquiryAttachmentDialog;

  beforeEach(async () => {
    inquiryAttachmentService = jasmine.createSpyObj<InquiryAttachmentService>('InquiryAttachmentService', ['saveInquiryAttachment']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    dialogRef = { close: jasmine.createSpy('close') };
    dialogData = { inquiryId: 'i1', inquiryAttachment: null };

    await TestBed.configureTestingModule({
      imports: [InquiryAttachmentAddComponent, TranslateModule.forRoot()],
      providers: [
        { provide: InquiryAttachmentService, useValue: inquiryAttachmentService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
      ],
    }).compileComponents();
  });

  function create(): void {
    fixture = TestBed.createComponent(InquiryAttachmentAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create with name-required form', () => {
    create();
    expect(component).toBeTruthy();
    expect(component.inquiryDocumentForm.get('name')?.hasError('required')).toBe(true);
  });

  it('submit without name reports error and marks touched', () => {
    create();
    component.documentForm = 'data:application/pdf;base64,xyz';
    component.onAttachmentSubmit();
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
    expect(component.inquiryDocumentForm.get('name')?.touched).toBe(true);
    expect(inquiryAttachmentService.saveInquiryAttachment).not.toHaveBeenCalled();
  });

  it('submit without document reports upload error', () => {
    create();
    component.inquiryDocumentForm.patchValue({ name: 'contract' });
    component.onAttachmentSubmit();
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
    expect(inquiryAttachmentService.saveInquiryAttachment).not.toHaveBeenCalled();
  });

  it('valid submit saves attachment with inquiry id, name and extension then closes', () => {
    inquiryAttachmentService.saveInquiryAttachment.and.returnValue(of({ id: 'new' } as any));
    create();
    component.inquiryDocumentForm.patchValue({ name: 'contract.pdf' });
    component.documentForm = 'data:application/pdf;base64,xyz';
    component.extension = 'pdf';
    component.onAttachmentSubmit();
    expect(inquiryAttachmentService.saveInquiryAttachment).toHaveBeenCalledWith(jasmine.objectContaining({ inquiryId: 'i1', name: 'contract.pdf', documents: 'data:application/pdf;base64,xyz', extension: 'pdf' }));
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('fileEvent reads valid pdf into document form with extension', async () => {
    create();
    class FakeFileReader {
      onload: any;
      result: string | null = null;
      readAsDataURL(_file: File): void {
        this.result = 'data:application/pdf;base64,xyz';
        Promise.resolve().then(() => this.onload && this.onload({} as Event));
      }
    }
    spyOn(window, 'FileReader').and.returnValue(new FakeFileReader() as unknown as FileReader);
    const file = new File(['pdf'], 'contract.pdf', { type: 'application/pdf' });
    component.fileEvent({ target: { files: [file] } });
    await Promise.resolve();
    expect(component.documentForm).toContain('data:application/pdf');
    expect(component.extension).toBe('pdf');
  });

  it('fileEvent rejects non-allowed extension with toastr and keeps document empty', () => {
    create();
    const file = new File(['x'], 'script.exe', { type: 'application/octet-stream' });
    component.fileEvent({ target: { files: [file] } });
    expect(toastrService.error).toHaveBeenCalledWith(jasmine.stringContaining('script.exe'));
    expect(component.documentForm).toBe('');
  });

  it('fileEvent with no files returns without touching state', () => {
    create();
    component.fileEvent({ target: { files: [] } });
    expect(component.documentForm).toBe('');
    expect(toastrService.error).not.toHaveBeenCalled();
  });
});
