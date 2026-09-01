import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';

import { RecoverPasswordComponent } from './recover-password.component';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { UserService } from '../user/user.service';

describe('RecoverPasswordComponent', () => {
  let component: RecoverPasswordComponent;
  let fixture: ComponentFixture<RecoverPasswordComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let router: Router;
  let data$: BehaviorSubject<any>;

  function createFixture(): void {
    fixture = TestBed.createComponent(RecoverPasswordComponent);
    component = fixture.componentInstance;
  }

  beforeEach(() => {
    userService = jasmine.createSpyObj<UserService>('UserService', ['recoverPassword', 'sendResetPasswordLink']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);

    const securityService = jasmine.createSpyObj<SecurityService>('SecurityService', ['hasClaim']);
    (securityService as any).companyProfile = new BehaviorSubject(null).asObservable();

    TestBed.configureTestingModule({
      imports: [RecoverPasswordComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            get snapshot() {
              return { params: { link: 'tok123' } };
            },
            get data() {
              return data$.asObservable();
            },
          },
        },
        { provide: UserService, useValue: userService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: SecurityService, useValue: securityService },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    data$ = new BehaviorSubject<any>({ UserReset: { email: 'admin@x.com' } });
  });

  it('should create and build the reset form from resolver data with the token from the url', () => {
    createFixture();
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.token).toBe('tok123');
    expect(component.resetPasswordForm.get('userName')?.value).toBe('admin@x.com');
    expect(component.resetPasswordForm.get('userName')?.disabled).toBeTrue();
  });

  it('should toast an error and navigate to login when the link has no email', () => {
    data$.next({});
    component = TestBed.createComponent(RecoverPasswordComponent).componentInstance;
    component.ngOnInit();
    expect(toastrService.error).toHaveBeenCalledWith('WORNG_LINK_OR_LINK_IS_EXPIRED');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(component.resetPasswordForm).toBeUndefined();
  });

  it('should not call the service when the form is untouched and empty', () => {
    createFixture();
    fixture.detectChanges();
    component.resetPassword();
    expect(component.resetPasswordForm.invalid).toBeTrue();
    expect(userService.recoverPassword).not.toHaveBeenCalled();
  });

  it('should reject mismatched passwords without calling the service', () => {
    createFixture();
    fixture.detectChanges();
    component.resetPasswordForm.patchValue({ password: 'secret1', confirmPassword: 'secret2' });
    expect(component.resetPasswordForm.hasError('notSame')).toBeTrue();
    component.resetPassword();
    expect(userService.recoverPassword).not.toHaveBeenCalled();
  });

  it('should recover the password with the token and navigate to login on success', () => {
    userService.recoverPassword.and.returnValue(of({} as any));
    createFixture();
    fixture.detectChanges();
    component.resetPasswordForm.patchValue({ password: 'secret1', confirmPassword: 'secret1' });
    component.resetPassword();
    expect(userService.recoverPassword).toHaveBeenCalledWith(
      'tok123',
      jasmine.objectContaining({ userName: 'admin@x.com', password: 'secret1', token: 'tok123' })
    );
    expect(toastrService.success).toHaveBeenCalledWith('SUCCESSFULLY_RESET_PASSWORD');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(component.isLoading).toBeFalse();
  });
});
