import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { CityListComponent } from './city-list.component';
import { CityService } from '../city.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { SecurityService } from '@core/security/security.service';
import { Country } from '@core/domain-classes/country';
import { City } from '@core/domain-classes/city';
import { HttpResponse } from '@angular/common/http';

describe('CityListComponent', () => {
  let component: CityListComponent;
  let fixture: ComponentFixture<CityListComponent>;
  let httpMock: HttpTestingController;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const cities: City[] = [
    { id: 'ci1', cityName: 'Lahore', countryId: 'co1', countryName: 'Pakistan' } as unknown as City,
    { id: 'ci2', cityName: 'Dubai', countryId: 'co2', countryName: 'UAE' } as unknown as City,
  ];

  const countries: Country[] = [
    { id: 'co1', countryName: 'Pakistan' } as Country,
    { id: 'co2', countryName: 'UAE' } as Country,
  ];

  beforeEach(() => {
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getCountry', 'getPageHelperText']);
    commonService.getCountry.and.returnValue(of(countries));

    TestBed.configureTestingModule({
      imports: [CityListComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CommonService, useValue: commonService },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushCityPage(): void {
    const req = httpMock.expectOne(r => r.method === 'GET' && r.url === 'city');
    req.flush(cities, {
      headers: { 'X-Pagination': JSON.stringify({ pageSize: 10, skip: 0, totalCount: 2 }) },
    } as any);
  }

  it('should create and load first page of cities', () => {
    fixture = TestBed.createComponent(CityListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushCityPage();
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.cities.length).toBe(2);
    expect(component.cityResource.pageSize).toBe(10);
    expect(component.cityResource.totalCount).toBe(2);
    expect(fixture.nativeElement.querySelector('table')?.textContent).toContain('Lahore');
  });

  it('name filter resets pagination and triggers a new query', fakeAsync(() => {
    fixture = TestBed.createComponent(CityListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushCityPage();
    fixture.detectChanges();
    component.NameFilter = 'Dub';
    tick(1100);
    const req = httpMock.expectOne(r => r.method === 'GET' && r.url === 'city');
    expect(req.request.params.get('cityName')).toBe('Dub');
    req.flush([], {
      headers: { 'X-Pagination': JSON.stringify({ pageSize: 10, skip: 0, totalCount: 0 }) },
    } as any);
    fixture.detectChanges();
    expect(component.cities.length).toBe(0);
  }));

  it('paginator page change requests the next page', () => {
    fixture = TestBed.createComponent(CityListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushCityPage();
    fixture.detectChanges();
    component.paginator.pageIndex = 1;
    component.paginator.page.next({ pageIndex: 1, pageSize: 20, length: 100 } as any);
    const req = httpMock.expectOne(r => r.method === 'GET' && r.url === 'city');
    expect(req.request.params.get('skip')).toBe('10');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush([], {
      headers: { 'X-Pagination': JSON.stringify({ pageSize: 10, skip: 10, totalCount: 100 }) },
    } as any);
    fixture.detectChanges();
    expect(component.cityResource.totalCount).toBe(100);
  });

  it('delete confirmation calls api and reloads the list', () => {
    fixture = TestBed.createComponent(CityListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushCityPage();
    fixture.detectChanges();
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deleteCity(cities[0]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith(jasmine.stringContaining('Lahore'));
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === 'city/ci1').flush(null);
    flushCityPage();
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
  });

  it('declined delete does not call api', () => {
    fixture = TestBed.createComponent(CityListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushCityPage();
    fixture.detectChanges();
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deleteCity(cities[0]);
    httpMock.expectNone(r => r.method === 'DELETE');
  });

  it('manage dialog closed with result reloads the list', () => {
    fixture = TestBed.createComponent(CityListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushCityPage();
    fixture.detectChanges();
    dialog.open.and.returnValue({ afterClosed: () => of({ id: 'ci1', cityName: 'Lahore' }) } as any);
    component.manageCity(null);
    expect(dialog.open).toHaveBeenCalled();
    flushCityPage();
  });

  it('manage dialog closed without result does not reload', () => {
    fixture = TestBed.createComponent(CityListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushCityPage();
    fixture.detectChanges();
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    component.manageCity(null);
    httpMock.expectNone(r => r.method === 'GET' && r.url === 'city');
  });
});
