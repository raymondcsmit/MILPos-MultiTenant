import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { User } from '@core/domain-classes/user';
import { SecurityService } from '@core/security/security.service';
import { environment } from '@environments/environment';
import { ToastrService } from '@core/services/toastr.service';
import { ChangePasswordComponent } from '../change-password/change-password.component';
import { UserService } from '../user.service';
import { Location } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MatCardModule } from '@angular/material/card';
import { BaseComponent } from '../../base.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-my-profile',
  templateUrl: './my-profile.component.html',
  styleUrls: ['./my-profile.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule
  ]
})
export class MyProfileComponent extends BaseComponent implements OnInit {
  userForm!: UntypedFormGroup;
  user!: User;
  fileSelected!: File;
  imgSrc!: string | ArrayBuffer;
  isImageUpdate: boolean = false;
  constructor(
    private fb: UntypedFormBuilder,
    private userService: UserService,
    private toastrService: ToastrService,
    private dialog: MatDialog,
    private securityService: SecurityService,
    private location: Location) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.createUserForm();
    this.sub$.sink = this.userService.getUserProfile().subscribe((user: User) => {
      this.user = user;
      if (this.user) {
        if (this.user.profilePhoto) {
          this.imgSrc = environment.apiUrl + this.user.profilePhoto;
        }
        this.userForm.patchValue(this.user);
      }
    });

  }

  onFileSelect($event: any) {
    const fileSelected = $event.target.files[0];
    if (!fileSelected) {
      return;
    }
    const mimeType = fileSelected.type;
    if (mimeType.match(/image\/*/) == null) {
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(fileSelected);
    // tslint:disable-next-line: variable-name
    reader.onload = (_event) => {
      this.imgSrc = reader.result ?? '';
      this.isImageUpdate = true;
      $event.target.value = '';
    }
  }

  onRemoveImage() {
    this.isImageUpdate = true;
    this.imgSrc = '';
  }

  createUserForm() {
    this.userForm = this.fb.group({
      id: [''],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required]],
      address: ['']
    });
  }

  updateProfile() {
    if (this.userForm.valid) {
      const user = this.createBuildObject();
      this.sub$.sink = this.userService.updateUserProfile(user)
        .subscribe((user: User) => {
          this.toastrService.success(this.translationService.getValue('PROFILE_UPDATED_SUCCESSFULLY'));
          this.securityService.updateUserProfile(user);
        });
    } else {
      this.toastrService.error(this.translationService.getValue('PLEASE_ENTER_PROPER_DATA'))
    }
  }

  createBuildObject(): User {
    const user: User = {
      id: this.userForm.get('id')?.value,
      firstName: this.userForm.get('firstName')?.value,
      lastName: this.userForm.get('lastName')?.value,
      email: this.userForm.get('email')?.value,
      phoneNumber: this.userForm.get('phoneNumber')?.value,
      userName: this.userForm.get('email')?.value,
      address: this.userForm.get('address')?.value,
      isImageUpdate: this.isImageUpdate,
      imgSrc: this.imgSrc as string
    }
    return user;
  }

  changePassword(): void {
    this.dialog.open(ChangePasswordComponent, {
      width: '400px',
      direction: this.langDir,
      data: Object.assign({}, this.user)
    });
  }

  onCancle() {
    this.location.back();
  }
}
