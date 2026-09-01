import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { throwError, of } from 'rxjs';

import { RoleUsersComponent } from './role-users.component';
import { RoleService } from '../role.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { Role } from '@core/domain-classes/role';
import { User } from '@core/domain-classes/user';
import { UserRoles } from '@core/domain-classes/user-roles';

describe('RoleUsersComponent', () => {
  let component: RoleUsersComponent;
  let fixture: ComponentFixture<RoleUsersComponent>;
  let roleService: jasmine.SpyObj<RoleService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const roles = [{ id: 'r1', name: 'Admin' }, { id: 'r2', name: 'Cashier' }] as unknown as Role[];
  const users = [
    { id: 'u1', userName: 'john@x.com', firstName: 'John', lastName: 'Doe' },
    { id: 'u2', userName: 'jane@x.com', firstName: 'Jane', lastName: 'Roe' },
  ] as unknown as User[];

  function drop(previousData: any[], containerData: any[], previousIndex = 0, currentIndex = 0): CdkDragDrop<UserRoles[]> {
    return {
      previousContainer: { data: previousData },
      container: { data: containerData },
      previousIndex,
      currentIndex,
    } as unknown as CdkDragDrop<UserRoles[]>;
  }

  beforeEach(async () => {
    roleService = jasmine.createSpyObj('RoleService', ['getRoleUsers', 'updateRoleUsers']);
    roleService.updateRoleUsers.and.returnValue(of([] as any[]));
    commonService = jasmine.createSpyObj('CommonService', ['getRoles', 'getAllUsers', 'getPageHelperText']);
    commonService.getRoles.and.returnValue(of(roles));
    commonService.getAllUsers.and.returnValue(of(users));
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);
    (translationService as any).lanDir$ = of('ltr');

    TestBed.configureTestingModule({
      imports: [RoleUsersComponent, TranslateModule.forRoot()],
      providers: [
        { provide: RoleService, useValue: roleService },
        { provide: CommonService, useValue: commonService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleUsersComponent);
    component = fixture.componentInstance;
  });

  it('should create, auto-select the first role and split users', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.roles.length).toBe(2);
    expect(component.selectedRoleId).toBe('r1');
    expect(component.allUsers.length).toBe(2);
    expect(component.otherUsers.length).toBe(2);
    expect(roleService.getRoleUsers).toHaveBeenCalledWith('r1');
  });

  it('onRoleChange loads the role users and puts the rest in otherUsers', () => {
    fixture.detectChanges();
    roleService.getRoleUsers.and.returnValue(of([
      { userId: 'u1', roleId: 'r2', userName: 'john@x.com' },
    ] as any[]));
    component.selectedRoleId = 'r2';
    component.onRoleChange();
    expect(component.roleUsers.length).toBe(1);
    expect(component.selectedRole?.id).toBe('r2');
    expect(component.otherUsers.map(u => u.userId)).toEqual(['u2']);
  });

  it('addUser saves the new role user, transfers the row and toasts', () => {
    fixture.detectChanges();
    const other = [{ userId: 'u2', roleId: '', userName: 'jane@x.com' }];
    const roleUsers: any[] = [];
    component.roleUsers = roleUsers;
    component.otherUsers = other;
    component.addUser(drop(other, roleUsers));
    expect(roleService.updateRoleUsers).toHaveBeenCalledWith('r1', [
      jasmine.objectContaining({ userId: 'u2', roleId: 'r1' }),
    ]);
    expect(component.roleUsers.length).toBe(1);
    expect(component.otherUsers.length).toBe(0);
    expect(toastrService.success).toHaveBeenCalledWith('USER_ADDED_SUCCESSFULLY_TO_ROLE Admin');
  });

  it('addUser failure rolls back the transfer and errors', () => {
    roleService.updateRoleUsers.and.callFake(() => throwError(() => ({ status: 500 })));
    fixture.detectChanges();
    const other = [{ userId: 'u2', roleId: '', userName: 'jane@x.com' }];
    const roleUsers: any[] = [];
    component.roleUsers = roleUsers;
    component.otherUsers = other;
    component.addUser(drop(other, roleUsers));
    expect(component.roleUsers.length).toBe(0);
    expect(toastrService.error).toHaveBeenCalledWith('ERROR_WHILE_ADDING_USER_TO_ROLE Admin');
  });

  it('removeUser saves the remaining role users, transfers back and toasts', () => {
    fixture.detectChanges();
    const roleUsers = [{ userId: 'u1', roleId: 'r1', userName: 'john@x.com' }];
    const other: any[] = [];
    component.roleUsers = roleUsers;
    component.otherUsers = other;
    component.removeUser(drop(roleUsers, other));
    expect(roleService.updateRoleUsers).toHaveBeenCalledWith('r1', []);
    expect(other.length).toBe(1);
    expect(component.roleUsers.length).toBe(0);
    expect(toastrService.success).toHaveBeenCalledWith('USER_REMOVED_SUCCESSFULLY_FROM_ROLE Admin');
  });

  it('removeUser failure toasts an error without transferring', () => {
    roleService.updateRoleUsers.and.callFake(() => throwError(() => ({ status: 500 })));
    fixture.detectChanges();
    const roleUsers = [{ userId: 'u1', roleId: 'r1', userName: 'john@x.com' }];
    const other: any[] = [];
    component.roleUsers = roleUsers;
    component.otherUsers = other;
    component.removeUser(drop(roleUsers, other));
    expect(other.length).toBe(0);
    expect(toastrService.error).toHaveBeenCalledWith('ERROR_WHILE_REMOVING_USER_FROM_ROLE Admin');
  });
});
