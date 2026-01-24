import { Component, Inject, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { ToastrService } from '@core/services/toastr.service';
import { BusinessLocationService } from '../business-location.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-manage-business-location',
  templateUrl: './manage-business-location.component.html',
  styleUrls: ['./manage-business-location.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHelpTextComponent,
    MatIconModule,
    TranslateModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule
  ]
})
export class ManageBusinessLocationComponent
  extends BaseComponent
  implements OnInit {
  isEdit: boolean = false;
  locationForm!: UntypedFormGroup;
  constructor(
    public dialogRef: MatDialogRef<ManageBusinessLocationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BusinessLocation,
    private businessLocationService: BusinessLocationService,
    private toastrService: ToastrService,
    private fb: UntypedFormBuilder
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.createForm();
    if (this.data.id) {
      this.locationForm.patchValue(this.data);
      this.isEdit = true;
    }
  }

  createForm() {
    this.locationForm = this.fb.group({
      id: [''],
      name: ['', Validators.required],
      address: ['', Validators.required],
      mobile: [''],
      contactPerson: [''],
      email: ['', [Validators.email]],
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  saveLocation(): void {
    if (!this.locationForm.valid) {
      this.locationForm.markAllAsTouched();
      return;
    }
    const location: BusinessLocation = this.locationForm.getRawValue();
    if (this.data.id) {
      this.businessLocationService
        .updateLocation(this.data.id ?? '', location)
        .subscribe(
          () => {
            this.toastrService.success(
              this.translationService.getValue(
                'BUSINESS_LOCATION_UPDATED_SUCCESSFULLY'
              )
            );
            this.dialogRef.close(true);
          });
    } else {
      this.businessLocationService.createLocation(location).subscribe(
        () => {
          this.toastrService.success(
            this.translationService.getValue(
              'BUSINESS_LOCATION_UPDATED_SUCCESSFULLY'
            )
          );
          this.dialogRef.close(true);
        });
    }
  }
}
