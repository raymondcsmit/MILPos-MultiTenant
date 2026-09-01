import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';
import { BehaviorSubject, of } from 'rxjs';

import { InquiryTaskAddComponent } from './inquiry-task-add.component';
import { InquiryTaskService } from '../inquiry-task/inquiry-task.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { InquiryTask } from '@core/domain-classes/inquiry-task';
import { InquiryTaskEdit } from '@core/domain-classes/inquiry-task-edit';

describe('InquiryTaskAddComponent', () => {
  let component: InquiryTaskAddComponent;
  let fixture: ComponentFixture<InquiryTaskAddComponent>;
  let inquiryTaskService: jasmine.SpyObj<InquiryTaskService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };
  let dialogData: InquiryTaskEdit;

  const existingTask = {
    id: 't1', subject: 'Call back', description: 'desc', isOpen: true,
    assignTo: 'u1', priority: 'High', dueDate: new Date('2026-02-01T00:00:00Z'),
  } as unknown as InquiryTask;

  beforeEach(async () => {
    inquiryTaskService = jasmine.createSpyObj<InquiryTaskService>('InquiryTaskService', ['saveInquiryActivity', 'updateInquiryActivity']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getAllUsers']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    dialogRef = { close: jasmine.createSpy('close') };
    dialogData = { inquiryId: 'i1', inquiryTask: null };

    await TestBed.configureTestingModule({
      imports: [InquiryTaskAddComponent, TranslateModule.forRoot()],
      providers: [
        provideNativeDateAdapter(),
        { provide: InquiryTaskService, useValue: inquiryTaskService },
        { provide: CommonService, useValue: commonService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
      ],
    }).compileComponents();
  });

  function create(): void {
    commonService.getAllUsers.and.returnValue(of([{ id: 'u1', firstName: 'Ali', lastName: 'Khan' } as any]));
    fixture = TestBed.createComponent(InquiryTaskAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create with empty form, users loaded and priorities offered', () => {
    create();
    expect(component).toBeTruthy();
    expect(component.inquiryTaskForm.get('isOpen')?.value).toBe(true);
    expect(component.users.length).toBe(1);
    expect(component.priorities.map((p: any) => p.value)).toEqual(['High', 'Low', 'Normal']);
  });

  it('existing task data patches the form', () => {
    dialogData.inquiryTask = existingTask;
    create();
    expect(component.inquiryTaskForm.get('subject')?.value).toBe('Call back');
    expect(component.inquiryTaskForm.get('description')?.value).toBe('desc');
    expect(component.inquiryTaskForm.get('assignTo')?.value).toBe('u1');
    expect(component.inquiryTaskForm.get('priority')?.value).toBe('High');
  });

  it('invalid submit marks subject touched and calls no api', () => {
    create();
    component.onInquiryTaskSave();
    expect(inquiryTaskService.saveInquiryActivity).not.toHaveBeenCalled();
    expect(component.inquiryTaskForm.get('subject')?.touched).toBe(true);
  });

  it('new task saves with inquiry id and closes dialog', () => {
    inquiryTaskService.saveInquiryActivity.and.returnValue(of({ id: 'new' } as InquiryTask));
    create();
    component.inquiryTaskForm.patchValue({ subject: 'Call back', assignTo: 'u1', priority: 'High', dueDate: new Date('2026-02-01T00:00:00Z') });
    component.onInquiryTaskSave();
    expect(inquiryTaskService.saveInquiryActivity).toHaveBeenCalledWith(jasmine.objectContaining({ subject: 'Call back', inquiryId: 'i1', isOpen: true, assignTo: 'u1', priority: 'High' }));
    expect(inquiryTaskService.updateInquiryActivity).not.toHaveBeenCalled();
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('existing task updates by id instead of saving', () => {
    dialogData.inquiryTask = existingTask;
    inquiryTaskService.updateInquiryActivity.and.returnValue(of(existingTask));
    create();
    component.onInquiryTaskSave();
    expect(inquiryTaskService.updateInquiryActivity).toHaveBeenCalledWith('t1', jasmine.objectContaining({ subject: 'Call back', inquiryId: 'i1' }));
    expect(inquiryTaskService.saveInquiryActivity).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalled();
  });
});
