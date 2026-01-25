import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { FBRConfigurationService } from '@core/services/fbr-configuration.service';
import { ToastrService } from '@core/services/toastr.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';

export interface FBRConfiguration {
  id?: string;
  clientId: string;
  clientSecret: string;
  fbrKey: string;
  posId: string;
  branchCode: string;
  strn: string;
  apiBaseUrl: string;
  isEnabled: boolean;
  isTestMode: boolean;
  autoSubmitInvoices: boolean;
  maxRetryAttempts: number;
  retryDelaySeconds: number;
  maxRetryDelaySeconds: number;
  currentAccessToken?: string;
  tokenExpiresAt?: Date;
  lastSuccessfulSubmission?: Date;
}

@Component({
  selector: 'app-fbr-settings',
  templateUrl: './fbr-settings.component.html',
  styleUrls: ['./fbr-settings.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule,
    TranslateModule,
    PageHelpTextComponent
  ]
})
export class FBRSettingsComponent implements OnInit {
  settingsForm!: FormGroup;
  isLoading = false;
  isSaving = false;
  isTesting = false;
  showPassword = false;
  showSecret = false;
  showKey = false;
  
  connectionStatus: 'unknown' | 'success' | 'failed' = 'unknown';
  connectionMessage = '';
  tokenStatus = '';
  
  apiEnvironments = [
    { value: 'https://esp.fbr.gov.pk/api/v1', label: 'Production' },
    { value: 'https://sandbox.fbr.gov.pk/api/v1', label: 'Sandbox (Testing)' }
  ];

  constructor(
    private fb: FormBuilder,
    private fbrService: FBRConfigurationService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadConfiguration();
  }

  private initializeForm(): void {
    this.settingsForm = this.fb.group({
      clientId: ['', [Validators.required, Validators.minLength(10)]],
      clientSecret: ['', [Validators.required, Validators.minLength(20)]],
      fbrKey: ['', [Validators.required, Validators.minLength(20)]],
      posId: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{3,10}$/)]],
      branchCode: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{2,10}$/)]],
      strn: ['', [Validators.required, Validators.pattern(/^\d{7}-\d$/)]],
      apiBaseUrl: ['https://sandbox.fbr.gov.pk/api/v1', Validators.required],
      isEnabled: [false],
      isTestMode: [true],
      autoSubmitInvoices: [true],
      maxRetryAttempts: [5, [Validators.required, Validators.min(1), Validators.max(10)]],
      retryDelaySeconds: [60, [Validators.required, Validators.min(30), Validators.max(300)]],
      maxRetryDelaySeconds: [3600, [Validators.required, Validators.min(300), Validators.max(7200)]]
    });

    // Watch for test mode changes to update API URL
    this.settingsForm.get('isTestMode')?.valueChanges.subscribe(isTestMode => {
      const apiUrl = isTestMode 
        ? 'https://sandbox.fbr.gov.pk/api/v1'
        : 'https://esp.fbr.gov.pk/api/v1';
      this.settingsForm.patchValue({ apiBaseUrl: apiUrl }, { emitEvent: false });
    });
  }

  loadConfiguration(): void {
    this.isLoading = true;
    this.fbrService.getConfiguration().subscribe({
      next: (config) => {
        if (config) {
          this.settingsForm.patchValue(config);
          this.updateTokenStatus(config);
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toastrService.error('Failed to load FBR configuration');
        this.isLoading = false;
      }
    });
  }

  private updateTokenStatus(config: FBRConfiguration): void {
    if (config.tokenExpiresAt) {
      const expiresAt = new Date(config.tokenExpiresAt);
      const now = new Date();
      const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilExpiry < 0) {
        this.tokenStatus = 'Token expired - will refresh automatically';
      } else if (hoursUntilExpiry < 1) {
        this.tokenStatus = `Token expires in ${Math.round(hoursUntilExpiry * 60)} minutes`;
      } else {
        this.tokenStatus = `Token valid for ${Math.round(hoursUntilExpiry)} hours`;
      }
    } else {
      this.tokenStatus = 'No token available';
    }
  }

  async testConnection(): Promise<void> {
    if (this.settingsForm.invalid) {
      this.toastrService.warning('Please fill all required fields correctly');
      return;
    }

    this.isTesting = true;
    this.connectionStatus = 'unknown';
    this.connectionMessage = 'Testing connection...';

    const config = this.settingsForm.value;

    this.fbrService.testConnection(config).subscribe({
      next: (result) => {
        this.isTesting = false;
        if (result.success) {
          this.connectionStatus = 'success';
          this.connectionMessage = result.message || 'Connection successful!';
          this.toastrService.success('FBR API connection successful');
        } else {
          this.connectionStatus = 'failed';
          this.connectionMessage = result.message || 'Connection failed';
          this.toastrService.error('FBR API connection failed');
        }
      },
      error: (error) => {
        this.isTesting = false;
        this.connectionStatus = 'failed';
        this.connectionMessage = error.error?.message || 'Connection test failed';
        this.toastrService.error('Failed to test connection');
      }
    });
  }

  async refreshToken(): Promise<void> {
    if (!this.settingsForm.value.clientId || !this.settingsForm.value.clientSecret) {
      this.toastrService.warning('Client ID and Secret are required');
      return;
    }

    this.isLoading = true;
    this.fbrService.refreshToken().subscribe({
      next: (result) => {
        this.isLoading = false;
        if (result.success) {
          this.toastrService.success('Token refreshed successfully');
          this.loadConfiguration(); // Reload to get new token info
        } else {
          this.toastrService.error('Failed to refresh token');
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.toastrService.error('Failed to refresh token');
      }
    });
  }

  async saveConfiguration(): Promise<void> {
    if (this.settingsForm.invalid) {
      this.toastrService.warning('Please fill all required fields correctly');
      this.markFormGroupTouched(this.settingsForm);
      return;
    }

    this.isSaving = true;
    const config = this.settingsForm.value;

    this.fbrService.saveConfiguration(config).subscribe({
      next: (result) => {
        this.isSaving = false;
        if (result.success) {
          this.toastrService.success('FBR configuration saved successfully');
          this.loadConfiguration(); // Reload to get updated data
        } else {
          this.toastrService.error('Failed to save configuration');
        }
      },
      error: (error) => {
        this.isSaving = false;
        this.toastrService.error('Failed to save configuration');
      }
    });
  }

  togglePasswordVisibility(field: 'password' | 'secret' | 'key'): void {
    switch (field) {
      case 'password':
        this.showPassword = !this.showPassword;
        break;
      case 'secret':
        this.showSecret = !this.showSecret;
        break;
      case 'key':
        this.showKey = !this.showKey;
        break;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.settingsForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    if (control.errors['required']) {
      return 'This field is required';
    }
    if (control.errors['minlength']) {
      return `Minimum length is ${control.errors['minlength'].requiredLength}`;
    }
    if (control.errors['pattern']) {
      switch (fieldName) {
        case 'posId':
          return 'POS ID must be 3-10 uppercase alphanumeric characters';
        case 'branchCode':
          return 'Branch Code must be 2-10 uppercase alphanumeric characters';
        case 'strn':
          return 'STRN format: 1234567-8';
        default:
          return 'Invalid format';
      }
    }
    if (control.errors['min']) {
      return `Minimum value is ${control.errors['min'].min}`;
    }
    if (control.errors['max']) {
      return `Maximum value is ${control.errors['max'].max}`;
    }

    return 'Invalid value';
  }
}
