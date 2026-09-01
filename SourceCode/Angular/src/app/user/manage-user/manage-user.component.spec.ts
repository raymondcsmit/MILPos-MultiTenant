import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import { ManageUserComponent } from './manage-user.component';
import { UserService } from '../user.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { MatDialog } from '@angular/material/dialog';
import { Role } from '@core/domain-classes/role';
import { User } from '@core/domain-classes/user';

describe('ManageUserComponent', () => {
  let component: ManageUserComponent;
  let fixture: ComponentFixture<ManageUserComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let routeData: Subject<any>;
  let roles$: Subject<any>;
  let locations$: Subject<any>;
  let router: Router;

  const roles = [{ id: 'r1', name: 'Admin' }, { id: 'r2', name: 'Cashier' }] as unknown as Role[];

  function configure() {
    userService = jasmine.createSpyObj('UserService', ['addUser', 'updateUser']);
    userService.addUser.and.returnValue(of(null as unknown as User));
    userService.updateUser.and.returnValue(of(null as unknown as User));
    commonService = jasmine.createSpyObj('CommonService', ['getRoles', 'getAllLocations', 'getPageHelperText']);
    roles$ = new Subject<any>();
    locations$ = new Subject<any>();
    commonService.getRoles.and.returnValue(roles$.asObservable());
    commonService.getAllLocations.and.returnValue(locations$.asObservable());
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);
    (translationService as any).lanDir$ = of('ltr');
    routeData = new Subject<any>();

    TestBed.configureTestingModule({
      imports: [ManageUserComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: userService },
        { provide: CommonService, useValue: commonService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: ActivatedRoute, useValue: { data: routeData.asObservable(), snapshot: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageUserComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  }

  it('should create in add mode with password validators and location requirement', () => {
    configure();
    fixture.detectChanges();
    routeData.next({});
    expect(component).toBeTruthy();
    expect(component.isEditMode).toBeFalse();
    roles$.next(roles);
    expect(component.roleList.length).toBe(2);
    expect(component.userForm.get('password')?.validator).toBeTruthy();
    expect(component.userForm.errors).toEqual({ requiredLocation: true });
  });

  it('password mismatch sets notSame', () => {
    configure();
    fixture.detectChanges();
    routeData.next({});
    component.userForm.patchValue({ password: 'secret1', confirmPassword: 'secret2' });
    expect(component.userForm.hasError('notSame')).toBeTrue();
  });

  it('edit mode disables email, patches fields and selects user locations/roles', () => {
    configure();
    fixture.detectChanges();
    routeData.next({
      user: {
        id: 'u1', email: 'john@x.com', firstName: 'John', lastName: 'Doe', phoneNumber: '0300',
        isActive: true, isAllLocations: false, isSuperAdmin: false,
        profilePhoto: '/uploads/me.png',
        userLocations: [{ locationId: 'l1' }],
        userRoles: [{ roleId: 'r2' }],
      },
    });
    locations$.next([{ id: 'l1', name: 'Main' }]);
    roles$.next(roles);
    expect(component.isEditMode).toBeTrue();
    expect(component.userForm.get('email')?.value).toBe('john@x.com');
    expect(component.userForm.get('email')?.disabled).toBeTrue();
    expect(component.userForm.get('locations')?.value).toEqual(['l1']);
    expect(component.selectedRoles.map(r => r.id)).toEqual(['r2']);
    expect(component.imgSrc).toContain('/uploads/me.png');
  });

  it('invalid save marks touched and calls no service', () => {
    configure();
    fixture.detectChanges();
    routeData.next({});
    component.saveUser();
    expect(component.userForm.get('firstName')?.touched).toBeTrue();
    expect(userService.addUser).not.toHaveBeenCalled();
  });

  it('valid add save posts the user with roles and password, then navigates', () => {
    configure();
    fixture.detectChanges();
    routeData.next({});
    component.selectedRoles = [roles[0], roles[1]];
    component.userForm.patchValue({
      firstName: 'John', lastName: 'Doe', email: 'john@x.com', phoneNumber: '0300',
      password: 'secret1', confirmPassword: 'secret1', locations: ['l1'],
    });
    component.saveUser();
    expect(userService.addUser).toHaveBeenCalledWith(jasmine.objectContaining({
      firstName: 'John', userName: 'john@x.com', roleIds: ['r1', 'r2'], password: 'secret1', locations: ['l1'],
    }));
    expect(toastrService.success).toHaveBeenCalledWith('USER_SAVED_SUCCESSFULLY');
    expect(router.navigate).toHaveBeenCalledWith(['/users']);
  });

  it('valid edit save updates instead of adding and drops the password', () => {
    configure();
    fixture.detectChanges();
    routeData.next({
      user: {
        id: 'u1', email: 'john@x.com', firstName: 'John', lastName: 'Doe', phoneNumber: '0300',
        isActive: true, isAllLocations: true, userLocations: [], userRoles: [],
      },
    });
    component.userForm.patchValue({ firstName: 'Johnny' });
    component.saveUser();
    expect(userService.updateUser).toHaveBeenCalled();
    const arg = userService.updateUser.calls.mostRecent().args[0] as any;
    expect(arg.id).toBe('u1');
    expect(arg.firstName).toBe('Johnny');
    expect(arg.password).toBeUndefined();
    expect(arg.isAllLocations).toBeTrue();
    expect(arg.locations).toEqual([]);
    expect(router.navigate).toHaveBeenCalledWith(['/users']);
  });

  it('getLocationDisplay formats single and multiple selections', () => {
    configure();
    fixture.detectChanges();
    routeData.next({ user: { id: 'u1', email: 'j@x.c', userLocations: [], userRoles: [] } });
    locations$.next([{ id: 'l1', name: 'Main' }]);
    expect(component.getLocationDisplay()).toBe('');
    component.userForm.patchValue({ locations: ['l1'] });
    expect(component.getLocationDisplay()).toBe('Main');
  });
});
