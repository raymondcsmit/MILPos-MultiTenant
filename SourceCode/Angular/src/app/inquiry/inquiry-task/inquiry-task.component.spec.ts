import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';
import { BehaviorSubject, of } from 'rxjs';

import { InquiryTaskComponent } from './inquiry-task.component';
import { InquiryTaskService } from './inquiry-task.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { InquiryTask } from '@core/domain-classes/inquiry-task';

describe('InquiryTaskComponent', () => {
  let component: InquiryTaskComponent;
  let fixture: ComponentFixture<InquiryTaskComponent>;
  let inquiryTaskService: jasmine.SpyObj<InquiryTaskService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const tasks: InquiryTask[] = [
    { id: 't1', subject: 'Call back', description: 'desc', isOpen: true, assignToName: 'Ali', priority: 'High', dueDate: '2026-02-01T00:00:00Z' } as unknown as InquiryTask,
    { id: 't2', subject: 'Send quote', description: 'desc2', isOpen: false, assignToName: 'Bo', priority: 'Low', dueDate: '2026-02-02T00:00:00Z' } as unknown as InquiryTask,
  ];

  function makeTasks(): InquiryTask[] {
    return tasks.map((t) => ({ ...t }));
  }

  beforeEach(async () => {
    inquiryTaskService = jasmine.createSpyObj<InquiryTaskService>('InquiryTaskService', ['getInquiryTasks', 'saveInquiryActivity', 'updateInquiryActivity', 'deleteInquiryActivity']);
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open', 'closeAll']);
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);

    await TestBed.configureTestingModule({
      imports: [InquiryTaskComponent, TranslateModule.forRoot()],
      providers: [
        provideNativeDateAdapter(),
        { provide: InquiryTaskService, useValue: inquiryTaskService },
        { provide: CommonDialogService, useValue: commonDialogService },
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
    inquiryTaskService.getInquiryTasks.and.returnValue(of(makeTasks()));
    fixture = TestBed.createComponent(InquiryTaskComponent);
    fixture.componentRef.setInput('inquiryId', 'i1');
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load tasks by inquiry id', () => {
    create();
    expect(component).toBeTruthy();
    expect(inquiryTaskService.getInquiryTasks).toHaveBeenCalledWith('i1');
    expect(component.inquiryTasks.length).toBe(2);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Call back');
    expect(text).toContain('Send quote');
  });

  it('onAddInquiryTask opens add dialog with inquiry id and reloads on close', () => {
    create();
    component.onAddInquiryTask();
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: { inquiryId: 'i1', inquiryTask: null } }));
    expect(inquiryTaskService.getInquiryTasks).toHaveBeenCalledTimes(2);
  });

  it('onEditInquiryTask opens dialog with the task and reloads on close', () => {
    create();
    const task = makeTasks()[0];
    component.onEditInquiryTask(task);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: { inquiryId: 'i1', inquiryTask: task } }));
    expect(inquiryTaskService.getInquiryTasks).toHaveBeenCalledTimes(2);
  });

  it('onChangeStatus confirmed toggles isOpen and updates the task', () => {
    inquiryTaskService.updateInquiryActivity.and.returnValue(of({} as InquiryTask));
    create();
    const task = makeTasks()[0];
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.onChangeStatus(task);
    expect(task.isOpen).toBe(false);
    expect(inquiryTaskService.updateInquiryActivity).toHaveBeenCalledWith('t1', task);
    expect(inquiryTaskService.getInquiryTasks).toHaveBeenCalledTimes(2);
  });

  it('onChangeStatus declined does not toggle or update', () => {
    create();
    const task = makeTasks()[0];
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.onChangeStatus(task);
    expect(task.isOpen).toBe(true);
    expect(inquiryTaskService.updateInquiryActivity).not.toHaveBeenCalled();
  });

  it('onDelete confirmed removes task and reloads', () => {
    inquiryTaskService.deleteInquiryActivity.and.returnValue(of(void 0));
    create();
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.onDelete('t1');
    expect(inquiryTaskService.deleteInquiryActivity).toHaveBeenCalledWith('t1');
    expect(inquiryTaskService.getInquiryTasks).toHaveBeenCalledTimes(2);
  });

  it('declined delete does not call delete api', () => {
    create();
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.onDelete('t1');
    expect(inquiryTaskService.deleteInquiryActivity).not.toHaveBeenCalled();
    expect(inquiryTaskService.getInquiryTasks).toHaveBeenCalledTimes(1);
  });

  it('getDataIndex and isOddDataRow resolve row positions', () => {
    create();
    expect(component.getDataIndex(component.inquiryTasks[1])).toBe(1);
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.isOddDataRow(0)).toBeFalse();
  });
});
