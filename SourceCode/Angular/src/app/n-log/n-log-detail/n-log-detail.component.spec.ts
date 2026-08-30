import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NLogDetailComponent } from './n-log-detail.component';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ActivatedRoute } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';

describe('NLogDetailComponent', () => {
  let component: NLogDetailComponent;
  let fixture: ComponentFixture<NLogDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null, has: () => false }, queryParamMap: { get: () => null } }, data: of({ log: { id: 'log-1', logged: new Date(), level: 'Error', logger: 'TestLogger', message: 'Test message', source: 'TestSource', callSite: '', exception: '', properties: '{}', renderLog: '' } as any }), url: { subscribe: () => ({ unsubscribe: () => {} }) }, params: { subscribe: () => ({ unsubscribe: () => {} }) }, queryParams: { subscribe: () => ({ unsubscribe: () => {} }) }, paramMap: { subscribe: () => ({ unsubscribe: () => {} }) }, queryParamMap: { subscribe: () => ({ unsubscribe: () => {} }) } } }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [ NLogDetailComponent , TranslateModule.forRoot()]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NLogDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
