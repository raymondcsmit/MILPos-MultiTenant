import { Component, Inject, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { User } from '@core/domain-classes/user';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { UserService } from '../user.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { BaseComponent } from '../../base.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    MatIconModule,
    MatDialogModule,
    ReactiveFormsModule,
    TranslateModule,
    MatButtonModule,
    MatCardModule
  ]
})

export class ChangePasswordComponent extends BaseComponent implements OnInit {
  changePasswordForm!: FormGroup;
  constructor(
    private userService: UserService,
    private fb: UntypedFormBuilder,
    public dialogRef: MatDialogRef<ChangePasswordComponent>,
    @Inject(MAT_DIALOG_DATA) public data: User,
    private toastrService: ToastrService,
    private securityService: SecurityService) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.createChangePasswordForm();
    this.changePasswordForm.get('email')?.setValue(this.data.userName);
  }

  createChangePasswordForm() {
    this.changePasswordForm = this.fb.group({
      email: [{ value: '', disabled: true }],
      oldPasswordPassword: ['', [Validators.required]],
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

  changePassword() {
    if (this.changePasswordForm.valid) {
      this.sub$.sink = this.userService.changePassword(this.createBuildObject()).subscribe(d => {
        this.toastrService.success(this.translationService.getValue('SUCCESSFULLY_CHANGED_PASSWORD'))
        this.securityService.logout();
        this.dialogRef.close();
      })
    }
  }

  createBuildObject() {
    return {
      email: '',
      oldPassword: this.changePasswordForm.get('oldPasswordPassword')?.value,
      newPassword: this.changePasswordForm.get('password')?.value,
      userName: this.changePasswordForm.get('email')?.value,
    }
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
}
