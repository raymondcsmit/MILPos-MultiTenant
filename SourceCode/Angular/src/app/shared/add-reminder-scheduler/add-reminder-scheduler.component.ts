import { Component, Inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { CustomReminderScheduler } from '@core/domain-classes/custom-reminder-scheduler';
import { ModuleReference } from '@core/domain-classes/module-reference';
import { ReminderScheduler } from '@core/domain-classes/reminder-scheduler';
import { User } from '@core/domain-classes/user';
import { CommonService } from '@core/services/common.service';
import { TranslateModule } from '@ngx-translate/core';
import { BaseComponent } from '../../base.component';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-add-reminder-scheduler',
  templateUrl: './add-reminder-scheduler.component.html',
  styleUrls: ['./add-reminder-scheduler.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    MatIconModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatDatepickerModule,
    MatTableModule,
    MatCheckboxModule,
    MatTimepickerModule,
    UTCToLocalTime,
    MatCardModule,
    MatButtonModule,
    NgClass
  ]
})
export class AddReminderSchedulerComponent extends BaseComponent implements OnInit {
  reminderForm!: UntypedFormGroup;
  users: User[] = [];
  selectedUsers: User[] = [];
  reminderSchedulers: ReminderScheduler[] = [];
  displayedColumns: string[] = ['subject', 'createdDate', 'userName'];

  constructor(
    private fb: UntypedFormBuilder,
    private commonService: CommonService,
    public dialogRef: MatDialogRef<AddReminderSchedulerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ModuleReference) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.createReminder();
    this.getUsers();
    this.getReminderSchedulers();
  }

  createReminder() {
    this.reminderForm = this.fb.group({
      subject: ['', [Validators.required]],
      message: ['', [Validators.required]],
      isEmailNotification: [true],
      reminderDate: [this.CurrentDate, [Validators.required]],
      startTime: [this.CurrentDate, [Validators.required]],
      selectedUsers: [null]
    });
  }
  buildReminderSchedule() {
    let startDate = new Date(this.reminderForm.get('reminderDate')?.value);
    let startTime = this.reminderForm.get('startTime')?.value;
    let hours = 0, minutes = 0;
    if (typeof startTime === 'string' && startTime.includes(':')) {
      [hours, minutes] = startTime.split(':').map((val: string) => parseInt(val, 10));
    }
    const combinedDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      hours,
      minutes
    );
    const selectedUsers = this.reminderForm.get('selectedUsers')?.value;
    const customReminderScheduler: CustomReminderScheduler = {
      subject: this.reminderForm.get('subject')?.value,
      message: this.reminderForm.get('message')?.value,
      isEmailNotification: this.reminderForm.get('isEmailNotification')?.value,
      createdDate: combinedDate,
      userIds: selectedUsers ? selectedUsers.map((c: any) => c.id) : null,
      application: this.data.application,
      referenceId: this.data.referenceId
    };
    return customReminderScheduler;
  }

  getUsers() {
    this.commonService.getAllUsers().subscribe((u: User[]) => {
      this.users = u;
    });
  }

  saveReminder() {
    if (this.reminderForm.valid) {
      let reminderSchedulers = this.buildReminderSchedule();
      if (!reminderSchedulers.userIds) {
        reminderSchedulers.userIds = [];
      }
      this.commonService.addReminderSchedule(reminderSchedulers)
        .subscribe(c => {
          if (c) {
            this.dialogRef.close();
          }
        })
    } else {
      this.reminderForm.markAllAsTouched();
    }
  }
  getReminderSchedulers() {
    this.commonService.getReminderSchedulers(this.data)
      .subscribe((c: ReminderScheduler[]) => {
        this.reminderSchedulers = c;
      });
  }
  cancelReminder() {
    this.dialogRef.close();
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.reminderSchedulers.indexOf(row);
  }
}
