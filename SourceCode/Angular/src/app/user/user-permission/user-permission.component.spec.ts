import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserPermissionComponent } from './user-permission.component';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ActivatedRoute } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';
import { PageService } from '@core/services/page.service';
import { ActionService } from '@core/services/action.service';

describe('UserPermissionComponent', () => {
  let component: UserPermissionComponent;
  let fixture: ComponentFixture<UserPermissionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null, has: () => false }, queryParamMap: { get: () => null } }, data: of({ user: { id: 'user-1', userName: 'jdoe', firstName: 'John', lastName: 'Doe', email: 'j@x.com', userClaims: [] } as any }), url: { subscribe: () => ({ unsubscribe: () => {} }) }, params: { subscribe: () => ({ unsubscribe: () => {} }) }, queryParams: { subscribe: () => ({ unsubscribe: () => {} }) }, paramMap: { subscribe: () => ({ unsubscribe: () => {} }) }, queryParamMap: { subscribe: () => ({ unsubscribe: () => {} }) } } }, { provide: PageService, useValue: { getAll: () => of([]) } }, { provide: ActionService, useValue: { getAll: () => of([]) } }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [ UserPermissionComponent , TranslateModule.forRoot()]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserPermissionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
