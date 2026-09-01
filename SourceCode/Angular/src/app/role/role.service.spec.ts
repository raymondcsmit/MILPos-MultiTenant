import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { RoleService } from './role.service';
import { Role } from '@core/domain-classes/role';
import { UserRoles } from '@core/domain-classes/user-roles';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';

describe('RoleService', () => {
  let service: RoleService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RoleService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(RoleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('addRole POSTs role with the role body', () => {
    const role: Role = { name: 'Admin' };
    let result: Role | undefined;
    service.addRole(role).subscribe((r) => (result = r));

    const req = expectUrl('POST', 'role');
    expect(req.request.body).toBe(role);
    req.flush(role);
    expect(result).toEqual(role);
  });

  it('updateRole PUTs role/{id} with the role body', () => {
    const role: Role = { id: 'r1', name: 'Admin' };
    service.updateRole(role).subscribe();

    const req = expectUrl('PUT', 'role/r1');
    expect(req.request.body).toBe(role);
    req.flush(role);
  });

  it('deleteRole DELETEs role/{id}', () => {
    service.deleteRole('r1').subscribe();
    expectUrl('DELETE', 'role/r1').flush(null);
  });

  it('getRole GETs role/{id}', () => {
    const body: Role = { id: 'r1', name: 'Admin' };
    let result: Role | undefined;
    service.getRole('r1').subscribe((r) => (result = r));

    expectUrl('GET', 'role/r1').flush(body);
    expect(result).toEqual(body);
  });

  it('getRoleUsers GETs roleusers/{id}', () => {
    const body: UserRoles[] = [{ userId: 'u1', roleId: 'r1' }];
    let result: UserRoles[] | undefined;
    service.getRoleUsers('r1').subscribe((r) => (result = r));

    expectUrl('GET', 'roleusers/r1').flush(body);
    expect(result).toEqual(body);
  });

  it('updateRoleUsers PUTs roleusers/{roleId} with a wrapped userRoles body', () => {
    const userRoles: UserRoles[] = [{ userId: 'u1', roleId: 'r1' }];
    service.updateRoleUsers('r1', userRoles).subscribe();

    const req = expectUrl('PUT', 'roleusers/r1');
    expect(req.request.body).toEqual({ userRoles });
    req.flush(userRoles);
  });

  it('surfaces HTTP errors as HttpErrorResponse when not handled', () => {
    let error: any;
    service.getRole('r1').subscribe({ error: (e) => (error = e) });
    expectUrl('GET', 'role/r1').flush({}, { status: 500, statusText: 'boom' });
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect(error.status).toBe(500);
  });
});