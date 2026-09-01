import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { TenantService } from './tenant.service';
import { Tenant } from '@core/domain-classes/tenant';

describe('TenantService', () => {
  let service: TenantService;
  let httpMock: HttpTestingController;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), TenantService],
    });
    service = TestBed.inject(TenantService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAll GETs Tenants', () => {
    const body: Tenant[] = [{ id: 't1', name: 'Acme' } as Tenant];
    let result: Tenant[] | undefined;
    service.getAll().subscribe((r) => (result = r));

    const req = expectUrl('GET', 'Tenants');
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('getById GETs Tenants/{id}', () => {
    const body: Tenant = { id: 't1', name: 'Acme' } as Tenant;
    let result: Tenant | undefined;
    service.getById('t1').subscribe((r) => (result = r));

    expectUrl('GET', 'Tenants/t1').flush(body);
    expect(result).toEqual(body);
  });

  it('create POSTs Tenants with the tenant body', () => {
    const tenant: Tenant = { name: 'Acme' } as Tenant;
    service.create(tenant).subscribe();

    const req = expectUrl('POST', 'Tenants');
    expect(req.request.body).toBe(tenant);
    req.flush(tenant);
  });

  it('update PUTs Tenants/{id} with the tenant body', () => {
    const tenant: Tenant = { id: 't1', name: 'Acme' } as Tenant;
    service.update('t1', tenant).subscribe();

    const req = expectUrl('PUT', 'Tenants/t1');
    expect(req.request.body).toBe(tenant);
    req.flush(tenant);
  });

  it('toggleStatus PUTs Tenants/{id}/status with the isActive flag', () => {
    service.toggleStatus('t1', true).subscribe();

    const req = expectUrl('PUT', 'Tenants/t1/status');
    expect(req.request.body).toEqual({ isActive: true });
    req.flush({} as any);
  });

  it('updateLicense PUTs Tenants/{id}/license with the licenseType', () => {
    service.updateLicense('t1', 'Enterprise').subscribe();

    const req = expectUrl('PUT', 'Tenants/t1/license');
    expect(req.request.body).toEqual({ licenseType: 'Enterprise' });
    req.flush({} as any);
  });

  it('updateAdmin POSTs Tenants/{id}/admin with the admin data', () => {
    const adminData = { email: 'a@example.com' };
    service.updateAdmin('t1', adminData).subscribe();

    const req = expectUrl('POST', 'Tenants/t1/admin');
    expect(req.request.body).toBe(adminData);
    req.flush({ success: true } as any);
  });

  it('switchTenant POSTs Tenants/{id}/switch with an empty body', () => {
    service.switchTenant('t1').subscribe();

    const req = expectUrl('POST', 'Tenants/t1/switch');
    expect(req.request.body).toEqual({});
    req.flush({ token: 'x' });
  });

  it('generateLicenseKeys POSTs Tenants/{id}/license/generate with an empty body', () => {
    service.generateLicenseKeys('t1').subscribe();

    const req = expectUrl('POST', 'Tenants/t1/license/generate');
    expect(req.request.body).toEqual({});
    req.flush({ keys: [] } as any);
  });

  it('registerTenant POSTs Tenants/register with the tenant body', () => {
    const tenant: Tenant = { name: 'Acme' } as Tenant;
    let result: Tenant | undefined;
    service.registerTenant(tenant).subscribe((r) => (result = r));

    const req = expectUrl('POST', 'Tenants/register');
    expect(req.request.body).toBe(tenant);
    req.flush(tenant);
    expect(result).toEqual(tenant);
  });

  it('exportToSqlite POSTs Tenants/{id}/export-sqlite as a blob', () => {
    service.exportToSqlite('t1').subscribe();

    const req = expectUrl('POST', 'Tenants/t1/export-sqlite');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.body).toEqual({});
    req.flush(new Blob(['PK']));
  });
});