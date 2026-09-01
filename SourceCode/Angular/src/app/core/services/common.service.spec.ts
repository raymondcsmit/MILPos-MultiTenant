import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { CommonService } from './common.service';
import { CountryService } from './country.service';
import { SecurityService } from '@core/security/security.service';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { reminderFrequencies } from '@core/domain-classes/reminder-frequency';

describe('CommonService', () => {
  let service: CommonService;
  let httpMock: HttpTestingController;
  let countryService: jasmine.SpyObj<CountryService>;
  let securityService: any;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    countryService = jasmine.createSpyObj<CountryService>('CountryService', ['getAll']);
    countryService.getAll.and.returnValue(of([]));
    securityService = {
      locations$: of([{ id: 'l1' }]),
      allLocations$: of([{ id: 'l2' }]),
      AllLocationList$: of([{ id: 'l1' }]),
      allFinancialYears$: of([{ id: 2026 }]),
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CommonService,
        { provide: CommonHttpErrorService, useValue: {} },
        { provide: CountryService, useValue: countryService },
        { provide: SecurityService, useValue: securityService },
      ],
    });
    service = TestBed.inject(CommonService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getReminder GETs reminder/{id}', () => {
    let result: any;
    service.getReminder('r1').subscribe((r) => (result = r));
    expectUrl('GET', 'reminder/r1').flush({ id: 'r1' } as any);
    expect(result).toEqual({ id: 'r1' });
  });

  it('getAllUsers GETs user/getAllUsers', () => {
    service.getAllUsers().subscribe();
    expectUrl('GET', 'user/getAllUsers').flush([]);
  });

  it('getRoles GETs role', () => {
    service.getRoles().subscribe();
    expectUrl('GET', 'role').flush([]);
  });

  it('getCountry delegates to countryService.getAll', () => {
    const body = [{ id: 'PK', name: 'Pakistan' } as any];
    countryService.getAll.and.returnValue(of(body));
    let result: any;
    service.getCountry().subscribe((r) => (result = r));
    expect(countryService.getAll).toHaveBeenCalled();
    expect(result).toEqual(body);
  });

  it('getCityByName GETs city/country with the names in the URL query', () => {
    service.getCityByName('Pakistan', 'Karachi').subscribe();
    httpMock.expectOne('city/country?countryName=Pakistan&&cityName=Karachi').flush([]);
  });

  it('getUsers GETs user/getUsers', () => {
    service.getUsers().subscribe();
    expectUrl('GET', 'user/getUsers').flush([]);
  });

  it('getReminderFrequency emits the reminderFrequencies constant without HTTP', () => {
    let result: any;
    service.getReminderFrequency().subscribe((r) => (result = r));
    expect(result).toEqual(reminderFrequencies);
  });

  it('addReminderSchedule POSTs ReminderScheduler with the scheduler body', () => {
    const body = { moduleId: 'm1' };
    service.addReminderSchedule(body as any).subscribe();

    const req = expectUrl('POST', 'ReminderScheduler');
    expect(req.request.body).toBe(body);
    req.flush(true);
  });

  it('getReminderSchedulers GETs ReminderScheduler/{application}/{referenceId}', () => {
    service
      .getReminderSchedulers({ application: 'salesOrder', referenceId: 'so1' } as any)
      .subscribe();
    expectUrl('GET', 'ReminderScheduler/salesOrder/so1').flush([]);
  });

  it('getCurrencies GETs Currency', () => {
    service.getCurrencies().subscribe();
    expectUrl('GET', 'Currency').flush([]);
  });

  it('getPageHelperText GETs pagehelper/code/{code}', () => {
    service.getPageHelperText('inventory-adjustment').subscribe();
    expectUrl('GET', 'pagehelper/code/inventory-adjustment').flush({} as any);
  });

  it('getLocationsForCurrentUser emits securityService.locations$', () => {
    let result: any;
    service.getLocationsForCurrentUser().subscribe((r) => (result = r));
    expect(result).toEqual([{ id: 'l1' }]);
  });

  it('getLocationsForReport emits securityService.allLocations$', () => {
    let result: any;
    service.getLocationsForReport().subscribe((r) => (result = r));
    expect(result).toEqual([{ id: 'l2' }]);
  });

  it('getAllLocations emits securityService.AllLocationList$', () => {
    let result: any;
    service.getAllLocations().subscribe((r) => (result = r));
    expect(result).toEqual([{ id: 'l1' }]);
  });

  it('getFinancialYearsForReport emits securityService.allFinancialYears$', () => {
    let result: any;
    service.getFinancialYearsForReport().subscribe((r) => (result = r));
    expect(result).toEqual([{ id: 2026 }]);
  });

  it('setSideMenuStatus publishes to sideMenuStatus$', () => {
    let value: boolean | undefined;
    service.sideMenuStatus$.subscribe((v) => (value = v));
    expect(value).toBe(false);
    service.setSideMenuStatus(true);
    expect(value).toBe(true);
  });
});