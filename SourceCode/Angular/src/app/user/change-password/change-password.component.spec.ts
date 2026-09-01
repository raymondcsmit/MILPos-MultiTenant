import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';

import { ChangePasswordComponent } from './change-password.component';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { UserService } from '../user.service';
import { CommonService } from '@core/services/common.service';

describe('ChangePasswordComponent', () => {
  let component: ChangePasswordComponent;
  let fixture: ComponentFixture<ChangePasswordComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let securityService: jasmine.SpyObj<SecurityService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ChangePasswordComponent>>;

  function createFixture(): void {
    fixture = TestBed.createComponent(ChangePasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    userService = jasmine.createSpyObj<UserService>('UserService', ['changePassword']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    securityService = jasmine.createSpyObj<SecurityService>('SecurityService', ['logout']);
    (securityService as any).companyProfile = new BehaviorSubject(null).asObservable();
    dialogRef = jasmine.createSpyObj<MatDialogRef<ChangePasswordComponent>>('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [ChangePasswordComponent, TranslateModule.forRoot()],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { userName: 'admin@x.com' } },
        { provide: ToastrService, useValue: toastrService },
        { provide: SecurityService, useValue: securityService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
      ],
    });
  });

  it('should create and seed the disabled email control from the dialog data', () => {
    createFixture();
    expect(component).toBeTruthy();
    expect(component.changePasswordForm.get('email')?.value).toBe('admin@x.com');
    expect(component.changePasswordForm.get('email')?.disabled).toBeTrue();
  });

  it('should not call the service when required fields are empty', () => {
    createFixture();
    component.changePassword();
    expect(component.changePasswordForm.invalid).toBeTrue();
    expect(userService.changePassword).not.toHaveBeenCalled();
  });

  it('should reject mismatched passwords without calling the service', () => {
    createFixture();
    component.changePasswordForm.patchValue({
      oldPasswordPassword: 'old',
      password: 'secret1',
      confirmPassword: 'secret2',
    });
    expect(component.changePasswordForm.hasError('notSame')).toBeTrue();
    component.changePassword();
    expect(userService.changePassword).not.toHaveBeenCalled();
  });

  it('should require a new password of at least 6 characters', () => {
    createFixture();
    component.changePasswordForm.patchValue({
      oldPasswordPassword: 'old',
      password: 'abc',
      confirmPassword: 'abc',
    });
    expect(component.changePasswordForm.get('password')?.hasError('minlength')).toBeTrue();
    expect(userService.changePassword).not.toHaveBeenCalled();
  });

  it('should change the password, logout and close the dialog on success', () => {
    userService.changePassword.and.returnValue(of({} as any));
    createFixture();
    component.changePasswordForm.patchValue({
      oldPasswordPassword: 'old',
      password: 'secret1',
      confirmPassword: 'secret1',
    });
    component.changePassword();
    expect(userService.changePassword).toHaveBeenCalledWith(
      jasmine.objectContaining({ oldPassword: 'old', newPassword: 'secret1', userName: 'admin@x.com' })
    );
    expect(toastrService.success).toHaveBeenCalledWith('SUCCESSFULLY_CHANGED_PASSWORD');
    expect(securityService.logout).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('should close the dialog on cancel', () => {
    createFixture();
    component.onNoClick();
    expect(dialogRef.close).toHaveBeenCalled();
  });
});
