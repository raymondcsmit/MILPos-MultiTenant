import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { LoginAuditService } from './login-audit.service';
import { LoginAuditResource } from '@core/domain-classes/login-audit-resource';

describe('LoginAuditService', () => {
  let service: LoginAuditService;
  let httpMock: HttpTestingController;

  function makeResource(overrides: Partial<LoginAuditResource> = {}): LoginAuditResource {
    const p = new LoginAuditResource();
    p.fields = '';
    p.orderBy = 'createdDate desc';
    p.pageSize = 25;
    p.skip = 0;
    p.searchQuery = '';
    Object.assign(p, overrides);
    return p;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), LoginAuditService],
    });
    service = TestBed.inject(LoginAuditService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getLoginAudits GETs loginAudit with observe response and full params', () => {
    const body = [{ id: 'la1', userName: 'admin' }];
    let result: any;
    service
      .getLoginAudits(makeResource({ id: 'u1', userName: 'admin' }))
      .subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'loginAudit');
    expect(req.request.params.get('id')).toBe('u1');
    expect(req.request.params.get('userName')).toBe('admin');
    expect(req.request.params.get('pageSize')).toBe('25');
    expect(req.request.params.get('skip')).toBe('0');
    req.flush(body);
    expect(result.body).toEqual(body);
  });

  it('getLoginAudits defaults null id/userName to empty strings', () => {
    service.getLoginAudits(makeResource({ id: null, userName: null } as any)).subscribe();
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'loginAudit');
    expect(req.request.params.get('id')).toBe('');
    expect(req.request.params.get('userName')).toBe('');
    req.flush([]);
  });
});
