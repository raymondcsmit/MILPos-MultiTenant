import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { BusinessLocationListComponent } from './business-location-list.component';
import { BusinessLocationService } from '../business-location.service';
import { CompanyProfileService } from '../../company-profile/company-profile.service';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { CommonService } from '@core/services/common.service';
import { CompanyProfile } from '@core/domain-classes/company-profile';
import { BusinessLocation } from '@core/domain-classes/business-location';

describe('BusinessLocationListComponent', () => {
  let component: BusinessLocationListComponent;
  let fixture: ComponentFixture<BusinessLocationListComponent>;
  let httpMock: HttpTestingController;
  let businessLocationService: BusinessLocationService;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let securityService: jasmine.SpyObj<SecurityService>;
  let companyProfileService: jasmine.SpyObj<CompanyProfileService>;

  const locations: BusinessLocation[] = [
    { id: 'l1', name: 'Main Branch', contactPerson: 'Alice', mobile: '0700111222' } as BusinessLocation,
    { id: 'l2', name: 'Westlands', contactPerson: 'Bob', mobile: '0733444555' } as BusinessLocation,
  ];

  const profile: CompanyProfile = { id: 'p1', name: 'Acme Ltd' } as unknown as CompanyProfile;

  beforeEach(() => {
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    securityService = jasmine.createSpyObj<SecurityService>('SecurityService', ['hasClaim', 'updateProfile']);
    companyProfileService = jasmine.createSpyObj<CompanyProfileService>('CompanyProfileService', ['getCompanyProfile']);
    companyProfileService.getCompanyProfile.and.returnValue(of(profile));

    TestBed.configureTestingModule({
      imports: [BusinessLocationListComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: securityService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: MatDialog, useValue: dialog },
        { provide: CompanyProfileService, useValue: companyProfileService },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    businessLocationService = TestBed.inject(BusinessLocationService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function load(): void {
    fixture = TestBed.createComponent(BusinessLocationListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne(r => r.method === 'GET' && r.url === 'location').flush(locations);
    fixture.detectChanges();
  }

  it('should create and load locations', () => {
    load();
    expect(component).toBeTruthy();
    expect(component.locations.length).toBe(2);
    expect(fixture.nativeElement.querySelector('table')?.textContent).toContain('Main Branch');
    expect(fixture.nativeElement.querySelector('table')?.textContent).toContain('Westlands');
  });

  it('delete confirmation removes location and reloads', () => {
    load();
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deleteLocation(locations[0]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith(jasmine.stringContaining('Main Branch'));
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === 'location/l1').flush({ success: true });
    httpMock.expectOne(r => r.method === 'GET' && r.url === 'location').flush([locations[1]]);
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(component.locations.length).toBe(1);
  });

  it('delete with success:false body shows error and does not reload', () => {
    load();
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deleteLocation(locations[0]);
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === 'location/l1')
      .flush({ success: false, errors: ['Location has linked stock'] });
    expect(toastrService.error).toHaveBeenCalledWith('Location has linked stock');
    httpMock.expectNone(r => r.method === 'GET' && r.url === 'location');
    expect(component.locations.length).toBe(2);
  });

  it('declined delete confirmation does not call api', () => {
    load();
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deleteLocation(locations[0]);
    httpMock.expectNone(r => r.method === 'DELETE');
    expect(component.locations.length).toBe(2);
  });

  it('delete http error surfaces message via toastr', () => {
    load();
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deleteLocation(locations[1]);
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === 'location/l2')
      .flush({ message: 'FK violation' }, { status: 500, statusText: 'Server Error' });
    expect(toastrService.error).toHaveBeenCalledWith('FK violation');
  });

  it('closed manage dialog with result refreshes list and company profile', () => {
    load();
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.manageLocation(null);
    expect(dialog.open).toHaveBeenCalled();
    httpMock.expectOne(r => r.method === 'GET' && r.url === 'location').flush(locations);
    expect(companyProfileService.getCompanyProfile).toHaveBeenCalled();
    expect(securityService.updateProfile).toHaveBeenCalledWith(profile);
  });

  it('closed manage dialog without result leaves list unchanged', () => {
    load();
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    component.manageLocation(null);
    httpMock.expectNone(r => r.method === 'GET' && r.url === 'location');
    expect(companyProfileService.getCompanyProfile).not.toHaveBeenCalled();
  });
});
