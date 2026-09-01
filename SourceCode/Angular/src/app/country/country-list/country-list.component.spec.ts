import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { CountryListComponent } from './country-list.component';
import { CountryListPresentationComponent } from '../country-list-presentation/country-list-presentation.component';
import { CountryService } from '@core/services/country.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { Country } from '@core/domain-classes/country';

describe('CountryListComponent', () => {
  let component: CountryListComponent;
  let fixture: ComponentFixture<CountryListComponent>;
  let countryService: jasmine.SpyObj<CountryService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let presentation: CountryListPresentationComponent;

  const countries: Country[] = [
    { id: 'c1', countryName: 'Pakistan' } as Country,
    { id: 'c2', countryName: 'UAE' } as Country,
  ];

  beforeEach(() => {
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    countryService = jasmine.createSpyObj<CountryService>('CountryService', ['getAll', 'delete']);
    countryService.getAll.and.returnValue(of(countries));
    countryService.delete.and.returnValue(of(void 0));

    TestBed.configureTestingModule({
      imports: [CountryListComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: CountryService, useValue: countryService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
  });

  function load(): void {
    fixture = TestBed.createComponent(CountryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    presentation = fixture.debugElement.query(p => p.componentInstance instanceof CountryListPresentationComponent)!.componentInstance as CountryListPresentationComponent;
  }

  it('should create, load countries and feed presentation component', () => {
    load();
    expect(component).toBeTruthy();
    expect(component.countries.length).toBe(2);
    expect(presentation.countries.length).toBe(2);
    expect(presentation.dataSource.data.length).toBe(2);
    expect(countryService.getAll).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('table')?.textContent).toContain('Pakistan');
  });

  it('presentation delete confirmation deletes and reloads via template binding', () => {
    load();
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    presentation.deleteCountry(countries[0]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith(jasmine.stringContaining('Pakistan'));
    expect(countryService.delete).toHaveBeenCalledWith('c1');
    expect(countryService.getAll).toHaveBeenCalledTimes(2);
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
  });

  it('presentation declined delete does not emit handler', () => {
    load();
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    let emitted: string | null = null;
    presentation.deleteCountryHandler.subscribe(id => emitted = id);
    presentation.deleteCountry(countries[0]);
    expect(emitted).toBeNull();
    expect(countryService.delete).not.toHaveBeenCalled();
  });

  it('presentation closed dialog with result replaces country in input and datasource', () => {
    load();
    const updated = { id: 'c2', countryName: 'Emirates' } as Country;
    dialog.open.and.returnValue({ afterClosed: () => of(updated) } as any);
    presentation.manageCountry(countries[1]);
    expect(dialog.open).toHaveBeenCalled();
    expect(presentation.countries[1].countryName).toBe('Emirates');
    expect(presentation.dataSource.data[1].countryName).toBe('Emirates');
  });

  it('presentation closed dialog with new result appends country', () => {
    load();
    const created = { id: 'c3', countryName: 'Oman' } as Country;
    dialog.open.and.returnValue({ afterClosed: () => of(created) } as any);
    presentation.manageCountry(null);
    expect(presentation.countries.length).toBe(3);
    expect(presentation.dataSource.data.length).toBe(3);
  });

  it('presentation closed dialog without result leaves data unchanged', () => {
    load();
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    presentation.manageCountry(null);
    expect(presentation.countries.length).toBe(2);
    expect(presentation.dataSource.data.length).toBe(2);
  });
});
