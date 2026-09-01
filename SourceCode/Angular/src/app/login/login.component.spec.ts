import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { User } from '@core/domain-classes/user';
import { UserAuth } from '@core/domain-classes/user-auth';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let securityService: jasmine.SpyObj<SecurityService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let router: Router;
  const userAuth = { bearerToken: 'token' } as unknown as UserAuth;

  function createFixture(): void {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    securityService = jasmine.createSpyObj<SecurityService>('SecurityService', ['login', 'logout']);
    (securityService as any).companyProfile = new BehaviorSubject<User | null>(null).asObservable();
    (securityService as any).isPOSPermissionOnly = false;

    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);

    TestBed.configureTestingModule({
      imports: [LoginComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: SecurityService, useValue: securityService },
        { provide: ToastrService, useValue: toastr },
        { provide: TranslationService, useValue: translationService },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    spyOn(navigator.geolocation, 'getCurrentPosition');
  });

  it('should create and build the login form', () => {
    createFixture();
    expect(component).toBeTruthy();
    expect(component.loginFormGroup.get('userName')?.value).toBe('');
    expect(component.loginFormGroup.get('password')?.value).toBe('');
  });

  it('should mark all controls touched and not call login when the form is empty', () => {
    createFixture();
    component.onLoginSubmit();
    expect(component.loginFormGroup.get('userName')?.touched).toBeTrue();
    expect(component.loginFormGroup.get('password')?.touched).toBeTrue();
    expect(securityService.login).not.toHaveBeenCalled();
  });

  it('should reject an invalid email without calling login', () => {
    createFixture();
    component.loginFormGroup.patchValue({ userName: 'notanemail', password: 'secret' });
    component.onLoginSubmit();
    expect(component.loginFormGroup.invalid).toBeTrue();
    expect(securityService.login).not.toHaveBeenCalled();
  });

  it('should call login with the form value when valid', () => {
    securityService.login.and.returnValue(new Subject<UserAuth>());
    createFixture();
    component.loginFormGroup.patchValue({ userName: 'a@b.com', password: 'secret' });
    component.onLoginSubmit();
    expect(securityService.login).toHaveBeenCalledWith(jasmine.objectContaining({ userName: 'a@b.com', password: 'secret' }));
    expect(component.isLoading).toBeTrue();
  });

  it('should navigate to root and toast success after successful login', () => {
    securityService.login.and.returnValue(of(userAuth));
    createFixture();
    component.loginFormGroup.patchValue({ userName: 'a@b.com', password: 'secret' });
    component.onLoginSubmit();
    expect(component.isLoading).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(toastr.success).toHaveBeenCalledWith('LOGIN_SUCCESSFULLY');
  });

  it('should navigate to pos when the user has pos permission only', () => {
    (securityService as any).isPOSPermissionOnly = true;
    securityService.login.and.returnValue(of(userAuth));
    createFixture();
    component.loginFormGroup.patchValue({ userName: 'a@b.com', password: 'secret' });
    component.onLoginSubmit();
    expect(router.navigate).toHaveBeenCalledWith(['/pos']);
  });

  it('should toast the server error message when login fails', () => {
    securityService.login.and.returnValue(throwError(() => ({ error: 'Invalid credentials' })));
    createFixture();
    component.loginFormGroup.patchValue({ userName: 'a@b.com', password: 'secret' });
    component.onLoginSubmit();
    expect(component.isLoading).toBeFalse();
    expect(toastr.error).toHaveBeenCalledWith('Invalid credentials');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should pick up the company profile logo', () => {
    (securityService as any).companyProfile = new BehaviorSubject({ logoUrl: 'logo.png' } as any).asObservable();
    createFixture();
    expect(component.logoImage).toBe('logo.png');
    expect(component.logoLoadFailed).toBeFalse();
  });
});
