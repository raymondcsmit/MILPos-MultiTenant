import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserPermissionPresentationComponent } from './user-permission-presentation.component';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ActivatedRoute } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('UserPermissionPresentationComponent', () => {
  let component: UserPermissionPresentationComponent;
  let fixture: ComponentFixture<UserPermissionPresentationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null, has: () => false }, queryParamMap: { get: () => null } }, data: { subscribe: () => ({ unsubscribe: () => {} }) }, url: { subscribe: () => ({ unsubscribe: () => {} }) }, params: { subscribe: () => ({ unsubscribe: () => {} }) }, queryParams: { subscribe: () => ({ unsubscribe: () => {} }) }, paramMap: { subscribe: () => ({ unsubscribe: () => {} }) }, queryParamMap: { subscribe: () => ({ unsubscribe: () => {} }) } } }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [ UserPermissionPresentationComponent , TranslateModule.forRoot()]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserPermissionPresentationComponent);
    component = fixture.componentInstance;
    component.pages = [];
    component.user = { id: 'user-1', userName: 'jdoe', email: 'jdoe@milpos.com', firstName: 'John', lastName: 'Doe', userClaims: [] } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
