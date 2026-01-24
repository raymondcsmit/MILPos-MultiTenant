import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SecurityService } from '@core/security/security.service';
import { LicenseValidatorService } from '@mlglobtech/license-validator-pos';

@Component({
  selector: 'app-activate-license',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule
  ],
  templateUrl: './activate-license.component.html',
  styleUrl: './activate-license.component.scss'
})
export class ActivateLicenseComponent implements OnInit {
  logoUrl?: string;
  securityService = inject(SecurityService);
  licenseValidatorService = inject(LicenseValidatorService);
  activatedForm!: FormGroup;

  ngOnInit(): void {
    this.createForm();
    this.getCompanyProfile();
  }
  createForm(): void {
    this.activatedForm = new FormGroup({
      purchaseCode: new FormControl('', [Validators.required, Validators.minLength(36)])
    });
  }

  getCompanyProfile(): void {
    this.securityService.companyProfile.subscribe((c) => {
      if (c) {
        this.logoUrl = c.logoUrl;
      }
    });
  }

  onActivateLicense(): void {
    if (this.activatedForm.invalid) {
      this.activatedForm.markAllAsTouched();
      return;
    }
    this.licenseValidatorService.onActivateLicense(this.activatedForm.value.purchaseCode);
  }

}
