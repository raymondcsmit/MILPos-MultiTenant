import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { UserPermissionPresentationComponent } from './user-permission-presentation.component';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { Page } from '@core/domain-classes/page';
import { User } from '@core/domain-classes/user';
import { Action } from '@core/domain-classes/action';

describe('UserPermissionPresentationComponent', () => {
  let component: UserPermissionPresentationComponent;
  let fixture: ComponentFixture<UserPermissionPresentationComponent>;

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

  const user = {
    id: 'u1',
    userClaims: [{ userId: 'u1', claimType: 'USR_ADD', claimValue: '', actionId: 'a1' }],
  } as unknown as User;

  function checkbox(checked: boolean): MatCheckboxChange {
    return { checked, source: null as any } as unknown as MatCheckboxChange;
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [UserPermissionPresentationComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
        { provide: TranslationService, useValue: Object.assign(jasmine.createSpyObj('TranslationService', ['getValue']), { lanDir$: of('ltr') }) },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserPermissionPresentationComponent);
    component = fixture.componentInstance;
  });

  it('should create with the given pages and user', () => {
    component.pages = pages;
    component.user = user;
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.step).toBe(0);
  });

  it('checkPermission finds existing claims by actionId', () => {
    component.pages = pages;
    component.user = { id: 'u1', userClaims: [{ userId: 'u1', claimType: 'USR_ADD', claimValue: '', actionId: 'a1' }] } as unknown as User;
    fixture.detectChanges();
    expect(component.checkPermission('a1')).toBeTrue();
    expect(component.checkPermission('a2')).toBeFalse();
    component.user.userClaims = undefined;
    expect(component.checkPermission('a1')).toBeFalse();
  });

  it('onPermissionChange adds a claim when checked and removes it when unchecked', () => {
    component.pages = pages;
    component.user = { id: 'u1', userClaims: [] } as unknown as User;
    fixture.detectChanges();
    component.onPermissionChange(checkbox(true), pages[0], pages[0].pageActions![0] as Action);
    expect(component.user.userClaims!.length).toBe(1);
    expect(component.user.userClaims![0].claimType).toBe('USR_ADD');
    component.onPermissionChange(checkbox(false), pages[0], pages[0].pageActions![0] as Action);
    expect(component.user.userClaims!.length).toBe(0);
  });

  it('onPageSelect checks every action of the page avoiding duplicates', () => {
    component.pages = pages;
    component.user = user;
    fixture.detectChanges();
    component.onPageSelect(checkbox(true), pages[0]);
    expect(component.user.userClaims!.length).toBe(2);
    expect(component.user.userClaims!.map(c => c.claimType)).toEqual(['USR_ADD', 'USR_VIEW']);
    component.onPageSelect(checkbox(false), pages[0]);
    expect(component.user.userClaims!.length).toBe(0);
  });

  it('selecetAll adds all actions and deselect clears everything', () => {
    component.pages = pages;
    component.user = { id: 'u1', userClaims: [] } as unknown as User;
    fixture.detectChanges();
    component.selecetAll(checkbox(true));
    expect(component.user.userClaims!.length).toBe(3);
    component.selecetAll(checkbox(false));
    expect(component.user.userClaims!.length).toBe(0);
  });

  it('saveUserClaim emits the user', () => {
    component.pages = pages;
    component.user = user;
    fixture.detectChanges();
    const emitted: User[] = [];
    component.manageUserClaimAction.subscribe((u: User) => emitted.push(u));
    component.saveUserClaim();
    expect(emitted.length).toBe(1);
    expect(emitted[0].id).toBe('u1');
  });
});
