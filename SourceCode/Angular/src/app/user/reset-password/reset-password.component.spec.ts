import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';

import { ResetPasswordComponent } from './reset-password.component';
import { UserService } from '../user.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { User } from '@core/domain-classes/user';

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };

  beforeEach(async () => {
    userService = jasmine.createSpyObj('UserService', ['resetPassword']);
    userService.resetPassword.and.returnValue(of(null as unknown as User));
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);
    (translationService as any).lanDir$ = of('ltr');
    dialogRef = { close: jasmine.createSpy('close') };

    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent, TranslateModule.forRoot()],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { id: 'u1', email: 'admin@x.com' } as User },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
  });

  it('should create with the dialog user email pre-filled and disabled', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    const email = component.resetPasswordForm.get('email');
    expect(email?.value).toBe('admin@x.com');
    expect(email?.disabled).toBeTrue();
    expect(component.resetPasswordForm.invalid).toBeTrue();
  });

  it('mismatched confirmation keeps the form invalid', () => {
    fixture.detectChanges();
    component.resetPasswordForm.patchValue({ password: 'secret1', confirmPassword: 'secret2' });
    expect(component.resetPasswordForm.errors).toEqual({ notSame: true });
  });

  it('valid reset posts the password with userName = email, toasts and closes', () => {
    fixture.detectChanges();
    component.resetPasswordForm.patchValue({ password: 'secret1', confirmPassword: 'secret1' });
    component.resetPassword();
    expect(userService.resetPassword).toHaveBeenCalledWith({ email: '', password: 'secret1', userName: 'admin@x.com' });
    expect(toastrService.success).toHaveBeenCalledWith('SUCCESSFULLY_RESET_PASSWORD');
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('invalid form silently skips the service call', () => {
    fixture.detectChanges();
    component.resetPasswordForm.patchValue({ password: 'short' });
    component.resetPassword();
    expect(userService.resetPassword).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('onNoClick closes without saving', () => {
    fixture.detectChanges();
    component.onNoClick();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(userService.resetPassword).not.toHaveBeenCalled();
  });
});
