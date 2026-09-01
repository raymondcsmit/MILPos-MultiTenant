import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

import { ReminderListComponent } from './reminder-list.component';
import { ReminderService } from '../reminder.service';
import { CommonService } from '@core/services/common.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { Reminder } from '@core/domain-classes/reminder';

describe('ReminderListComponent', () => {
  let component: ReminderListComponent;
  let fixture: ComponentFixture<ReminderListComponent>;
  let reminderService: jasmine.SpyObj<ReminderService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialog: { open: jasmine.Spy };
  let lastParams: any;

  function makeResponse(body: Reminder[]) {
    return new HttpResponse({
      body,
      headers: new HttpHeaders().set('X-Pagination', JSON.stringify({ pageSize: 10, skip: 0, totalCount: body.length })),
    });
  }

  function captureParams(r: any) {
    lastParams = { skip: r.skip, pageSize: r.pageSize, orderBy: r.orderBy, subject: r.subject, message: r.message, frequency: r.frequency };
    return of(makeResponse(reminders));
  }

  const reminders = [
    { id: 'r1', subject: 'Call Joe', message: 'About the contract', frequency: 1, startDate: '2026-01-01T09:00:00Z', endDate: '2026-01-05T09:00:00Z', documentName: '' },
    { id: 'r2', subject: 'Pay rent', message: 'Monthly', frequency: 2, startDate: '2026-02-01T09:00:00Z', endDate: '2026-02-28T09:00:00Z', documentName: 'bill.pdf' },
  ] as unknown as Reminder[];

  const frequencies = [{ id: 1, name: 'daily' }, { id: 2, name: 'weekly' }] as any;

  beforeEach(async () => {
    reminderService = jasmine.createSpyObj('ReminderService', ['getReminders', 'deleteReminder']);
    reminderService.getReminders.and.callFake((r: any) => captureParams(r));
    reminderService.deleteReminder.and.returnValue(of(null as unknown as Reminder));
    commonService = jasmine.createSpyObj('CommonService', ['getReminderFrequency', 'getReminder']);
    commonService.getReminderFrequency.and.returnValue(of(frequencies));
    commonService.getReminder.and.returnValue(of(reminders[0]));
    commonDialogService = jasmine.createSpyObj('CommonDialogService', ['deleteConformationDialog']);
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);
    dialog = { open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(true) }) };

    TestBed.configureTestingModule({
      imports: [ReminderListComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ReminderService, useValue: reminderService },
        { provide: CommonService, useValue: commonService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReminderListComponent);
    component = fixture.componentInstance;
  });

  it('should create, load frequencies and reminders into the table', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.reminderFrequencies.length).toBe(2);
    expect(component.reminders.length).toBe(2);
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Call Joe');
    expect(component.reminderResource.pageSize).toBe(10);
  });

  it('subject filter debounces, escapes the value, resets paging and reloads', fakeAsync(() => {
    fixture.detectChanges();
    component.SubjectFilter = 'Call Joe';
    tick(1000);
    expect(lastParams.subject).toBe(escape('Call Joe'));
    expect(lastParams.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);
  }));

  it('message and frequency filters feed the resource parameter', fakeAsync(() => {
    fixture.detectChanges();
    component.MessageFilter = 'About';
    tick(1000);
    expect(lastParams.message).toBe('About');
    component.FrequencyFilter = '2';
    tick(1000);
    expect(lastParams.frequency).toBe('2');
    component.FrequencyFilter = '0';
    tick(1000);
    expect(lastParams.frequency).toBe('0');
  }));

  it('editReminder fetches the reminder and opens the dialog with frequencies', fakeAsync(() => {
    fixture.detectChanges();
    const dlgSpy = spyOn(component['dialog'], 'open').and.returnValue({ afterClosed: () => of(true) } as any);
    component.editReminder(reminders[0]);
    tick();
    expect(commonService.getReminder).toHaveBeenCalledWith('r1');
    expect(component.isLoadingResults).toBeFalse();
    expect(dlgSpy).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({
      width: '60vw',
      data: { frequencies, reminder: reminders[0] },
    }));
    expect(reminderService.getReminders).toHaveBeenCalledTimes(2);
  }));

  it('deleteReminder confirms, deletes by id, toasts and reloads', () => {
    fixture.detectChanges();
    component.deleteReminder(reminders[1]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith('ARE_YOU_SURE_YOU_WANT_TO_DELETE');
    expect(reminderService.deleteReminder).toHaveBeenCalledWith('r2');
    expect(toastrService.success).toHaveBeenCalledWith('REMINDER_DELETED_SUCCESSFULLY');
    expect(component.isLoadingResults).toBeFalse();
    expect(reminderService.getReminders).toHaveBeenCalledTimes(2);
  });

  it('declined confirmation does not delete', () => {
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    fixture.detectChanges();
    component.deleteReminder(reminders[1]);
    expect(reminderService.deleteReminder).not.toHaveBeenCalled();
  });

  it('paginator page updates skip/pageSize and reloads', () => {
    fixture.detectChanges();
    component.paginator.pageSize = 20;
    component.paginator.pageIndex = 1;
    component.paginator.page.emit({ pageIndex: 1, pageSize: 20, length: 42 } as PageEvent);
    expect(lastParams.skip).toBe(20);
    expect(lastParams.pageSize).toBe(20);
  });

  it('sort change resets page index and orders the reload', () => {
    fixture.detectChanges();
    component.sort.active = 'subject';
    component.sort.direction = 'asc';
    component.paginator.pageIndex = 3;
    component.sort.sortChange.emit({ active: 'subject', direction: 'asc' } as any);
    expect(component.paginator.pageIndex).toBe(0);
    expect(lastParams.orderBy).toBe('subject asc');
  });

  it('isOddDataRow and getDataIndex map rows correctly', () => {
    fixture.detectChanges();
    expect(component.isOddDataRow(0)).toBeFalse();
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.getDataIndex(reminders[1])).toBe(1);
    expect(component.getDataIndex({} as any)).toBe(-1);
  });
});
