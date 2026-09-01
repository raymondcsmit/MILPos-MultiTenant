import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ManageRolePresentationComponent } from './manage-role-presentation.component';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { Page } from '@core/domain-classes/page';
import { Role } from '@core/domain-classes/role';
import { Action } from '@core/domain-classes/action';

describe('ManageRolePresentationComponent', () => {
  let component: ManageRolePresentationComponent;
  let fixture: ComponentFixture<ManageRolePresentationComponent>;

  const pages = [
    {
      id: 'p1', name: 'Users',
      pageActions: [
        { id: 'a1', code: 'USR_ADD', name: 'Add User' },
        { id: 'a2', code: 'USR_VIEW', name: 'View User' },
      ],
    },
    { id: 'p2', name: 'Roles', pageActions: [{ id: 'a3', code: 'ROL_ADD', name: 'Add Role' }] },
  ] as unknown as Page[];

  function cloneRole(): Role {
    return { id: 'r1', name: 'Admin', roleClaims: [] } as unknown as Role;
  }

  function checkbox(checked: boolean): MatCheckboxChange {
    return { checked, source: null as any } as unknown as MatCheckboxChange;
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ManageRolePresentationComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: TranslationService, useValue: Object.assign(jasmine.createSpyObj('TranslationService', ['getValue']), { lanDir$: of('ltr') }) },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageRolePresentationComponent);
    component = fixture.componentInstance;
  });

  it('should create with pages, loading and role inputs', () => {
    component.pages = pages;
    component.role = cloneRole();
    component.loading = true;
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.step).toBe(0);
    expect(component.loading).toBeTrue();
  });

  it('checkPermission finds claims by actionId', () => {
    component.pages = pages;
    component.role = {
      id: 'r1', name: 'Admin',
      roleClaims: [{ roleId: 'r1', claimType: 'USR_ADD', claimValue: '', actionId: 'a1' }],
    } as unknown as Role;
    fixture.detectChanges();
    expect(component.checkPermission('a1')).toBeTrue();
    expect(component.checkPermission('a2')).toBeFalse();
  });

  it('onPermissionChange adds and removes a single claim', () => {
    component.pages = pages;
    component.role = cloneRole();
    fixture.detectChanges();
    component.onPermissionChange(checkbox(true), pages[0], pages[0].pageActions![0] as Action);
    expect(component.role.roleClaims!.length).toBe(1);
    expect(component.role.roleClaims![0].claimType).toBe('USR_ADD');
    component.onPermissionChange(checkbox(false), pages[0], pages[0].pageActions![0] as Action);
    expect(component.role.roleClaims!.length).toBe(0);
  });

  it('onPageSelect adds every page action and avoids duplicates', () => {
    component.pages = pages;
    component.role = {
      id: 'r1', name: 'Admin',
      roleClaims: [{ roleId: 'r1', claimType: 'USR_ADD', claimValue: '', actionId: 'a1' }],
    } as unknown as Role;
    fixture.detectChanges();
    component.onPageSelect(checkbox(true), pages[0]);
    expect(component.role.roleClaims!.map(c => c.actionId)).toEqual(['a1', 'a2']);
    component.onPageSelect(checkbox(false), pages[0]);
    expect(component.role.roleClaims!.length).toBe(0);
  });

  it('selecetAll adds all actions across pages and deselect clears them', () => {
    component.pages = pages;
    component.role = cloneRole();
    fixture.detectChanges();
    component.selecetAll(checkbox(true));
    expect(component.role.roleClaims!.length).toBe(3);
    component.selecetAll(checkbox(false));
    expect(component.role.roleClaims!.length).toBe(0);
  });

  it('saveRole emits the role', () => {
    component.pages = pages;
    component.role = cloneRole();
    fixture.detectChanges();
    const emitted: Role[] = [];
    component.onManageRoleAction.subscribe((r: Role) => emitted.push(r));
    component.saveRole();
    expect(emitted.length).toBe(1);
    expect(emitted[0].name).toBe('Admin');
  });
});
