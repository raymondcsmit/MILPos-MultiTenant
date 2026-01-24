import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, UntypedFormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from '@core/services/toastr.service';
import { UserService } from '../user/user.service';
import { User } from '@core/domain-classes/user';
import { SecurityService } from '@core/security/security.service';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '@core/services/translation.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    RouterModule,
    MatIconModule,
    MatButtonModule
  ]
})
export class ForgotPasswordComponent implements OnInit {
  isLoading = false;
  loginFormGroup!: UntypedFormGroup;
  logoImage = '';
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private userService: UserService,
    private toastr: ToastrService,
    private translationService: TranslationService,
    private securityService: SecurityService) { }

  ngOnInit(): void {
    this.createFormGroup();
    this.companyProfileSubscription();
  }

  createFormGroup(): void {
    this.loginFormGroup = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  companyProfileSubscription() {
    this.securityService.companyProfile.subscribe((profile) => {
      if (profile && profile.logoUrl) {
        this.logoImage = profile.logoUrl;
      }
    });
  }

  onLoginSubmit() {
    if (this.loginFormGroup.valid) {
      this.isLoading = true;
      const url = `${window.location.protocol}//${window.location.host}`;
      var userObject = Object.assign(this.loginFormGroup.value);
      userObject.userName = userObject.email;
      userObject.hostUrl = url;
      this.userService.sendResetPasswordLink(userObject)
        .subscribe({
          next: (c: User) => {
            this.isLoading = false;
            this.toastr.success(this.translationService.getValue('EMAIL_SENT_SUCCESSFULLY'));
            this.router.navigate(['/login']);
          },
          error: (err) => {
            this.isLoading = false;
            this.toastr.error(err.error)
          }
        });
    } else {
      this.loginFormGroup.markAllAsTouched();
    }
  }

}
