import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TenantService } from '@core/services/tenant.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register-tenant',
  templateUrl: './register-tenant.component.html',
  styleUrls: ['./register-tenant.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    MatIconModule,
    MatButtonModule
  ]
})
export class RegisterTenantComponent implements OnInit {
  registerForm!: UntypedFormGroup;
  isLoading = false;
  fieldTextType = false;

  constructor(
    private fb: UntypedFormBuilder,
    private tenantService: TenantService,
    private toastr: ToastrService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.createForm();
  }

  createForm(): void {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      subdomain: ['', [Validators.required, Validators.pattern('^[a-z0-9]+$')]],
      adminEmail: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      address: ['', Validators.required],
      adminPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.tenantService.registerTenant(this.registerForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastr.success('Tenant registered successfully. Please login.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isLoading = false;
        this.toastr.error(err.error || 'Registration failed.');
      }
    });
  }
}
