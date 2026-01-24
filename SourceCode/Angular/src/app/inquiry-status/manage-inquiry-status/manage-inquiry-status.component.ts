import { Component, Inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { InquiryStatus } from '@core/domain-classes/inquiry-status';
import { InquiryStatusService } from '@core/services/inquiry-status.service';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { ToastrService } from '@core/services/toastr.service';
import { BaseComponent } from '../../base.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-manage-inquiry-status',
  templateUrl: './manage-inquiry-status.component.html',
  styleUrls: ['./manage-inquiry-status.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    MatIconModule,
    MatDialogModule,
    ReactiveFormsModule,
    TranslateModule,
    HasClaimDirective,
    MatButtonModule,
    MatCardModule,
    MatButtonModule
  ]
})
export class ManageInquiryStatusComponent extends BaseComponent implements OnInit {
  isEdit: boolean = false;
  inquiryStatusForm!: UntypedFormGroup;
  constructor(
    public dialogRef: MatDialogRef<ManageInquiryStatusComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InquiryStatus,
    private inquiryStatusService: InquiryStatusService,
    private toastrService: ToastrService,
    private fb: UntypedFormBuilder) {
    super();
  }

  ngOnInit(): void {
    this.createForm();
    if (this.data.id) {
      this.inquiryStatusForm.patchValue(this.data);
      this.isEdit = true;
    }
  }

  createForm() {
    this.inquiryStatusForm = this.fb.group({
      id: [''],
      name: ['', Validators.required]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  saveInquiryStatus(): void {
    if (!this.inquiryStatusForm.valid) {
      this.inquiryStatusForm.markAllAsTouched();
      return;
    }
    const inquiryStatus: InquiryStatus = this.inquiryStatusForm.value;

    if (this.data && this.data.id) {
      this.inquiryStatusService.update(this.data.id, inquiryStatus).subscribe((res) => {
        this.toastrService.success(this.translationService.getValue('INQUIRY_STATUS_SAVED_SUCCESSFULLY'));
        this.dialogRef.close(res);
      });
    } else {
      this.inquiryStatusService.add(inquiryStatus).subscribe((res) => {
        this.toastrService.success(this.translationService.getValue('INQUIRY_STATUS_SAVED_SUCCESSFULLY'));
        this.dialogRef.close(res);
      });
    }
  }
}

