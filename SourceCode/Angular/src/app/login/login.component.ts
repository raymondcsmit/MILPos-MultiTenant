import { Component, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { BaseComponent } from '../base.component';
import { Router, RouterModule } from '@angular/router';
import { UserAuth } from '@core/domain-classes/user-auth';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { User } from '@core/domain-classes/user';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    MatIconModule,
    MatButtonModule
  ]
})
export class LoginComponent extends BaseComponent implements OnInit {
  loginFormGroup!: UntypedFormGroup;
  isLoading = false;
  userData!: User;
  resultMessage!: string;
  fieldTextType: boolean = false;
  lat!: number;
  lng!: number;
  logoImage!: string;
  logoLoadFailed = false;
  constructor(
    private fb: UntypedFormBuilder,
    private router: Router,
    private securityService: SecurityService,
    private toastr: ToastrService,
    private translateService: TranslationService
  ) {
    super();
  }

  ngOnInit(): void {
    this.companyProfileSubscription();
    this.createFormGroup();
    navigator.geolocation.getCurrentPosition((position) => {
      this.lat = position.coords.latitude;
      this.lng = position.coords.longitude;
    });
  }

  companyProfileSubscription() {
    this.securityService.companyProfile.subscribe((profile) => {
      if (profile && profile.logoUrl) {
        this.logoImage = profile.logoUrl;
        this.logoLoadFailed = false;
      }
    });
  }

  onLoginSubmit() {
    if (this.loginFormGroup.valid) {
      this.isLoading = true;
      const userObject = Object.assign(this.loginFormGroup.value, {
        latitude: this.lat,
        longitude: this.lng,
      });
      this.sub$.sink = this.securityService.login(userObject).subscribe({
        next: (c: UserAuth) => {
          this.isLoading = false;
          if (this.securityService.isPOSPermissionOnly) {
            this.router.navigate(['/pos']);
          } else {
            this.router.navigate(['/']);
          }
          this.toastr.success(this.translateService.getValue('LOGIN_SUCCESSFULLY'));
        },
        error: (err) => {
          this.isLoading = false;
          this.toastr.error(err.error || err.message || this.translateService.getValue('SOMETHING_WENT_WRONG'));
        }
      });
    } else {
      this.loginFormGroup.markAllAsTouched();
      return;
    }
  }

  createFormGroup(): void {
    this.loginFormGroup = this.fb.group({
      userName: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }
  onRegistrationClick(): void {
    this.router.navigate(['/registration']);
  }
}
