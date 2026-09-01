import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { PageEvent } from '@angular/material/paginator';

import { UserListComponent } from './user-list.component';
import { UserService } from '../user.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ResetPasswordComponent } from '../reset-password/reset-password.component';
import { User } from '@core/domain-classes/user';

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let lastParams: any;

  const users = [
    { id: 'u1', email: 'admin@x.com', firstName: 'Ad', lastName: 'Min', phoneNumber: '0300', isActive: true },
    { id: 'u2', email: 'user@x.com', firstName: 'Us', lastName: 'Er', phoneNumber: '0301', isActive: false },
  ] as unknown as User[];

  beforeEach(async () => {
    userService = jasmine.createSpyObj('UserService', ['getUsers', 'deleteUser']);
    userService.getUsers.and.callFake((r: any) => {
      lastParams = { firstName: r.firstName, email: r.email, skip: r.skip, pageSize: r.pageSize, orderBy: r.orderBy };
      return of(new HttpResponse({
        body: users,
        headers: new HttpHeaders().set('X-Pagination', JSON.stringify({ pageSize: 10, skip: 0, totalCount: users.length })),
      }));
    });
    userService.deleteUser.and.returnValue(of(undefined));
    commonDialogService = jasmine.createSpyObj('CommonDialogService', ['deleteConformationDialog']);
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);
    (translationService as any).lanDir$ = of('ltr');
    dialog = jasmine.createSpyObj('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [UserListComponent, TranslateModule.forRoot()],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
  });

  it('should create and load users into the table', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.users.length).toBe(2);
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('admin@x.com');
  });

  it('first name filter debounces, escapes and resets paging', fakeAsync(() => {
    fixture.detectChanges();
    component.FirstNameFilter = 'John Doe';
    tick(1000);
    expect(lastParams.firstName).toBe(escape('John Doe'));
    expect(lastParams.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);
  }));

  it('email filter feeds the resource parameter', fakeAsync(() => {
    fixture.detectChanges();
    component.EmailFilter = 'a@b.c';
    tick(1000);
    expect(lastParams.email).toBe('a@b.c');
  }));

  it('paginator page updates skip/pageSize and reloads', () => {
    fixture.detectChanges();
    component.paginator.pageSize = 20;
    component.paginator.pageIndex = 1;
    component.paginator.page.emit({ pageIndex: 1, pageSize: 20, length: 42 } as PageEvent);
    expect(lastParams.skip).toBe(20);
    expect(lastParams.pageSize).toBe(20);
  });

  it('sort change resets page index and orders the reload', () => {
    fixture.detectChanges();
    component.sort.active = 'firstName';
    component.sort.direction = 'asc';
    component.paginator.pageIndex = 3;
    component.sort.sortChange.emit({ active: 'firstName', direction: 'asc' } as any);
    expect(component.paginator.pageIndex).toBe(0);
    expect(lastParams.orderBy).toBe('firstName asc');
  });

  it('deleteUser confirms with email, deletes, toasts and reloads from page 0', () => {
    fixture.detectChanges();
    component.deleteUser(users[1]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith('ARE_YOU_SURE_YOU_WANT_TO_DELETE user@x.com');
    expect(userService.deleteUser).toHaveBeenCalledWith('u2');
    expect(toastrService.success).toHaveBeenCalledWith('USER_DELETED_SUCCESSFULLY');
    expect(component.paginator.pageIndex).toBe(0);
    expect(userService.getUsers).toHaveBeenCalledTimes(2);
  });

  it('declined confirmation does not delete', () => {
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    fixture.detectChanges();
    component.deleteUser(users[0]);
    expect(userService.deleteUser).not.toHaveBeenCalled();
  });

  it('resetPassword opens the dialog with a copy of the user', () => {
    fixture.detectChanges();
    component.resetPassword(users[0]);
    expect(dialog.open).toHaveBeenCalledWith(ResetPasswordComponent, jasmine.objectContaining({ width: '350px' }));
    const openedWith = dialog.open.calls.mostRecent().args[1] as any;
    expect(openedWith.data).toEqual({ id: 'u1', email: 'admin@x.com', firstName: 'Ad', lastName: 'Min', phoneNumber: '0300', isActive: true });
    expect(openedWith.data).not.toBe(users[0]);
  });

  it('editUser and userPermission navigate with the id', () => {
    fixture.detectChanges();
    const router: Router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    component.editUser('u1');
    expect(router.navigate).toHaveBeenCalledWith(['/users/manage', 'u1']);
    component.userPermission('u2');
    expect(router.navigate).toHaveBeenCalledWith(['/users/permission', 'u2']);
  });

  it('isOddDataRow and getDataIndex map rows correctly', () => {
    fixture.detectChanges();
    expect(component.isOddDataRow(0)).toBeFalse();
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.getDataIndex(users[1])).toBe(1);
    expect(component.getDataIndex({} as any)).toBe(-1);
  });
});
