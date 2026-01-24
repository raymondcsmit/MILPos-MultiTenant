import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Data, Router, RouterModule } from '@angular/router';
import { ToastrService } from '@core/services/toastr.service';
import { UserService } from '../user/user.service';
import { SecurityService } from '@core/security/security.service';
import { BaseComponent } from '../base.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-recover-password',
  templateUrl: './recover-password.component.html',
  styleUrls: ['./recover-password.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    RouterModule
  ]
})
export class RecoverPasswordComponent extends BaseComponent implements OnInit {
  logoImage = '';
  resetPasswordForm!: FormGroup;
  isLoading = false;
  token!: string;
  constructor(private activeRoute: ActivatedRoute,
    private toastrService: ToastrService,
    private fb: FormBuilder,
    private router: Router,
    private userService: UserService,
    private securityService: SecurityService) {
    super();
  }

  ngOnInit(): void {
    this.companyProfileSubscription();
    this.token = this.activeRoute?.snapshot?.params?.['link'] ?? '';
    this.activeRoute.data.subscribe({
      next: (data: Data) => {
        const email = data?.['UserReset']?.email;
        if (email) {
          this.createResetPasswordForm();
          this.resetPasswordForm.get('userName')?.setValue(email);
        } else {
          this.toastrService.error(this.translationService.getValue('WORNG_LINK_OR_LINK_IS_EXPIRED'));
          this.router.navigate(['/login']);
        }
      },
      error: () => this.router.navigate(['/login'])
    });
  }

  companyProfileSubscription() {
    this.securityService.companyProfile.subscribe((profile) => {
      if (profile && profile.logoUrl) {
        this.logoImage = profile.logoUrl;
      }
    });
  }

  createResetPasswordForm() {
    this.resetPasswordForm = this.fb.group({
      userName: [{ value: '', disabled: true }],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    }, {
      validator: this.checkPasswords
    });
  }

  checkPasswords(group: FormGroup) {
    let pass = group.get('password')?.value;
    let confirmPass = group.get('confirmPassword')?.value;
    return pass === confirmPass ? null : { notSame: true }
  }

  resetPassword() {
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    const resetPasswordData = {
      ...this.resetPasswordForm.getRawValue(),
      token: this.token
    };

    this.isLoading = true;
    this.userService.recoverPassword(this.token, resetPasswordData).subscribe({
      next: () => {
        this.toastrService.success(this.translationService.getValue('SUCCESSFULLY_RESET_PASSWORD'));
        this.router.navigate(['/login']);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
}
