import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { Tenant } from '@core/domain-classes/tenant';
import { TenantService } from '@core/services/tenant.service';
import { ToastrService } from '@core/services/toastr.service';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-tenant-admin-manage',
  templateUrl: './tenant-admin-manage.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule
  ]
})
export class TenantAdminManageComponent implements OnInit {
  adminForm!: FormGroup;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private tenantService: TenantService,
    private toastrService: ToastrService,
    public dialogRef: MatDialogRef<TenantAdminManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Tenant
  ) {}

  ngOnInit(): void {
    this.createForm();
    if (this.data) {
      // Pre-fill email from tenant contact email if available
      this.adminForm.patchValue({
        adminEmail: this.data.contactEmail || ''
      });
    }
  }

  createForm(): void {
    this.adminForm = this.fb.group({
      adminEmail: ['', [Validators.required, Validators.email]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.checkPasswords });
  }

  checkPasswords(group: AbstractControl): ValidationErrors | null {
    const pass = group.get('newPassword')?.value;
    const confirmPass = group.get('confirmPassword')?.value;
    return pass === confirmPass ? null : { notSame: true };
  }

  save(): void {
    if (this.adminForm.invalid) {
      return;
    }

    this.isSaving = true;
    const formValues = this.adminForm.value;
    const command = {
      tenantId: this.data.id,
      adminEmail: formValues.adminEmail,
      newPassword: formValues.newPassword
    };

    this.tenantService.updateAdmin(this.data.id, command).subscribe({
      next: () => {
        this.toastrService.success('Admin user updated successfully');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isSaving = false;
        this.toastrService.error(err.error?.message || 'Failed to update admin user');
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
