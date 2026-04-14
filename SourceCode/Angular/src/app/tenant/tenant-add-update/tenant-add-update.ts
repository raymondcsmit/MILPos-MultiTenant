import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Tenant } from '@core/domain-classes/tenant';
import { TenantService } from '@core/services/tenant.service';
import { ToastrService } from '@core/services/toastr.service';
import { BaseComponent } from '../../base.component';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-tenant-add-update',
  templateUrl: './tenant-add-update.html',
  styleUrls: ['./tenant-add-update.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    TranslateModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule
  ]
})
export class TenantAddUpdateComponent extends BaseComponent implements OnInit {
  tenantForm!: FormGroup;
  isEdit: boolean = false;

  constructor(
    private fb: FormBuilder,
    private tenantService: TenantService,
    private toastrService: ToastrService,
    public dialogRef: MatDialogRef<TenantAddUpdateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Tenant
  ) {
    super();
  }

  ngOnInit(): void {
    this.createForm();
    if (this.data && this.data.id) {
      this.isEdit = true;
      this.tenantForm.patchValue(this.data);
      // Disable immutable fields if necessary, e.g. subdomain
      this.tenantForm.get('subdomain')?.disable();
      // Remove password validators if editing (unless password reset is supported here)
      this.tenantForm.get('adminPassword')?.clearValidators();
      this.tenantForm.get('adminPassword')?.updateValueAndValidity();
    }
  }

  createForm() {
    this.tenantForm = this.fb.group({
      id: [''],
      name: ['', Validators.required],
      subdomain: ['', [Validators.required, Validators.pattern('^[a-z0-9-]+$')]],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactPhone: [''],
      address: [''],
      adminEmail: ['', [Validators.required, Validators.email]],
      adminPassword: ['', [Validators.required, Validators.minLength(6)]],
      licenseType: ['Trial', Validators.required],
      isActive: [true]
    });
  }

  save(): void {
    if (this.tenantForm.invalid) {
      this.tenantForm.markAllAsTouched();
      return;
    }

    const tenant = this.tenantForm.getRawValue();

    if (this.isEdit) {
      this.sub$.sink = this.tenantService.update(tenant.id, tenant).subscribe(() => {
        this.toastrService.success('Tenant Updated Successfully');
        this.dialogRef.close(tenant);
      });
    } else {
      this.sub$.sink = this.tenantService.create(tenant).subscribe((res) => {
        this.toastrService.success('Tenant Created Successfully');
        this.dialogRef.close(res);
      });
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
