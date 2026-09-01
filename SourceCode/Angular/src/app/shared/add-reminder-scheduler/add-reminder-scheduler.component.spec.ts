import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { AddReminderSchedulerComponent } from './add-reminder-scheduler.component';
import { CommonService } from '@core/services/common.service';
import { TranslationService } from '@core/services/translation.service';
import { User } from '@core/domain-classes/user';
import { ApplicationEnums } from '@core/domain-classes/application.enum';
import { provideNativeDateAdapter } from '@angular/material/core';

describe('AddReminderSchedulerComponent', () => {
  let component: AddReminderSchedulerComponent;
  let fixture: ComponentFixture<AddReminderSchedulerComponent>;
  let commonService: jasmine.SpyObj<CommonService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };

  const dialogData = { application: ApplicationEnums.SalesOrder, referenceId: 'ref-1' };
  const users = [
    { id: 'u1', firstName: 'John', lastName: 'Doe' },
    { id: 'u2', firstName: 'Jane', lastName: 'Roe' },
  ] as unknown as User[];

  beforeEach(async () => {
    commonService = jasmine.createSpyObj('CommonService', ['getAllUsers', 'addReminderSchedule', 'getReminderSchedulers']);
    commonService.getAllUsers.and.returnValue(of(users));
    commonService.getReminderSchedulers.and.returnValue(of([
      { subject: 'S1', duration: '2026-01-01T10:00:00Z', userName: 'John' } as any,
    ]));
    commonService.addReminderSchedule.and.returnValue(of({ success: true } as any));
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    dialogRef = { close: jasmine.createSpy('close') };

    TestBed.configureTestingModule({
      imports: [AddReminderSchedulerComponent, TranslateModule.forRoot()],
      providers: [
        provideNativeDateAdapter(),
        { provide: CommonService, useValue: commonService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddReminderSchedulerComponent);
    component = fixture.componentInstance;
  });

  it('should create, load users and existing schedulers', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.users.length).toBe(2);
    expect(component.reminderSchedulers.length).toBe(1);
    expect(commonService.getReminderSchedulers).toHaveBeenCalledWith(dialogData);
    expect(fixture.nativeElement.querySelector('tbody tr td')?.textContent).toContain('S1');
  });

  it('builds form with defaults and is invalid until required fields set', () => {
    fixture.detectChanges();
    expect(component.reminderForm.get('isEmailNotification')?.value).toBeTrue();
    expect(component.reminderForm.get('reminderDate')?.value).toBeTruthy();
    expect(component.reminderForm.get('startTime')?.value).toBeTruthy();
    expect(component.reminderForm.get('selectedUsers')?.value).toBeNull();
    expect(component.reminderForm.invalid).toBeTrue();
    component.reminderForm.patchValue({ subject: 'Hello', message: 'Msg' });
    expect(component.reminderForm.valid).toBeTrue();
  });

  it('invalid save marks all touched and does not call service', () => {
    fixture.detectChanges();
    component.saveReminder();
    expect(component.reminderForm.get('subject')?.touched).toBeTrue();
    expect(commonService.addReminderSchedule).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('valid save posts scheduler with dialog application/reference and closes', () => {
    fixture.detectChanges();
    component.reminderForm.patchValue({
      subject: 'Hello',
      message: 'Msg',
      reminderDate: new Date(2026, 4, 10),
      startTime: '09:30',
      selectedUsers: [users[0]],
    });
    component.saveReminder();
    expect(commonService.addReminderSchedule).toHaveBeenCalledWith(jasmine.objectContaining({
      subject: 'Hello',
      message: 'Msg',
      isEmailNotification: true,
      userIds: ['u1'],
      application: ApplicationEnums.SalesOrder,
      referenceId: 'ref-1',
    }));
    const arg = commonService.addReminderSchedule.calls.mostRecent().args[0] as any;
    expect(arg.createdDate.getHours()).toBe(9);
    expect(arg.createdDate.getMinutes()).toBe(30);
    expect(arg.createdDate.getDate()).toBe(10);
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('save without selected users sends empty userIds array and still closes', () => {
    fixture.detectChanges();
    component.reminderForm.patchValue({ subject: 'Hello', message: 'Msg', selectedUsers: null });
    component.saveReminder();
    const arg = commonService.addReminderSchedule.calls.mostRecent().args[0] as any;
    expect(arg.userIds).toEqual([]);
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('cancelReminder closes without saving', () => {
    fixture.detectChanges();
    component.cancelReminder();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(commonService.addReminderSchedule).not.toHaveBeenCalled();
  });

  it('isOddDataRow and getDataIndex map rows correctly', () => {
    fixture.detectChanges();
    expect(component.isOddDataRow(0)).toBeFalse();
    expect(component.isOddDataRow(1)).toBeTrue();
    const row = component.reminderSchedulers[0];
    expect(component.getDataIndex(row)).toBe(0);
    expect(component.getDataIndex({} as any)).toBe(-1);
  });
});
