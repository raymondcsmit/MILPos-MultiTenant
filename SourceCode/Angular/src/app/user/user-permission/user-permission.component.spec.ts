import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import { UserPermissionComponent } from './user-permission.component';
import { UserService } from '../user.service';
import { PageService } from '@core/services/page.service';
import { ActionService } from '@core/services/action.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { Page } from '@core/domain-classes/page';
import { User } from '@core/domain-classes/user';

describe('UserPermissionComponent', () => {
  let component: UserPermissionComponent;
  let fixture: ComponentFixture<UserPermissionComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let pageService: jasmine.SpyObj<PageService>;
  let actionService: jasmine.SpyObj<ActionService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let routeData: Subject<any>;
  let router: Router;

  const user = { id: 'u1', userClaims: [] } as unknown as User;

  beforeEach(async () => {
    routeData = new Subject<any>();
    userService = jasmine.createSpyObj('UserService', ['updateUserClaim']);
    userService.updateUserClaim.and.returnValue(of(null as unknown as User));
    pageService = jasmine.createSpyObj('PageService', ['getAll']);
    pageService.getAll.and.returnValue(of([{ id: 'p1', name: 'Users' }, { id: 'p2', name: 'Roles' }] as any[]));
    actionService = jasmine.createSpyObj('ActionService', ['getAll']);
    actionService.getAll.and.returnValue(of([
      { id: 'a1', pageId: 'p1', code: 'USR_ADD', name: 'Add User' },
      { id: 'a2', pageId: 'p1', code: 'USR_VIEW', name: 'View User' },
    ] as any[]));
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);
    (translationService as any).lanDir$ = of('ltr');

    TestBed.configureTestingModule({
      imports: [UserPermissionComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: userService },
        { provide: PageService, useValue: pageService },
        { provide: ActionService, useValue: actionService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: ActivatedRoute, useValue: { data: routeData.asObservable(), snapshot: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserPermissionComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  it('should create, resolve the user and map page actions onto pages', () => {
    component.user = user;
    fixture.detectChanges();
    routeData.next({ user });
    expect(component.user.id).toBe('u1');
    expect(component.pages.length).toBe(2);
    const usersPage = component.pages.find((p: any) => p.id === 'p1')!;
    expect(usersPage.pageActions!.map((a: any) => a.code)).toEqual(['USR_ADD', 'USR_VIEW']);
    expect(component.pages.find((p: any) => p.id === 'p2')!.pageActions).toEqual([]);
  });

  it('manageUserClaimAction posts claims, toasts and navigates back to users', () => {
    component.user = user;
    fixture.detectChanges();
    routeData.next({ user });
    component.manageUserClaimAction(user);
    expect(userService.updateUserClaim).toHaveBeenCalledWith(user.userClaims!, 'u1');
    expect(toastrService.success).toHaveBeenCalledWith('USER_PERMISSION_UPDATED_SUCCESSFULLY');
    expect(router.navigate).toHaveBeenCalledWith(['/users']);
  });
});
