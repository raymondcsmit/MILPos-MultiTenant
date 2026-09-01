import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import { ManageRoleComponent } from './manage-role.component';
import { RoleService } from '../role.service';
import { PageService } from '@core/services/page.service';
import { ActionService } from '@core/services/action.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { Page } from '@core/domain-classes/page';
import { Role } from '@core/domain-classes/role';

describe('ManageRoleComponent', () => {
  let component: ManageRoleComponent;
  let fixture: ComponentFixture<ManageRoleComponent>;
  let roleService: jasmine.SpyObj<RoleService>;
  let pageService: jasmine.SpyObj<PageService>;
  let actionService: jasmine.SpyObj<ActionService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let routeData: Subject<any>;
  let router: Router;

  const role = { id: 'r1', name: 'Admin', roleClaims: [] } as unknown as Role;

  beforeEach(async () => {
    routeData = new Subject<any>();
    roleService = jasmine.createSpyObj('RoleService', ['addRole', 'updateRole']);
    roleService.addRole.and.returnValue(of(role));
    roleService.updateRole.and.returnValue(of(role));
    pageService = jasmine.createSpyObj('PageService', ['getAll']);
    pageService.getAll.and.returnValue(of([{ id: 'p1', name: 'Users', name_En: 'Users' }] as any[]));
    actionService = jasmine.createSpyObj('ActionService', ['getAll']);
    actionService.getAll.and.returnValue(of([
      { id: 'a1', pageId: 'p1', code: 'USR_ADD', name: 'Add User' },
    ] as any[]));
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);
    (translationService as any).lanDir$ = of('ltr');

    TestBed.configureTestingModule({
      imports: [ManageRoleComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: RoleService, useValue: roleService },
        { provide: PageService, useValue: pageService },
        { provide: ActionService, useValue: actionService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: ActivatedRoute, useValue: { data: routeData.asObservable(), snapshot: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageRoleComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  it('should create with a default empty role and mapped page actions', () => {
    component.role = { roleClaims: [], userRoles: [] } as unknown as Role;
    component.role = { roleClaims: [], userRoles: [] } as unknown as Role;
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.pages.length).toBe(1);
    expect(component.pages[0].pageActions!.length).toBe(1);
  });

  it('resolver role patches the current role', () => {
    component.role = { roleClaims: [], userRoles: [] } as unknown as Role;
    fixture.detectChanges();
    routeData.next({ role });
    expect(component.role.id).toBe('r1');
  });

  it('missing role name errors without calling the service', () => {
    component.role = { roleClaims: [], userRoles: [] } as unknown as Role;
    fixture.detectChanges();
    component.manageRole({ roleClaims: [{ actionId: 'a1' }] } as unknown as Role);
    expect(toastrService.error).toHaveBeenCalledWith('PLEASE_ENTER_ROLE_NAME');
    expect(roleService.addRole).not.toHaveBeenCalled();
  });

  it('empty roleClaims errors without calling the service', () => {
    component.role = { roleClaims: [], userRoles: [] } as unknown as Role;
    fixture.detectChanges();
    component.manageRole({ name: 'Admin', roleClaims: [] } as unknown as Role);
    expect(toastrService.error).toHaveBeenCalledWith('PLEASE_SELECT_AT_LEAT_ONE_PERMISSION');
    expect(roleService.addRole).not.toHaveBeenCalled();
  });

  it('role without id is added, toasts and navigates back', () => {
    component.role = { roleClaims: [], userRoles: [] } as unknown as Role;
    fixture.detectChanges();
    component.manageRole({ name: 'NewRole', roleClaims: [{ actionId: 'a1' }] } as unknown as Role);
    expect(roleService.addRole).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'NewRole' }));
    expect(roleService.updateRole).not.toHaveBeenCalled();
    expect(toastrService.success).toHaveBeenCalledWith('ROLE_SAVED_SUCCESSFULLY');
    expect(router.navigate).toHaveBeenCalledWith(['/roles']);
  });

  it('role with id is updated instead of added', () => {
    component.role = { roleClaims: [], userRoles: [] } as unknown as Role;
    fixture.detectChanges();
    component.manageRole({ id: 'r1', name: 'Admin', roleClaims: [{ actionId: 'a1' }] } as unknown as Role);
    expect(roleService.updateRole).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'r1' }));
    expect(roleService.addRole).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/roles']);
  });
});
