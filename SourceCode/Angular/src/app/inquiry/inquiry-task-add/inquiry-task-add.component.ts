import { Component, Inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { InquiryTask } from '@core/domain-classes/inquiry-task';
import { InquiryTaskEdit } from '@core/domain-classes/inquiry-task-edit';
import { User } from '@core/domain-classes/user';
import { UserResource } from '@core/domain-classes/user-resource';
import { ToastrService } from '@core/services/toastr.service';
import { InquiryTaskService } from '../inquiry-task/inquiry-task.service';
import { CommonService } from '@core/services/common.service';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-inquiry-task-add',
  templateUrl: './inquiry-task-add.component.html',
  styleUrls: ['./inquiry-task-add.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    MatIconModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatDatepickerModule,
    MatSelectModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class InquiryTaskAddComponent extends BaseComponent implements OnInit {

  inquiryTaskForm!: UntypedFormGroup;
  users: User[] = [];
  userResource: UserResource;
  minDate = this.CurrentDate;
  public priorities: Array<any> = [
    {
      name: 'High',
      value: 'High',
    },
    {
      name: 'Low',
      value: 'Low',
    },
    {
      name: 'Normal',
      value: 'Normal'
    }
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: InquiryTaskEdit,
    public dialogRef: MatDialogRef<InquiryTaskAddComponent>,
    private fb: UntypedFormBuilder,
    private inquiryTaskService: InquiryTaskService,
    private toastrService: ToastrService,
    private commonService: CommonService
  ) {
    super();
    this.getLangDir();
    this.userResource = new UserResource();
    this.userResource.pageSize = 10;
    this.userResource.orderBy = 'firstName desc'
  }

  ngOnInit(): void {
    this.createInquiryTask();
    this.getUsers();
    this.patchInquiryTask();
  }

  createInquiryTask() {
    this.inquiryTaskForm = this.fb.group({
      subject: ['', [Validators.required]],
      description: [''],
      dueDate: [null],
      isOpen: [true],
      assignTo: [],
      priority: []
    });
  }
  patchInquiryTask() {
    if (this.data.inquiryTask) {
      this.inquiryTaskForm.patchValue({
        subject: this.data.inquiryTask.subject,
        description: this.data.inquiryTask.description,
        dueDate: this.data.inquiryTask.dueDate,
        isOpen: this.data.inquiryTask.isOpen,
        assignTo: this.data.inquiryTask.assignTo,
        priority: this.data.inquiryTask.priority
      })
    }
  }

  closeDialog() {
    this.dialogRef.close();
  }

  buildInquiryTask(): InquiryTask {
    const inquiryTask: InquiryTask = {
      subject: this.inquiryTaskForm.get('subject')?.value,
      description: this.inquiryTaskForm.get('description')?.value,
      dueDate: this.inquiryTaskForm.get('dueDate')?.value,
      inquiryId: this.data.inquiryId ?? '',
      isOpen: this.inquiryTaskForm.get('isOpen')?.value,
      assignTo: this.inquiryTaskForm.get('assignTo')?.value,
      priority: this.inquiryTaskForm.get('priority')?.value,
    }
    return inquiryTask;
  }

  getUsers() {
    this.sub$.sink = this.commonService.getAllUsers()
      .subscribe((resp: User[]) => {
        this.users = resp;
      });
  }
  onInquiryTaskSave() {
    if (this.inquiryTaskForm.invalid) {
      this.inquiryTaskForm.markAllAsTouched();
      return;
    }
    const inquiryTask = this.buildInquiryTask();
    if (this.data && this.data.inquiryTask && this.data.inquiryTask.id) {
      this.sub$.sink = this.inquiryTaskService.updateInquiryActivity(this.data.inquiryTask.id, inquiryTask)
        .subscribe(c => {
          this.toastrService.success(this.translationService.getValue('INQUIRY_TASK_UPDATED'));
          this.dialogRef.close();
        });
    } else {
      this.sub$.sink = this.inquiryTaskService.saveInquiryActivity(inquiryTask)
        .subscribe(c => {
          this.toastrService.success(this.translationService.getValue('INQUIRY_TASK_SAVE_SUCCESSFULLY'));
          this.dialogRef.close();
        });
    }

  }

}
