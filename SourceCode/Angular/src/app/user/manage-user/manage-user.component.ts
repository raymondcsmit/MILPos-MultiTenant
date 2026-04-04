import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Role } from '@core/domain-classes/role';
import { User } from '@core/domain-classes/user';
import { CommonService } from '@core/services/common.service';
import { environment } from '@environments/environment';
import { ToastrService } from '@core/services/toastr.service';
import { UserService } from '../user.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { BaseComponent } from '../../base.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-manage-user',
  templateUrl: './manage-user.component.html',
  styleUrls: ['./manage-user.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    ReactiveFormsModule,
    TranslateModule,
    MatSelectModule,
    MatCardModule,
    RouterModule,
    HasClaimDirective,
    MatCheckboxModule,
    MatIconModule,
    MatButtonModule
  ]
})
export class ManageUserComponent extends BaseComponent implements OnInit {
  user!: User;
  userForm!: UntypedFormGroup;
  roleList!: Role[];
  isEditMode = false;
  selectedRoles: Role[] = [];
  imgSrc!: string | ArrayBuffer;
  isImageUpdate: boolean = false;
  locations: BusinessLocation[] = [];
  constructor(
    private fb: UntypedFormBuilder,
    private router: Router,
    private activeRoute: ActivatedRoute,
    private userService: UserService,
    private toastrService: ToastrService,
    private commonService: CommonService
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.createUserForm();
    this.sub$.sink = this.activeRoute.data.subscribe((data: any) => {
      if (data.user) {
        this.isEditMode = true;
        this.userForm.patchValue({
          id: data.user.id,
          userName: data.user.userName,
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          phoneNumber: data.user.phoneNumber,
          address: data.user.address,
          isActive: data.user.isActive,
          isAllLocations: data.user.isAllLocations,
          isSuperAdmin: data.user.isSuperAdmin
        });
        this.userForm.get('email')?.disable();
        this.user = data.user;
        if (this.user.profilePhoto) {
          this.imgSrc = environment.apiUrl + this.user.profilePhoto;
        }
      } else {
        this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
        this.userForm.get('confirmPassword')?.setValidators([Validators.required]);
      }
    });
    this.getRoles();
    this.getLocations();
  }

  createUserForm() {
    this.userForm = this.fb.group(
      {
        id: [''],
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        phoneNumber: ['', [Validators.required]],
        password: [''],
        confirmPassword: [''],
        address: [''],
        isActive: [true],
        isAllLocations: [false],
        locations: [''],
      },
      {
        validators: [
          this.checkPasswords,
          this.validateLocations
        ]
      }
    );
  }

  validateLocations: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const locations = group.get('locations')?.value;
    const isAllLocations = group.get('isAllLocations')?.value;

    if ((!locations || locations.length === 0) && !isAllLocations) {
      return { requiredLocation: true };
    }
    return null;
  };

  checkPasswords: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const pass = group.get('password')?.value;
    const confirmPass = group.get('confirmPassword')?.value;

    if (pass && confirmPass && pass !== confirmPass) {
      return { notSame: true };
    }
    return null;
  };

  getLocations() {
    // Read from SecurityService cache (loaded at login) — no extra API call
    this.commonService.getAllLocations().subscribe((locations: BusinessLocation[]) => {
      this.locations = locations;

      if (this.isEditMode && this.user?.userLocations) {
        const selectedIds = this.user.userLocations.map(ul => ul.locationId);
        this.userForm.patchValue({ locations: selectedIds });
      } else {
        this.userForm.patchValue({ locations: [] });
      }
    });
  }

  getLocationDisplay(): string {
    const selectedIds = this.userForm.get('locations')?.value || [];
    if (!this.locations || selectedIds.length === 0) return '';

    const selectedLocations = this.locations.filter(loc => selectedIds.includes(loc.id));
    const firstName = selectedLocations[0]?.name || '';
    const remainingCount = selectedLocations.length - 1;

    if (remainingCount > 0) {
      return `${firstName} (+${remainingCount} ${remainingCount === 1 ? 'other' : 'others'})`;
    }
    return firstName;
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
    };
  }

  onRemoveImage() {
    this.isImageUpdate = true;
    this.imgSrc = '';
  }

  saveUser() {
    if (!this.userForm.valid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const user = this.createBuildObject();
    if (user.isAllLocations) {
      user.locations = [];
    }

    if (this.isEditMode) {
      this.sub$.sink = this.userService.updateUser(user).subscribe(() => {
        this.toastrService.success(
          this.translationService.getValue('USER_SAVED_SUCCESSFULLY')
        );
        this.router.navigate(['/users']);
      });
    } else {
      this.sub$.sink = this.userService.addUser(user).subscribe(() => {
        this.toastrService.success(
          this.translationService.getValue('USER_SAVED_SUCCESSFULLY')
        );
        this.router.navigate(['/users']);
      });
    }
  }

  createBuildObject(): User {
    const userId = this.userForm.get('id')?.value;
    const user: User = {
      id: userId,
      firstName: this.userForm.get('firstName')?.value,
      lastName: this.userForm.get('lastName')?.value,
      email: this.userForm.get('email')?.value,
      phoneNumber: this.userForm.get('phoneNumber')?.value,
      // password: this.userForm.get('password')?.value,
      userName: this.userForm.get('email')?.value,
      isActive: this.userForm.get('isActive')?.value,
      address: this.userForm.get('address')?.value,
      roleIds: this.getSelectedRoles() as string[] ?? [] as string[],
      locations: this.userForm.get('locations')?.value ?? [],
      isImageUpdate: this.isImageUpdate,
      imgSrc: this.imgSrc as string,
      isAllLocations: this.userForm.get('isAllLocations')?.value,
    };
    if (!this.isEditMode) {
      user.password = this.userForm.get('password')?.value;
    }
    return user;
  }

  getSelectedRoles() {
    return this.selectedRoles.map((role) => {
      return role.id;
    });
  }

  getRoles() {
    this.sub$.sink = this.commonService
      .getRoles()
      .subscribe((roles: Role[]) => {
        this.roleList = roles;
        if (this.isEditMode) {
          const selectedRoleIds = this.user?.userRoles?.map((c) => c.roleId);
          if (selectedRoleIds) {
            this.selectedRoles = this.roleList.filter(
              (c) => selectedRoleIds?.indexOf(c.id ?? '') > -1
            );
          }
        }
      });
  }
}
