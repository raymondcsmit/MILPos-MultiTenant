import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { PageEvent } from '@angular/material/paginator';

import { LoginAuditListComponent } from './login-audit-list.component';
import { LoginAuditService } from '../login-audit.service';
import { CommonService } from '@core/services/common.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { LoginAudit } from '@core/domain-classes/login-audit';

describe('LoginAuditListComponent', () => {
  let component: LoginAuditListComponent;
  let fixture: ComponentFixture<LoginAuditListComponent>;
  let loginAuditService: jasmine.SpyObj<LoginAuditService>;
  let lastParams: any;

  const audits = [
    { id: 'a1', loginTime: '2026-01-01T10:00:00Z', userName: 'admin', remoteIP: '1.2.3.4', status: 'success', latitude: 31.5, longitude: 74.3 },
    { id: 'a2', loginTime: '2026-01-02T10:00:00Z', userName: 'user', remoteIP: '5.6.7.8', status: 'failed', latitude: null, longitude: null },
  ] as unknown as LoginAudit[];

  beforeEach(async () => {
    loginAuditService = jasmine.createSpyObj('LoginAuditService', ['getLoginAudits']);
    loginAuditService.getLoginAudits.and.callFake((r: any) => {
      lastParams = { userName: r.userName, skip: r.skip, pageSize: r.pageSize, orderBy: r.orderBy };
      return of(new HttpResponse({
        body: audits,
        headers: new HttpHeaders().set('X-Pagination', JSON.stringify({ pageSize: 10, skip: 0, totalCount: audits.length })),
      }));
    });

    TestBed.configureTestingModule({
      imports: [LoginAuditListComponent, TranslateModule.forRoot()],
      providers: [
        { provide: LoginAuditService, useValue: loginAuditService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: TranslationService, useValue: Object.assign(jasmine.createSpyObj('TranslationService', ['getValue']), { lanDir$: of('ltr') }) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginAuditListComponent);
    component = fixture.componentInstance;
  });

  it('should create and load audits into the table', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.loginAudits.length).toBe(2);
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('admin');
  });

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
    component.sort.active = 'userName';
    component.sort.direction = 'desc';
    component.paginator.pageIndex = 2;
    component.sort.sortChange.emit({ active: 'userName', direction: 'desc' } as any);
    expect(component.paginator.pageIndex).toBe(0);
    expect(lastParams.orderBy).toBe('userName desc');
  });

  it('username keyup debounce filters and resets paging', fakeAsync(() => {
    fixture.detectChanges();
    component.input.nativeElement.value = 'admin';
    component.input.nativeElement.dispatchEvent(new Event('keyup'));
    tick(1000);
    expect(lastParams.userName).toBe('admin');
    expect(lastParams.skip).toBe(0);
  }));

  it('isOddDataRow and getDataIndex map rows correctly', () => {
    fixture.detectChanges();
    expect(component.isOddDataRow(0)).toBeFalse();
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.getDataIndex(audits[1])).toBe(1);
    expect(component.getDataIndex({} as any)).toBe(-1);
  });
});
