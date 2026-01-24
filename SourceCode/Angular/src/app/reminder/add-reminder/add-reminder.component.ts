import { Component, Inject, OnInit, Optional } from '@angular/core';
import {
  AbstractControl,
  ReactiveFormsModule,
  UntypedFormArray,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ReminderFrequency } from '@core/domain-classes/reminder-frequency';
import { User } from '@core/domain-classes/user';
import { ReminderService } from '../reminder.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { Reminder } from '@core/domain-classes/reminder';
import { Frequency } from '@core/domain-classes/frequency.enum';

import { Quarter } from '@core/domain-classes/quarter.enum';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { TranslationService } from '@core/services/translation.service';
import {
  dayOfWeekArray,
  monthsArray,
} from '@core/domain-classes/reminder-constant';

import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { TranslateModule } from '@ngx-translate/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DayOfWeek } from '@core/domain-classes/dayOfWeek.enum';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-add-reminder',
  templateUrl: './add-reminder.component.html',
  styleUrls: ['./add-reminder.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatSelectModule,
    MatRadioModule,
    TranslateModule,
    MatDatepickerModule,
    RouterModule,
    MatTimepickerModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    NgClass
  ]
})
export class AddReminderComponent implements OnInit {
  reminderFrequencies: ReminderFrequency[] = [];
  reminderForm!: UntypedFormGroup;
  minDate = new Date();
  selectedUsers: User[] = [];
  reminder!: Reminder;
  isLoading = false;
  dayOfWeek = dayOfWeekArray;
  months = monthsArray;
  days: number[] = [];
  users: User[] = [];
  isDialog: boolean = false;

  timepickerTheme = {
    container: {
      bodyBackgroundColor: '#000',
      buttonColor: '#000',
    },
    dial: {
      dialBackgroundColor: '#000',
    },
    clockFace: {
      clockFaceBackgroundColor: '#000',
      clockHandColor: '#000',
      clockFaceTimeInactiveColor: '#000',
      clockFaceTimeActiveColor: '#000',
    },
  };

  get dailyRemindersArray(): UntypedFormArray {
    return <UntypedFormArray>this.reminderForm.get('dailyReminders');
  }

  get quarterlyRemindersArray(): UntypedFormArray {
    return <UntypedFormArray>this.reminderForm.get('quarterlyReminders');
  }

  get halfYearlyRemindersArray(): UntypedFormArray {
    return <UntypedFormArray>this.reminderForm.get('halfYearlyReminders');
  }

  constructor(
    private fb: UntypedFormBuilder,
    private reminderService: ReminderService,
    private commonService: CommonService,
    private toastrService: ToastrService,
    private route: Router,
    private activatedRoute: ActivatedRoute,
    private translationService: TranslationService,
    @Optional() private dialogRef: MatDialogRef<AddReminderComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: { selectedDate: Date; reminderId: string }
  ) { }

  ngOnInit(): void {
    for (let i = 1; i <= 31; i++) {
      this.days.push(i);
    }
    this.getReminderFrequency();
    this.createReminderForm();
    this.activatedRoute.data.subscribe(
      (data: any) => {
        if (data && data.reminder) {
          this.reminder = { ...data.reminder };
          this.reminderForm.patchValue({ ...this.reminder, startTime: this.reminder.startDate, endTime: this.reminder.endDate });
          this.onFrequencyChange();
          this.reminderForm.patchValue({ ...this.reminder, startTime: this.reminder.startDate, endTime: this.reminder.endDate });
          const isRepeatedControl = this.reminderForm.get('isRepeated');
          if (isRepeatedControl && isRepeatedControl.value) {
            const frequencyControl = this.reminderForm.get('frequency');
            if (frequencyControl) {
              frequencyControl.setValidators([Validators.required]);
            }
          }
        }
      }
    );
    this.getUsers();

    if (this.dialogRef) {
      this.isDialog = true;
    }

    if (this.data) {
      if (this.data.selectedDate) {
        this.reminderForm.patchValue({
          startDate: this.data.selectedDate || new Date(),
        });
      }
      if (this.data.reminderId) {
        this.isLoading = true;
        this.commonService.getReminder(this.data.reminderId ?? '').subscribe({
          next: (d) => {
            this.reminder = { ...d };
            this.reminderForm.patchValue({ ...this.reminder, startTime: this.reminder.startDate, endTime: this.reminder.endDate });
            this.onFrequencyChange();
            this.reminderForm.patchValue({ ...this.reminder, startTime: this.reminder.startDate, endTime: this.reminder.endDate });
            const isRepeatedControl = this.reminderForm.get('isRepeated');
            if (isRepeatedControl && isRepeatedControl.value) {
              const frequencyControl = this.reminderForm.get('frequency');
              if (frequencyControl) {
                frequencyControl.setValidators([Validators.required]);
              }
            }
            this.reminderForm.disable();
            this.isLoading = false;
          },
          error: () => {
            this.isLoading = false;
          }
        });
      }
    }
  }

  getUsers() {
    this.commonService.getAllUsers().subscribe((u: User[]) => {
      this.users = u;
      if (this.reminder) {
        const reminderUsers = this.reminder.reminderUsers.map((c) => c.userId);
        this.selectedUsers = this.users.filter(
          (c) => reminderUsers.indexOf(c.id ?? '') >= 0
        );
      }
    });
  }

  getReminderFrequency() {
    this.commonService
      .getReminderFrequency()
      .subscribe((f) => (this.reminderFrequencies = [...f]));
  }

  createReminderForm() {
    const currentDateAndTime = new Date();
    this.reminderForm = this.fb.group(
      {
        id: [''],
        subject: ['', [Validators.required]],
        message: ['', [Validators.required]],
        frequency: [''],
        isRepeated: [false],
        isEmailNotification: [false],
        startDate: [currentDateAndTime, [Validators.required]],
        startTime: [currentDateAndTime, [Validators.required]],
        endDate: [null],
        endTime: [null],
        dayOfWeek: [2],
        documentId: [null],
      },
      { validators: this.dateAndTimeValidator }
    );
  }

  dateAndTimeValidator(control: AbstractControl) {
    const endDate = control.get('endDate')?.value;
    const endTime = control.get('endTime')?.value;

    if (endDate && !endTime) {
      control.get('endTime')?.setErrors({ required: true });
    } else {
      control.get('endTime')?.setErrors(null);
    }
    return null;
  }

  checkData(event: MatCheckboxChange) {
    if (event.checked) {
      this.reminderForm.get('frequency')?.setValidators([Validators.required]);
    } else {
      this.reminderForm.get('frequency')?.setValidators([]);
    }
    this.reminderForm.get('frequency')?.updateValueAndValidity();
    this.reminderForm.markAllAsTouched();
  }

  createReminder() {
    if (!this.reminderForm.valid) {
      this.reminderForm.markAllAsTouched();
      return;
    }
    let startDate = new Date(this.reminderForm.get('startDate')?.value);
    let startTime = this.reminderForm.get('startTime')?.value;
    let hours = 0, minutes = 0;
    if (startTime instanceof Date) {
      hours = startTime.getHours();
      minutes = startTime.getMinutes();
    } else if (typeof startTime === 'string') {
      const dateObj = new Date(startTime);
      if (!isNaN(dateObj.getTime())) {
        hours = dateObj.getHours();
        minutes = dateObj.getMinutes();
      }
    }
    const combinedDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      hours,
      minutes
    );
    let endDate = this.reminderForm.get('endDate')?.value;
    let combinedEndDate;
    if (endDate) {
      endDate = new Date(endDate); // Ensure it's a Date object
      let endTime = this.reminderForm.get('endTime')?.value;
      let endHours = 0, endMinutes = 0;
      if (endTime instanceof Date) {
        endHours = endTime.getHours();
        endMinutes = endTime.getMinutes();
      } else if (typeof endTime === 'string') {
        const endDateObj = new Date(endTime);
        if (!isNaN(endDateObj.getTime())) {
          endHours = endDateObj.getHours();
          endMinutes = endDateObj.getMinutes();
        }
      }
      combinedEndDate = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        endHours,
        endMinutes
      );
    }
    let reminder: Reminder = this.reminderForm.value;
    reminder.startDate = combinedDate;
    reminder.endDate = combinedEndDate;
    reminder.reminderUsers = this.selectedUsers.map((u) => {
      return {
        reminderId: reminder.id ?? '',
        userId: u.id ?? '',
      };
    });

    if (!reminder.isRepeated) {
      reminder.dailyReminders = [];
      reminder.quarterlyReminders = [];
      reminder.halfYearlyReminders = [];
    }

    if (!this.reminder) {
      this.isLoading = true;

      this.reminderService.addReminder(reminder).subscribe({
        next: (d) => {
          this.toastrService.success(
            this.translationService.getValue('REMINDER_CREATED_SUCCESSFULLY')
          );
          if (this.isDialog) {
            this.dialogRef.close(d);
            this.isLoading = false;
            return;
          }
          this.route.navigate(['/reminders']);
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
    } else {
      if (reminder.dailyReminders) {
        reminder.dailyReminders = reminder.dailyReminders.map((c) => {
          c.reminderId = this.reminder.id ?? '';
          return c;
        });
      }
      if (reminder.quarterlyReminders) {
        reminder.quarterlyReminders = reminder.quarterlyReminders.map((c) => {
          c.reminderId = this.reminder.id ?? '';
          return c;
        });
      }
      if (reminder.halfYearlyReminders) {
        reminder.halfYearlyReminders = reminder.halfYearlyReminders.map((c) => {
          c.reminderId = this.reminder.id ?? '';
          return c;
        });
      }
      this.isLoading = true;
      this.reminderService.updateReminder(reminder).subscribe({
        next: (d) => {
          this.toastrService.success(
            this.translationService.getValue('REMINDER_UPDATED_SUCCESSFULLY')
          );
          this.route.navigate(['/reminders']);
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
    }
  }

  onFrequencyChange() {
    let frequency = this.reminderForm.get('frequency')?.value;
    frequency = frequency == 0 ? '0' : frequency;
    if (frequency == Frequency.Daily.toString()) {
      this.removeQuarterlyReminders();
      this.removeHalfYearlyReminders();
      this.addDailReminders();
      this.reminderForm.get('dayOfWeek')?.setValue('');
    } else if (frequency == Frequency.Weekly.toString()) {
      this.removeDailReminders();
      this.removeQuarterlyReminders();
      this.removeHalfYearlyReminders();
      this.reminderForm.get('dayOfWeek')?.setValue(new Date().getDay());
    } else if (frequency == Frequency.Quarterly.toString()) {
      this.removeDailReminders();
      this.removeHalfYearlyReminders();
      this.addQuarterlyReminders();
      this.reminderForm.get('dayOfWeek')?.setValue('');
    } else if (frequency == Frequency.HalfYearly.toString()) {
      this.removeDailReminders();
      this.removeQuarterlyReminders();
      this.addHalfYearlyReminders();
      this.reminderForm.get('dayOfWeek')?.setValue('');
    } else {
      this.removeDailReminders();
      this.removeQuarterlyReminders();
      this.removeHalfYearlyReminders();
      this.reminderForm.get('dayOfWeek')?.setValue('');
    }
  }

  addDailReminders() {
    if (!this.reminderForm.contains('dailyReminders')) {
      var formArray = this.fb.array([]);
      formArray.push(this.createDailyReminderFormGroup(DayOfWeek.Sunday));
      formArray.push(this.createDailyReminderFormGroup(DayOfWeek.Monday));
      formArray.push(this.createDailyReminderFormGroup(DayOfWeek.Tuesday));
      formArray.push(this.createDailyReminderFormGroup(DayOfWeek.Wednesday));
      formArray.push(this.createDailyReminderFormGroup(DayOfWeek.Thursday));
      formArray.push(this.createDailyReminderFormGroup(DayOfWeek.Friday));
      formArray.push(this.createDailyReminderFormGroup(DayOfWeek.Saturday));
      this.reminderForm.addControl('dailyReminders', formArray);
    }
  }

  addQuarterlyReminders() {
    if (!this.reminderForm.contains('quarterlyReminders')) {
      var formArray = this.fb.array([]);
      var firstQuaterMonths = this.months.filter(
        (c) => [1, 2, 3].indexOf(c.id) >= 0
      );
      var secondQuaterMonths = this.months.filter(
        (c) => [4, 5, 6].indexOf(c.id) >= 0
      );
      var thirdQuaterMonths = this.months.filter(
        (c) => [7, 8, 9].indexOf(c.id) >= 0
      );
      var forthQuaterMonths = this.months.filter(
        (c) => [10, 11, 12].indexOf(c.id) >= 0
      );
      formArray.push(
        this.createQuarterlyReminderFormGroup(
          Quarter.Quarter1,
          'JAN_MAR',
          firstQuaterMonths
        )
      );
      formArray.push(
        this.createQuarterlyReminderFormGroup(
          Quarter.Quarter2,
          'APR_JUN',
          secondQuaterMonths
        )
      );
      formArray.push(
        this.createQuarterlyReminderFormGroup(
          Quarter.Quarter3,
          'JUL_SEPT',
          thirdQuaterMonths
        )
      );
      formArray.push(
        this.createQuarterlyReminderFormGroup(
          Quarter.Quarter4,
          'OCT_DEC',
          forthQuaterMonths
        )
      );
      this.reminderForm.addControl('quarterlyReminders', formArray);
    }
  }

  addHalfYearlyReminders() {
    if (!this.reminderForm.contains('halfYearlyReminders')) {
      var formArray = this.fb.array([]);
      var firstQuaterMonths = this.months.filter(
        (c) => [1, 2, 3, 4, 5, 6].indexOf(c.id) >= 0
      );
      var secondQuaterMonths = this.months.filter(
        (c) => [7, 8, 9, 10, 11, 12].indexOf(c.id) >= 0
      );
      formArray.push(
        this.createHalfYearlyReminderFormGroup(
          Quarter.Quarter1,
          'JAN_JUN',
          firstQuaterMonths
        )
      );
      formArray.push(
        this.createHalfYearlyReminderFormGroup(
          Quarter.Quarter2,
          'JUL_DEC',
          secondQuaterMonths
        )
      );
      this.reminderForm.addControl('halfYearlyReminders', formArray);
    }
  }

  removeDailReminders() {
    if (this.reminderForm.contains('dailyReminders')) {
      this.reminderForm.removeControl('dailyReminders');
    }
  }

  removeQuarterlyReminders() {
    if (this.reminderForm.contains('quarterlyReminders')) {
      this.reminderForm.removeControl('quarterlyReminders');
    }
  }

  removeHalfYearlyReminders() {
    if (this.reminderForm.contains('halfYearlyReminders')) {
      this.reminderForm.removeControl('halfYearlyReminders');
    }
  }

  createDailyReminderFormGroup(dayOfWeek: DayOfWeek) {
    return this.fb.group({
      id: [''],
      reminderId: [''],
      dayOfWeek: [dayOfWeek],
      isActive: [true],
      name: [DayOfWeek[dayOfWeek]],
    });
  }

  createQuarterlyReminderFormGroup(
    quater: Quarter,
    name: string,
    monthValues: any[]
  ) {
    return this.fb.group({
      id: [''],
      reminderId: [''],
      quarter: [quater],
      day: [this.getCurrentDay()],
      month: [monthValues[0].id],
      name: [name],
      monthValues: [monthValues],
    });
  }

  createHalfYearlyReminderFormGroup(
    quater: Quarter,
    name: string,
    monthValues: any[]
  ) {
    return this.fb.group({
      id: [''],
      reminderId: [''],
      quarter: [quater],
      day: [this.getCurrentDay()],
      month: [monthValues[0].id],
      name: [name],
      monthValues: [monthValues],
    });
  }

  getCurrentDay(): number {
    return new Date().getDate();
  }

  onDateChange(formGroup: any) {
    const day = formGroup.get('day')?.value;
    const month = formGroup.get('month')?.value;
    var daysInMonth = new Date(
      new Date().getFullYear(),
      Number.parseInt(month),
      0
    ).getDate();
    if (day > daysInMonth) {
      formGroup.setErrors({
        invalidDate: 'Invalid Date',
      });
      formGroup.markAllAsTouched();
    }
  }

  onCancel() {
    if (!this.isDialog) {
      this.route.navigate(['/reminders']);
      return;
    }
    this.dialogRef.close();
  }
}
