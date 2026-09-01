import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { Location } from '@angular/common';
import { of } from 'rxjs';

import { MyProfileComponent } from './my-profile.component';
import { UserService } from '../user.service';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { User } from '@core/domain-classes/user';

describe('MyProfileComponent', () => {
  let component: MyProfileComponent;
  let fixture: ComponentFixture<MyProfileComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let securityService: jasmine.SpyObj<SecurityService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let location: jasmine.SpyObj<Location>;

  const user = {
    id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@x.com',
    phoneNumber: '0300', address: 'St 1', profilePhoto: '/uploads/me.png',
  } as unknown as User;

  beforeEach(async () => {
    userService = jasmine.createSpyObj('UserService', ['getUserProfile', 'updateUserProfile']);
    userService.getUserProfile.and.returnValue(of(user));
    userService.updateUserProfile.and.returnValue(of(user));
    securityService = jasmine.createSpyObj('SecurityService', ['hasClaim', 'updateUserProfile']);
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);
    (translationService as any).lanDir$ = of('ltr');
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    location = jasmine.createSpyObj('Location', ['back']);

    TestBed.configureTestingModule({
      imports: [MyProfileComponent, TranslateModule.forRoot()],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: SecurityService, useValue: securityService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: dialog },
        { provide: Location, useValue: location },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyProfileComponent);
    component = fixture.componentInstance;
  });

  it('should create and patch the profile into the form', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.userForm.get('firstName')?.value).toBe('John');
    expect(component.userForm.get('email')?.value).toBe('john@x.com');
    expect(component.imgSrc).toContain('/uploads/me.png');
  });

  it('invalid update errors without calling the service', () => {
    fixture.detectChanges();
    component.userForm.patchValue({ firstName: '', lastName: '', phoneNumber: '' });
    component.updateProfile();
    expect(toastrService.error).toHaveBeenCalledWith('PLEASE_ENTER_PROPER_DATA');
    expect(userService.updateUserProfile).not.toHaveBeenCalled();
  });

  it('valid update posts the built object, toasts and pushes to security', () => {
    fixture.detectChanges();
    component.updateProfile();
    expect(userService.updateUserProfile).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 'u1', firstName: 'John', userName: 'john@x.com', isImageUpdate: false,
    }));
    expect(toastrService.success).toHaveBeenCalledWith('PROFILE_UPDATED_SUCCESSFULLY');
    expect(securityService.updateUserProfile).toHaveBeenCalled();
  });

  it('onRemoveImage flags the image update and clears the preview', () => {
    fixture.detectChanges();
    component.onRemoveImage();
    expect(component.isImageUpdate).toBeTrue();
    expect(component.imgSrc).toBe('');
  });

  it('onFileSelect ignores non-image files', () => {
    fixture.detectChanges();
    component.onFileSelect({ target: { files: [{ type: 'application/pdf', name: 'f.pdf' }] } });
    expect(component.isImageUpdate).toBeFalse();
  });

  it('changePassword opens the dialog with a copy of the user', () => {
    fixture.detectChanges();
    component.changePassword();
    expect(dialog.open).toHaveBeenCalled();
    const openedWith = dialog.open.calls.mostRecent().args[1] as any;
    expect(openedWith.data).toEqual(user);
    expect(openedWith.data).not.toBe(component.user);
  });

  it('onCancle goes back', () => {
    fixture.detectChanges();
    component.onCancle();
    expect(location.back).toHaveBeenCalled();
  });
});
