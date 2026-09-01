import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { ForgotPasswordComponent } from './forgot-password.component';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { UserService } from '../user/user.service';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let router: Router;

  function createFixture(): void {
    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    userService = jasmine.createSpyObj<UserService>('UserService', ['sendResetPasswordLink']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);

    const securityService = jasmine.createSpyObj<SecurityService>('SecurityService', ['hasClaim']);
    (securityService as any).companyProfile = new BehaviorSubject(null).asObservable();

    TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: userService },
        { provide: ToastrService, useValue: toastr },
        { provide: TranslationService, useValue: translationService },
        { provide: SecurityService, useValue: securityService },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  it('should create and build the email form', () => {
    createFixture();
    expect(component).toBeTruthy();
    expect(component.loginFormGroup.get('email')?.value).toBe('');
  });

  it('should mark the form touched and not call the service when empty', () => {
    createFixture();
    component.onLoginSubmit();
    expect(component.loginFormGroup.get('email')?.touched).toBeTrue();
    expect(userService.sendResetPasswordLink).not.toHaveBeenCalled();
  });

  it('should send a reset link with userName derived from email and current host', () => {
    userService.sendResetPasswordLink.and.returnValue(of({} as any));
    createFixture();
    component.loginFormGroup.patchValue({ email: 'a@b.com' });
    component.onLoginSubmit();
    expect(userService.sendResetPasswordLink).toHaveBeenCalledWith(
      jasmine.objectContaining({
        email: 'a@b.com',
        userName: 'a@b.com',
        hostUrl: `${window.location.protocol}//${window.location.host}`,
      })
    );
    expect(component.isLoading).toBeFalse();
    expect(toastr.success).toHaveBeenCalledWith('EMAIL_SENT_SUCCESSFULLY');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should toast the server error when the request fails', () => {
    userService.sendResetPasswordLink.and.returnValue(throwError(() => ({ error: 'User not found' })));
    createFixture();
    component.loginFormGroup.patchValue({ email: 'a@b.com' });
    component.onLoginSubmit();
    expect(component.isLoading).toBeFalse();
    expect(toastr.error).toHaveBeenCalledWith('User not found');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should pick up the company profile logo', () => {
    createFixture();
    expect(component.logoImage).toBe('');
  });
});
