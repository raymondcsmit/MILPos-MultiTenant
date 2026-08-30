import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageRolePresentationComponent } from './manage-role-presentation.component';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ActivatedRoute } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('ManageRolePresentationComponent', () => {
  let component: ManageRolePresentationComponent;
  let fixture: ComponentFixture<ManageRolePresentationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null, has: () => false }, queryParamMap: { get: () => null } }, data: { subscribe: () => ({ unsubscribe: () => {} }) }, url: { subscribe: () => ({ unsubscribe: () => {} }) }, params: { subscribe: () => ({ unsubscribe: () => {} }) }, queryParams: { subscribe: () => ({ unsubscribe: () => {} }) }, paramMap: { subscribe: () => ({ unsubscribe: () => {} }) }, queryParamMap: { subscribe: () => ({ unsubscribe: () => {} }) } } }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [ ManageRolePresentationComponent , TranslateModule.forRoot()]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageRolePresentationComponent);
    component = fixture.componentInstance;
    component.role = { id: 'role-1', name: 'Admin', roleClaims: [], userRoles: [] } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
