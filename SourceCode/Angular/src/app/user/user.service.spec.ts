import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

import { UserService } from './user.service';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { CommonError } from '@core/error-handler/common-error';
import { UserResource } from '@core/domain-classes/user-resource';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  function makeParams(overrides: Partial<UserResource> = {}): UserResource {
    const p = new UserResource();
    p.fields = '';
    p.orderBy = 'firstName asc';
    p.pageSize = 25;
    p.skip = 0;
    p.searchQuery = '';
    p.name = '';
    Object.assign(p, { firstName: '', lastName: '', email: '', phoneNumber: '' }, overrides);
    return p;
  }

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        UserService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('CRUD', () => {
    it('addUser POSTs user with the body', () => {
      const user = { id: 'u1', firstName: 'John' } as any;
      let result: any;
      service.addUser(user).subscribe((r) => (result = r));
      const req = expectUrl('POST', 'user');
      expect(req.request.body).toBe(user);
      req.flush(user);
      expect(result).toEqual(user);
    });

    it('updateUser PUTs user/{id} with the body', () => {
      const user = { id: 'u1', firstName: 'John' } as any;
      service.updateUser(user).subscribe();
      const req = expectUrl('PUT', 'user/u1');
      expect(req.request.body).toBe(user);
      req.flush(user);
    });

    it('deleteUser DELETEs user/{id}', () => {
      service.deleteUser('u1').subscribe();
      const req = expectUrl('DELETE', 'user/u1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('getUser GETs user/{id}', () => {
      const user = { id: 'u1', firstName: 'John' } as any;
      let result: any;
      service.getUser('u1').subscribe((r) => (result = r));
      const req = expectUrl('GET', 'user/u1');
      req.flush(user);
      expect(result).toEqual(user);
    });
  });

  describe('claims + passwords', () => {
    it('updateUserClaim PUTs userclaim/{userId} with wrapped body', () => {
      const claims = [{ claimType: 'PO_ADD_PO', claimValue: true }];
      service.updateUserClaim(claims as any, 'u1').subscribe();
      const req = expectUrl('PUT', 'userclaim/u1');
      expect(req.request.body).toEqual({ userClaims: claims });
      req.flush({} as any);
    });

    it('resetPassword POSTs user/resetpassword with the user', () => {
      const user = { id: 'u1' } as any;
      service.resetPassword(user).subscribe();
      const req = expectUrl('POST', 'user/resetpassword');
      expect(req.request.body).toBe(user);
      req.flush(user);
    });

    it('changePassword POSTs user/changepassword with the user', () => {
      const user = { id: 'u1' } as any;
      service.changePassword(user).subscribe();
      const req = expectUrl('POST', 'user/changepassword');
      expect(req.request.body).toBe(user);
      req.flush(user);
    });

    it('recoverPassword POSTs recoverpassword/{token} with the user', () => {
      const user = { id: 'u1' } as any;
      service.recoverPassword('tok1', user).subscribe();
      const req = expectUrl('POST', 'recoverpassword/tok1');
      expect(req.request.body).toBe(user);
      req.flush(user);
    });
  });

  describe('profile', () => {
    it('getUserProfile GETs user/profile', () => {
      const user = { id: 'u1' } as any;
      let result: any;
      service.getUserProfile().subscribe((r) => (result = r));
      const req = expectUrl('GET', 'user/profile');
      req.flush(user);
      expect(result).toEqual(user);
    });

    it('updateUserProfile PUTs user/profile with the user', () => {
      const user = { id: 'u1' } as any;
      service.updateUserProfile(user).subscribe();
      const req = expectUrl('PUT', 'user/profile');
      expect(req.request.body).toBe(user);
      req.flush(user);
    });
  });

  describe('lists + forgot password flow', () => {
    it('getUsers GETs user/getUsers with observe response and params', () => {
      const body = [{ id: 'u1' }];
      let result: any;
      service
        .getUsers(makeParams({ firstName: 'John', lastName: 'Doe', email: 'j@d.c', phoneNumber: '123' }))
        .subscribe((r) => (result = r));
      const req = expectUrl('GET', 'user/getUsers');
      expect(req.request.params.get('pageSize')).toBe('25');
      expect(req.request.params.get('skip')).toBe('0');
      expect(req.request.params.get('firstName')).toBe('John');
      expect(req.request.params.get('lastName')).toBe('Doe');
      expect(req.request.params.get('email')).toBe('j@d.c');
      expect(req.request.params.get('phoneNumber')).toBe('123');
      req.flush(body);
      expect(result.body).toEqual(body);
    });

    it('getUsers passes empty strings for unset filters', () => {
      service.getUsers(makeParams()).subscribe();
      const req = expectUrl('GET', 'user/getUsers');
      expect(req.request.params.get('firstName')).toBe('');
      expect(req.request.params.get('phoneNumber')).toBe('');
      req.flush([]);
    });

    it('getRecentlyRegisteredUsers GETs user/GetRecentlyRegisteredUsers', () => {
      const body = [{ id: 'u1' }];
      let result: any;
      service.getRecentlyRegisteredUsers().subscribe((r) => (result = r));
      const req = expectUrl('GET', 'user/GetRecentlyRegisteredUsers');
      req.flush(body);
      expect(result).toEqual(body);
    });

    it('sendResetPasswordLink POSTs forgotpassword with the user', () => {
      const user = { email: 'j@d.c' } as any;
      service.sendResetPasswordLink(user).subscribe();
      const req = expectUrl('POST', 'forgotpassword');
      expect(req.request.body).toBe(user);
      req.flush(user);
    });

    it('getUserInfoFromResetToken GETs resetpassword/{id}', () => {
      service.getUserInfoFromResetToken('tok1').subscribe();
      const req = expectUrl('GET', 'resetpassword/tok1');
      expect(req.request.method).toBe('GET');
      req.flush({ id: 'u1' } as any);
    });
  });

  describe('error propagation', () => {
    it('propagates CommonError from addUser', () => {
      errorHandler.handleError.and.callFake((err: HttpErrorResponse) =>
        throwError(() => ({ statusText: err.statusText, code: err.status } as CommonError))
      );
      let error: any;
      service.addUser({ id: 'u1' } as any).subscribe({ error: (e) => (error = e) });
      expectUrl('POST', 'user').flush({ messages: ['nope'] }, { status: 422, statusText: 'Unprocessable Entity' });
      expect(error.code).toBe(422);
      expect(errorHandler.handleError).toHaveBeenCalled();
    });
  });
});
