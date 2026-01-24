import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonError } from '@core/error-handler/common-error';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { User } from '@core/domain-classes/user';
import { catchError } from 'rxjs/operators';
import { Role } from '@core/domain-classes/role';
import { City } from '@core/domain-classes/city';
import {
  ReminderFrequency,
  reminderFrequencies,
} from '@core/domain-classes/reminder-frequency';
import { ReminderScheduler } from '@core/domain-classes/reminder-scheduler';
import { CustomReminderScheduler } from '@core/domain-classes/custom-reminder-scheduler';
import { ModuleReference } from '@core/domain-classes/module-reference';
import { Product } from '@core/domain-classes/product';
import { CountryService } from './country.service';
import { Currency } from '@core/domain-classes/currency';
import { BusinessLocation, UserFinancialYears, UserLocations } from '@core/domain-classes/business-location';
import { SecurityService } from '@core/security/security.service';
import { PageHelper } from '@core/domain-classes/page-helper';
import { Reminder } from '@core/domain-classes/reminder';

@Injectable({ providedIn: 'root' })
export class CommonService {
  constructor(
    private httpClient: HttpClient,
    private commonHttpErrorService: CommonHttpErrorService,
    private countryService: CountryService,
    private securityService: SecurityService
  ) { }

  private _sideMenuStatus$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public get sideMenuStatus$(): Observable<boolean> {
    return this._sideMenuStatus$.asObservable();
  }
  public setSideMenuStatus(flag: boolean) {
    this._sideMenuStatus$.next(flag);
  }

  getReminder(id: string): Observable<Reminder> {
    const url = `reminder/${id}`;
    return this.httpClient
      .get<Reminder>(url);
  }

  getAllUsers(): Observable<User[]> {
    const url = `user/getAllUsers`;
    return this.httpClient
      .get<User[]>(url);
  }

  getRoles(): Observable<Role[]> {
    const url = `role`;
    return this.httpClient
      .get<Role[]>(url);

  }

  getCountry() {
    return this.countryService.getAll();
  }

  getCityByName(countryName: string, cityName: string) {
    const url = `city/country?countryName=${countryName}&&cityName=${cityName}`;
    return this.httpClient.get<City[]>(url);
  }

  getUsers(): Observable<User[]> {
    const url = `user/getUsers`;
    return this.httpClient
      .get<User[]>(url);

  }

  getReminderFrequency(): Observable<ReminderFrequency[]> {
    return of(reminderFrequencies);
  }

  addReminderSchedule(customReminderScheduler: CustomReminderScheduler) {
    return this.httpClient.post<boolean>(
      'ReminderScheduler',
      customReminderScheduler
    );
  }
  getReminderSchedulers(
    moduleReference: ModuleReference
  ): Observable<ReminderScheduler[]> {
    const url = `ReminderScheduler/${moduleReference.application}/${moduleReference.referenceId}`;
    return this.httpClient.get<ReminderScheduler[]>(url);
  }

  getCurrencies(): Observable<Currency[]> {
    return this.httpClient.get<Currency[]>('Currency');
  }

  getLocationsForCurrentUser(): Observable<UserLocations> {
    return this.securityService.locations$;
  }

  getLocationsForReport(): Observable<UserLocations> {
    return this.securityService.allLocations$;
  }

  getAllLocations(): Observable<BusinessLocation[]> {
    return this.securityService.AllLocationList$;
  }

  getFinancialYearsForReport(): Observable<UserFinancialYears> {
    return this.securityService.allFinancialYears$;
  }

  getPageHelperText(code: string): Observable<PageHelper> {
    const url = `pagehelper/code/${code}`;
    return this.httpClient.get<PageHelper>(url);
  }
}
