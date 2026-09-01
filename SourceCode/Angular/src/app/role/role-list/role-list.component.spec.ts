import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { RoleListComponent } from './role-list.component';
import { RoleService } from '../role.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { Role } from '@core/domain-classes/role';

describe('RoleListComponent', () => {
  let component: RoleListComponent;
  let fixture: ComponentFixture<RoleListComponent>;
  let roleService: jasmine.SpyObj<RoleService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let commonService: jasmine.SpyObj<CommonService>;

  const roles = [{ id: 'r1', name: 'Admin' }, { id: 'r2', name: 'Cashier' }] as unknown as Role[];

  beforeEach(async () => {
    roleService = jasmine.createSpyObj('RoleService', ['getRoles', 'deleteRole']);
    roleService.deleteRole.and.returnValue(of(undefined));
    commonDialogService = jasmine.createSpyObj('CommonDialogService', ['deleteConformationDialog']);
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);
    (translationService as any).lanDir$ = of('ltr');
    commonService = jasmine.createSpyObj('CommonService', ['getRoles', 'getPageHelperText']);
    commonService.getRoles.and.returnValue(of(roles));

    TestBed.configureTestingModule({
      imports: [RoleListComponent, TranslateModule.forRoot()],
      providers: [
        { provide: RoleService, useValue: roleService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonService, useValue: commonService },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleListComponent);
    component = fixture.componentInstance;
  });

  it('should create and load roles into the table', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.roles.length).toBe(2);
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Admin');
  });

  it('load errors surface each message as an error toast', () => {
    commonService.getRoles.and.returnValue(throwError(() => ({ messages: ['E1', 'E2'] })));
    fixture.detectChanges();
    expect(component.roles).toEqual([]);
    expect(toastrService.error).toHaveBeenCalledWith('E1');
    expect(toastrService.error).toHaveBeenCalledWith('E2');
  });

  it('deleteRole confirms with the name, deletes by id, toasts and reloads', () => {
    fixture.detectChanges();
    component.deleteRole(roles[0]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith('ARE_YOU_SURE_YOU_WANT_TO_DELETE Admin');
    expect(roleService.deleteRole).toHaveBeenCalledWith('r1');
    expect(toastrService.success).toHaveBeenCalledWith('ROLE_DELETED_SUCCESSFULLY');
    expect(commonService.getRoles).toHaveBeenCalledTimes(2);
  });

  it('declined confirmation does not delete', () => {
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    fixture.detectChanges();
    component.deleteRole(roles[0]);
    expect(roleService.deleteRole).not.toHaveBeenCalled();
  });

  it('isOddDataRow and getDataIndex map rows correctly', () => {
    fixture.detectChanges();
    expect(component.isOddDataRow(0)).toBeFalse();
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.getDataIndex(roles[1])).toBe(1);
    expect(component.getDataIndex({} as any)).toBe(-1);
  });
});
