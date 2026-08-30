import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableSettingComponent } from './table-setting.component';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ActivatedRoute } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('TableSettingComponent', () => {
  let component: TableSettingComponent;
  let fixture: ComponentFixture<TableSettingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null, has: () => false }, queryParamMap: { get: () => null } }, data: { subscribe: () => ({ unsubscribe: () => {} }) }, url: { subscribe: () => ({ unsubscribe: () => {} }) }, params: { subscribe: () => ({ unsubscribe: () => {} }) }, queryParams: { subscribe: () => ({ unsubscribe: () => {} }) }, paramMap: { subscribe: () => ({ unsubscribe: () => {} }) }, queryParamMap: { subscribe: () => ({ unsubscribe: () => {} }) } } }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [TableSettingComponent, TranslateModule.forRoot()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
