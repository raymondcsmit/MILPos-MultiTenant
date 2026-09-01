import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

import { CompanyProfileService } from './company-profile.service';
import { CompanyProfile } from '@core/domain-classes/company-profile';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { CommonError } from '@core/error-handler/common-error';

describe('CompanyProfileService', () => {
  let service: CompanyProfileService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  const profile: CompanyProfile = {
    id: 'cp1',
    title: 'ACME Ltd',
    taxName: 'GST',
    taxNumber: 'TAX-1',
    address: 'Karachi',
  };

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CompanyProfileService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(CompanyProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getCompanyProfile GETs companyProfile and emits the profile', () => {
    let result: CompanyProfile | undefined;
    service.getCompanyProfile().subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'companyProfile');
    req.flush(profile);
    expect(result).toEqual(profile);
  });

  it('updateCompanyProfile POSTs companyProfile with the body', () => {
    let result: CompanyProfile | undefined;
    service.updateCompanyProfile(profile).subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.method === 'POST' && r.url === 'companyProfile');
    expect(req.request.body).toBe(profile);
    req.flush(profile);
    expect(result).toEqual(profile);
  });
});
