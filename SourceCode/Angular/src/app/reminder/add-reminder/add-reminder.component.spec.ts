import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Subject, of } from 'rxjs';

import { AddReminderComponent } from './add-reminder.component';
import { ReminderService } from '../reminder.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { Frequency } from '@core/domain-classes/frequency.enum';
import { Reminder } from '@core/domain-classes/reminder';
import { User } from '@core/domain-classes/user';

describe('AddReminderComponent', () => {
  let component: AddReminderComponent;
  let fixture: ComponentFixture<AddReminderComponent>;
  let reminderService: jasmine.SpyObj<ReminderService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let router: Router;
  let dialogRef: { close: jasmine.Spy };
  let routeData: Subject<any>;

  const users = [{ id: 'u1', firstName: 'John', lastName: 'Doe' }] as unknown as User[];
  const frequencies = [{ id: 1, name: 'daily' }] as any;

  function configure(overrides?: { dialog?: boolean; data?: any }) {
    reminderService = jasmine.createSpyObj('ReminderService', ['addReminder', 'updateReminder']);
    reminderService.addReminder.and.returnValue(of({ id: 'new-r' } as Reminder));
    reminderService.updateReminder.and.returnValue(of({ id: 'r1' } as Reminder));
    commonService = jasmine.createSpyObj('CommonService', ['getReminderFrequency', 'getAllUsers', 'getReminder']);
    commonService.getReminderFrequency.and.returnValue(of(frequencies));
    commonService.getAllUsers.and.returnValue(of(users));
    commonService.getReminder.and.returnValue(of({
      id: 'r1', subject: 'Sub', message: 'Msg', isRepeated: false,
      startDate: '2026-01-01T09:30:00Z', endDate: '2026-01-05T17:00:00Z',
      reminderUsers: [{ userId: 'u1' }],
    } as unknown as Reminder));
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);
    dialogRef = { close: jasmine.createSpy('close') };
    routeData = new Subject<any>();

    const isDialog = overrides?.dialog !== false;
    const providers: any[] = [
      provideRouter([]),
      provideNativeDateAdapter(),
      { provide: ReminderService, useValue: reminderService },
      { provide: CommonService, useValue: commonService },
      { provide: ToastrService, useValue: toastrService },
      { provide: TranslationService, useValue: translationService },
      { provide: ActivatedRoute, useValue: { data: routeData.asObservable(), snapshot: { paramMap: { get: () => null }, queryParamMap: { get: () => null } } } },
    ];
    if (isDialog) {
      providers.push(
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: overrides?.data ?? { selectedDate: new Date(2026, 3, 2) } },
      );
    }
    TestBed.configureTestingModule({
      imports: [AddReminderComponent, TranslateModule.forRoot()],
      providers,
    }).compileComponents();

    fixture = TestBed.createComponent(AddReminderComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  }

  it('should create in dialog mode, load frequencies/users and prefill selectedDate', () => {
    configure();
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.isDialog).toBeTrue();
    expect(component.reminderFrequencies.length).toBe(1);
    expect(component.users.length).toBe(1);
    expect(component.days.length).toBe(31);
    expect(component.reminderForm.get('startDate')?.value).toEqual(new Date(2026, 3, 2));
    expect(component.reminderForm.invalid).toBeTrue();
  });

  it('invalid submit marks all touched and calls no service', () => {
    configure();
    fixture.detectChanges();
    component.createReminder();
    expect(component.reminderForm.get('subject')?.touched).toBeTrue();
    expect(reminderService.addReminder).not.toHaveBeenCalled();
  });

  it('dateAndTimeValidator requires endTime when endDate is set', () => {
    configure();
    fixture.detectChanges();
    component.reminderForm.patchValue({ endDate: new Date(2026, 5, 1) });
    expect(component.reminderForm.get('endTime')?.errors).toEqual({ required: true });
    component.reminderForm.patchValue({ endTime: new Date(2026, 5, 1, 10, 0) });
    expect(component.reminderForm.get('endTime')?.errors).toBeNull();
  });

  it('valid create combines date+time, maps users, clears repeat arrays and closes the dialog', () => {
    configure();
    fixture.detectChanges();
    component.reminderForm.patchValue({
      subject: 'Call', message: 'Msg',
      startDate: new Date(2026, 3, 2), startTime: new Date(2026, 3, 2, 9, 45),
      endDate: new Date(2026, 3, 10), endTime: new Date(2026, 3, 10, 17, 30),
    });
    component.selectedUsers = users;
    component.createReminder();
    const arg = reminderService.addReminder.calls.mostRecent().args[0] as any;
    expect(arg.startDate.getHours()).toBe(9);
    expect(arg.startDate.getMinutes()).toBe(45);
    expect(arg.startDate.getDate()).toBe(2);
    expect(arg.endDate.getHours()).toBe(17);
    expect(arg.endDate.getMinutes()).toBe(30);
    expect(arg.reminderUsers).toEqual([{ reminderId: '', userId: 'u1' }]);
    expect(arg.dailyReminders).toEqual([]);
    expect(toastrService.success).toHaveBeenCalledWith('REMINDER_CREATED_SUCCESSFULLY');
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 'new-r' });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('valid create outside dialog navigates to /reminders instead of closing', () => {
    configure({ dialog: false });
    fixture.detectChanges();
    component.reminderForm.patchValue({ subject: 'Call', message: 'Msg' });
    component.createReminder();
    expect(router.navigate).toHaveBeenCalledWith(['/reminders']);
  });

  it('onFrequencyChange Daily adds 7 daily rows and clears dayOfWeek', () => {
    configure();
    fixture.detectChanges();
    component.reminderForm.patchValue({ frequency: Frequency.Daily });
    component.onFrequencyChange();
    expect(component.dailyRemindersArray.length).toBe(7);
    expect(component.dailyRemindersArray.at(0).get('name')?.value).toBe('Sunday');
    expect(component.reminderForm.contains('quarterlyReminders')).toBeFalse();
    expect(component.reminderForm.contains('halfYearlyReminders')).toBeFalse();
    expect(component.reminderForm.get('dayOfWeek')?.value).toBe('');
  });

  it('onFrequencyChange Weekly sets dayOfWeek to today and removes arrays', () => {
    configure();
    fixture.detectChanges();
    component.reminderForm.patchValue({ frequency: Frequency.Daily });
    component.onFrequencyChange();
    component.reminderForm.patchValue({ frequency: Frequency.Weekly });
    component.onFrequencyChange();
    expect(component.reminderForm.contains('dailyReminders')).toBeFalse();
    expect(component.reminderForm.get('dayOfWeek')?.value).toBe(new Date().getDay());
  });

  it('onFrequencyChange Quarterly adds 4 quarters with month ranges and HalfYearly adds 2 halves', () => {
    configure();
    fixture.detectChanges();
    component.reminderForm.patchValue({ frequency: Frequency.Quarterly });
    component.onFrequencyChange();
    expect(component.quarterlyRemindersArray.length).toBe(4);
    expect(component.quarterlyRemindersArray.at(0).get('name')?.value).toBe('JAN_MAR');
    expect(component.quarterlyRemindersArray.at(0).get('month')?.value).toBe(1);
    expect(component.quarterlyRemindersArray.at(3).get('name')?.value).toBe('OCT_DEC');
    expect(component.quarterlyRemindersArray.at(0).get('day')?.value).toBe(new Date().getDate());
    component.reminderForm.patchValue({ frequency: Frequency.HalfYearly });
    component.onFrequencyChange();
    expect(component.reminderForm.contains('quarterlyReminders')).toBeFalse();
    expect(component.halfYearlyRemindersArray.length).toBe(2);
    expect(component.halfYearlyRemindersArray.at(0).get('name')?.value).toBe('JAN_JUN');
  });

  it('checkData toggles the required validator on frequency', () => {
    configure();
    fixture.detectChanges();
    component.checkData({ checked: true } as any);
    expect(component.reminderForm.get('frequency')?.validator).toBeTruthy();
    component.checkData({ checked: false } as any);
    expect(component.reminderForm.get('frequency')?.validator).toBeNull();
  });

  it('route resolver data prefills and patch; update stamps reminderId on repeat arrays', () => {
    configure({ dialog: false });
    fixture.detectChanges();
    routeData.next({
      reminder: {
        id: 'r1', subject: 'Sub', message: 'Msg', isRepeated: true, frequency: Frequency.Daily,
        startDate: '2026-01-01T09:30:00Z', endDate: null,
        dailyReminders: [{ id: 'd1', dayOfWeek: 0, isActive: true, reminderId: '' }],
        reminderUsers: [{ userId: 'u1' }],
      },
    });
    expect(component.reminderForm.get('subject')?.value).toBe('Sub');
    expect(component.dailyRemindersArray.length).toBe(7);
    expect(component.reminderForm.get('frequency')?.validator).toBeTruthy();
    component.selectedUsers = users;
    component.reminderForm.patchValue({ endDate: null, endTime: null });
    component.createReminder();
    expect(reminderService.updateReminder).toHaveBeenCalled();
    const arg = reminderService.updateReminder.calls.mostRecent().args[0] as any;
    expect(arg.dailyReminders[0].reminderId).toBe('r1');
    expect(toastrService.success).toHaveBeenCalledWith('REMINDER_UPDATED_SUCCESSFULLY');
    expect(router.navigate).toHaveBeenCalledWith(['/reminders']);
  });

  it('dialog reminderId fetch prefills and disables the form; selectedUsers race pins empty', fakeAsync(() => {
    configure({ data: { selectedDate: null, reminderId: 'r1' } });
    fixture.detectChanges();
    tick();
    expect(commonService.getReminder).toHaveBeenCalledWith('r1');
    expect(component.reminderForm.get('subject')?.value).toBe('Sub');
    expect(component.reminderForm.get('startTime')?.value).toBe('2026-01-01T09:30:00Z');
    expect(component.reminderForm.disabled).toBeTrue();
    expect(component.isLoading).toBeFalse();
    expect(component.selectedUsers.length).toBe(0);
  }));

  it('onCancel closes when in dialog and navigates otherwise', () => {
    configure();
    fixture.detectChanges();
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('onCancel navigates when not in dialog', () => {
    configure({ dialog: false });
    fixture.detectChanges();
    component.onCancel();
    expect(router.navigate).toHaveBeenCalledWith(['/reminders']);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
