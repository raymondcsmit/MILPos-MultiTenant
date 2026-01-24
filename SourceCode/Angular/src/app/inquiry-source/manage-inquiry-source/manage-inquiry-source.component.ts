import { Component, Inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { InquirySource } from '@core/domain-classes/inquiry-source';
import { InquirySourceService } from '@core/services/inquiry-source.service';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { ToastrService } from '@core/services/toastr.service';
import { BaseComponent } from '../../base.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-manage-inquiry-source',
  templateUrl: './manage-inquiry-source.component.html',
  styleUrls: ['./manage-inquiry-source.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    MatIconModule,
    ReactiveFormsModule,
    MatDialogModule,
    HasClaimDirective,
    TranslateModule,
    MatButtonModule,
    MatCardModule
  ]
})
export class ManageInquirySourceComponent extends BaseComponent implements OnInit {
  isEdit: boolean = false;
  inquirySourceForm!: UntypedFormGroup;
  constructor(
    public dialogRef: MatDialogRef<ManageInquirySourceComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InquirySource,
    private inquirySourceService: InquirySourceService,
    private toastrService: ToastrService,
    private fb: UntypedFormBuilder) {
    super();

  }
  ngOnInit(): void {
    this.createForm();
    if (this.data.id) {
      this.inquirySourceForm.patchValue(this.data);
      this.isEdit = true;
    }
  }

  createForm() {
    this.inquirySourceForm = this.fb.group({
      id: [''],
      name: ['', Validators.required]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  saveInquirySource(): void {
    if (!this.inquirySourceForm.valid) {
      this.inquirySourceForm.markAllAsTouched();
      return;
    }
    const inquirySource: InquirySource = this.inquirySourceForm.value;

    if (this.data && this.data.id) {
      this.inquirySourceService.update(this.data.id, inquirySource).subscribe((res) => {
        this.toastrService.success(this.translationService.getValue('INQUIRY_SOURCE_SAVED_SUCCESSFULLY'));
        this.dialogRef.close(res);
      });
    } else {
      this.inquirySourceService.add(inquirySource).subscribe((res) => {
        this.toastrService.success(this.translationService.getValue('INQUIRY_SOURCE_SAVED_SUCCESSFULLY'));
        this.dialogRef.close(res);
      });
    }
  }
}
