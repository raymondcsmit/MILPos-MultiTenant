import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { ManageCityComponent } from './manage-city.component';
import { CityService } from '../city.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { Country } from '@core/domain-classes/country';
import { City } from '@core/domain-classes/city';

describe('ManageCityComponent', () => {
  let component: ManageCityComponent;
  let fixture: ComponentFixture<ManageCityComponent>;
  let cityService: jasmine.SpyObj<CityService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };

  const countries: Country[] = [
    { id: 'co1', countryName: 'Pakistan' } as Country,
    { id: 'co2', countryName: 'UAE' } as Country,
  ];

  function create(data: City): void {
    dialogRef = { close: jasmine.createSpy('close') };
    TestBed.overrideProvider(MatDialogRef, { useValue: dialogRef });
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });
    fixture = TestBed.createComponent(ManageCityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    cityService = jasmine.createSpyObj<CityService>('CityService', ['saveCity', 'updateCity']);
    cityService.saveCity.and.returnValue(of({ id: 'ci1', cityName: 'Lahore' } as City));
    cityService.updateCity.and.returnValue(of({} as City));
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getCountry', 'getPageHelperText']);
    commonService.getCountry.and.returnValue(of(countries));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    TestBed.configureTestingModule({
      imports: [ManageCityComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: CommonService, useValue: commonService },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: CityService, useValue: cityService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    });
  });

  it('should create, load country list, and start in add mode', () => {
    create({} as City);
    expect(component).toBeTruthy();
    expect(component.isEdit).toBeFalse();
    expect(component.countryList.length).toBe(2);
    expect(component.cityForm.invalid).toBeTrue();
  });

  it('prefills city form and enters edit mode from dialog data', () => {
    create({ id: 'ci1', cityName: 'Lahore', countryId: 'co1' } as City);
    expect(component.isEdit).toBeTrue();
    expect(component.cityForm.get('cityName')?.value).toBe('Lahore');
    expect(component.cityForm.get('countryId')?.value).toBe('co1');
  });

  it('invalid submit (missing country) does not call service', () => {
    create({} as City);
    component.cityForm.get('cityName')?.setValue('Lahore');
    component.saveCity();
    expect(cityService.saveCity).not.toHaveBeenCalled();
    expect(component.cityForm.get('countryId')?.touched).toBeTrue();
  });

  it('valid submit saves new city and closes dialog', () => {
    create({} as City);
    component.cityForm.get('cityName')?.setValue('Lahore');
    component.cityForm.get('countryId')?.setValue('co1');
    component.saveCity();
    expect(cityService.saveCity).toHaveBeenCalledWith(jasmine.objectContaining({ cityName: 'Lahore', countryId: 'co1' }));
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(dialogRef.close).toHaveBeenCalledWith({ id: '', cityName: 'Lahore', countryId: 'co1' });
  });

  it('valid submit in edit mode updates the city', () => {
    create({ id: 'ci1', cityName: 'Lahore', countryId: 'co1' } as City);
    component.cityForm.get('cityName')?.setValue('Karachi');
    component.saveCity();
    expect(cityService.updateCity).toHaveBeenCalledWith('ci1', jasmine.objectContaining({ cityName: 'Karachi' }));
    expect(cityService.saveCity).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('filterName narrows the country list case-insensitively', () => {
    create({} as City);
    component.filterName('ua');
    expect(component.filteredCountryList.map(c => c.countryName)).toEqual(['UAE']);
    component.filterName('');
    expect(component.filteredCountryList.length).toBe(2);
  });

  it('cancel closes dialog without saving', () => {
    create({} as City);
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(cityService.saveCity).not.toHaveBeenCalled();
  });
});
