import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { BehaviorSubject, of } from 'rxjs';

import { InquiryNoteComponent } from './inquiry-note.component';
import { InquiryNoteService } from './inquiry-note.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { TranslationService } from '@core/services/translation.service';
import { InquiryNote } from '@core/domain-classes/inquiry-note';

describe('InquiryNoteComponent', () => {
  let component: InquiryNoteComponent;
  let fixture: ComponentFixture<InquiryNoteComponent>;
  let inquiryNoteService: jasmine.SpyObj<InquiryNoteService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const notes: InquiryNote[] = [
    { id: 'n1', inquiryId: 'i1', note: 'first note', createdDate: '2026-01-01T00:00:00Z' } as unknown as InquiryNote,
    { id: 'n2', inquiryId: 'i1', note: 'second note', createdDate: '2026-01-02T00:00:00Z' } as unknown as InquiryNote,
  ];

  beforeEach(async () => {
    inquiryNoteService = jasmine.createSpyObj<InquiryNoteService>('InquiryNoteService', ['getInquiryNotes', 'saveInquiryNote', 'deleteInquiryNote']);
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    await TestBed.configureTestingModule({
      imports: [InquiryNoteComponent, TranslateModule.forRoot()],
      providers: [
        provideNativeDateAdapter(),
        { provide: InquiryNoteService, useValue: inquiryNoteService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: TranslationService, useValue: translationService },
      ],
    }).compileComponents();
  });

  function create(): void {
    inquiryNoteService.getInquiryNotes.and.returnValue(of(notes));
    fixture = TestBed.createComponent(InquiryNoteComponent);
    fixture.componentRef.setInput('inquiryId', 'i1');
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load notes by inquiry id', () => {
    create();
    expect(component).toBeTruthy();
    expect(inquiryNoteService.getInquiryNotes).toHaveBeenCalledWith('i1');
    expect(component.inquiryNotes.length).toBe(2);
    const text = fixture.nativeElement.textContent || '';
    expect(text).toContain('first note');
    expect(text).toContain('second note');
  });

  it('empty note submit marks control touched and calls no api', () => {
    create();
    component.addComment();
    expect(inquiryNoteService.saveInquiryNote).not.toHaveBeenCalled();
    expect(component.commentForm.get('note')?.touched).toBe(true);
  });

  it('valid note saves with inquiry id and reloads notes', () => {
    create();
    inquiryNoteService.getInquiryNotes.and.returnValue(of([...notes, { id: 'n3', note: 'third' } as InquiryNote]));
    inquiryNoteService.saveInquiryNote.and.returnValue(of({ id: 'n3' } as InquiryNote));
    component.commentForm.patchValue({ note: 'third' });
    component.addComment();
    expect(inquiryNoteService.saveInquiryNote).toHaveBeenCalledWith({ inquiryId: 'i1', note: 'third' });
    expect(component.commentForm.get('note')?.value).toBe('');
    expect(component.inquiryNotes.length).toBe(3);
  });

  it('delete confirmed removes note and reloads', () => {
    inquiryNoteService.deleteInquiryNote.and.returnValue(of(void 0));
    create();
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.onDelete('n1');
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalled();
    expect(inquiryNoteService.deleteInquiryNote).toHaveBeenCalledWith('n1');
    expect(inquiryNoteService.getInquiryNotes).toHaveBeenCalledTimes(2);
  });

  it('declined delete confirmation does not call delete api', () => {
    create();
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.onDelete('n1');
    expect(inquiryNoteService.deleteInquiryNote).not.toHaveBeenCalled();
    expect(inquiryNoteService.getInquiryNotes).toHaveBeenCalledTimes(1);
  });
});
