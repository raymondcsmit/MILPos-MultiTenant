import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { ManageCountryComponent } from './manage-country.component';
import { CountryService } from '@core/services/country.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { Country } from '@core/domain-classes/country';

describe('ManageCountryComponent', () => {
  let component: ManageCountryComponent;
  let fixture: ComponentFixture<ManageCountryComponent>;
  let countryService: jasmine.SpyObj<CountryService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };

  function create(data: Country): void {
    dialogRef = { close: jasmine.createSpy('close') };
    TestBed.overrideProvider(MatDialogRef, { useValue: dialogRef });
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });
    fixture = TestBed.createComponent(ManageCountryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    countryService = jasmine.createSpyObj<CountryService>('CountryService', ['add', 'update']);
    countryService.add.and.returnValue(of({ id: 'c1', countryName: 'Pakistan' } as Country));
    countryService.update.and.returnValue(of({ id: 'c2', countryName: 'UAE' } as Country));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    TestBed.configureTestingModule({
      imports: [ManageCountryComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: CountryService, useValue: countryService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    });
  });

  it('should create with empty form in add mode', () => {
    create({} as Country);
    expect(component).toBeTruthy();
    expect(component.isEdit).toBeFalse();
    expect(component.countryForm.get('countryName')?.value).toBe('');
    expect(component.countryForm.invalid).toBeTrue();
  });

  it('prefills countryName and enters edit mode from dialog data', () => {
    create({ id: 'c2', countryName: 'UAE' } as Country);
    expect(component.isEdit).toBeTrue();
    expect(component.countryForm.get('countryName')?.value).toBe('UAE');
  });

  it('invalid submit marks touched and does not call service', () => {
    create({} as Country);
    component.saveCountry();
    expect(countryService.add).not.toHaveBeenCalled();
    expect(countryService.update).not.toHaveBeenCalled();
    expect(component.countryForm.get('countryName')?.touched).toBeTrue();
  });

  it('valid submit adds country and closes dialog with result', () => {
    create({} as Country);
    component.countryForm.get('countryName')?.setValue('Pakistan');
    component.saveCountry();
    expect(countryService.add).toHaveBeenCalledWith(jasmine.objectContaining({ countryName: 'Pakistan' }));
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 'c1', countryName: 'Pakistan' });
  });

  it('valid submit in edit mode updates country', () => {
    create({ id: 'c2', countryName: 'UAE' } as Country);
    component.countryForm.get('countryName')?.setValue('Saudi Arabia');
    component.saveCountry();
    expect(countryService.update).toHaveBeenCalledWith('c2', jasmine.objectContaining({ countryName: 'Saudi Arabia' }));
    expect(countryService.add).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 'c2', countryName: 'UAE' });
  });

  it('cancel closes dialog without saving', () => {
    create({} as Country);
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(countryService.add).not.toHaveBeenCalled();
  });
});
