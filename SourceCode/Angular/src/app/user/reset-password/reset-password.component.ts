import { Component, Inject, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { User } from '@core/domain-classes/user';
import { ToastrService } from '@core/services/toastr.service';
import { UserService } from '../user.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatDialogModule,
    MatIconModule,
    ReactiveFormsModule,
    MatButtonModule,
    HasClaimDirective,
    MatCardModule
  ]
})
export class ResetPasswordComponent extends BaseComponent implements OnInit {
  resetPasswordForm!: FormGroup;
  constructor(
    private userService: UserService,
    private fb: UntypedFormBuilder,
    public dialogRef: MatDialogRef<ResetPasswordComponent>,
    @Inject(MAT_DIALOG_DATA) public data: User,
    private toastrService: ToastrService) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.createResetPasswordForm();
    this.resetPasswordForm.get('email')?.setValue(this.data.email);
  }

  createResetPasswordForm() {
    this.resetPasswordForm = this.fb.group({
      email: [{ value: '', disabled: true }],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    }, {
      validator: this.checkPasswords
    });
  }

  checkPasswords(group: UntypedFormGroup) {
    let pass = group.get('password')?.value;
    let confirmPass = group.get('confirmPassword')?.value;
    return pass === confirmPass ? null : { notSame: true }
  }

  resetPassword() {
    if (this.resetPasswordForm.valid) {
      this.userService.resetPassword(this.createBuildObject()).subscribe(d => {
        this.toastrService.success(this.translationService.getValue('SUCCESSFULLY_RESET_PASSWORD'))
        this.dialogRef.close();
      })
    }
  }

  createBuildObject(): User {
    return {
      email: '',
      password: this.resetPasswordForm.get('password')?.value,
      userName: this.resetPasswordForm.get('email')?.value,
    }
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
}
