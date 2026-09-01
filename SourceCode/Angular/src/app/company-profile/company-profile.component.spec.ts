import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import { CompanyProfileComponent } from './company-profile.component';
import { CompanyProfileService } from './company-profile.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CompanyProfile } from '@core/domain-classes/company-profile';

describe('CompanyProfileComponent', () => {
  let component: CompanyProfileComponent;
  let fixture: ComponentFixture<CompanyProfileComponent>;
  let companyProfileService: jasmine.SpyObj<CompanyProfileService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let securityService: jasmine.SpyObj<SecurityService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let routeData: Subject<any>;
  let router: Router;

  const profile = {
    id: 'cp1', title: 'ACME', address: '1 Main St', email: 'a@b.c',
    currencyCode: 'USD', logoUrl: '/uploads/logo.png', taxName: 'GST', taxNumber: 'T1',
  } as unknown as CompanyProfile;

  beforeEach(async () => {
    routeData = new Subject<any>();
    companyProfileService = jasmine.createSpyObj('CompanyProfileService', ['updateCompanyProfile']);
    companyProfileService.updateCompanyProfile.and.returnValue(of(profile));
    commonService = jasmine.createSpyObj('CommonService', ['getCurrencies', 'getPageHelperText']);
    commonService.getCurrencies.and.returnValue(of([
      { symbol: 'USD', name: 'US Dollar' }, { symbol: 'PKR', name: 'Pakistani Rupee' },
    ] as any[]));
    securityService = jasmine.createSpyObj('SecurityService', ['hasClaim', 'updateProfile']);
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);
    (translationService as any).lanDir$ = of('ltr');

    TestBed.configureTestingModule({
      imports: [CompanyProfileComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: CompanyProfileService, useValue: companyProfileService },
        { provide: CommonService, useValue: commonService },
        { provide: SecurityService, useValue: securityService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: ActivatedRoute, useValue: { data: routeData.asObservable(), snapshot: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CompanyProfileComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  it('should create, load currencies and receive no profile before resolver data', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.currencies.length).toBe(2);
    expect(component.filteredCurrencies.length).toBe(2);
    expect(component.companyProfileForm.invalid).toBeTrue();
  });

  it('resolver profile patches the form and builds the logo url', () => {
    fixture.detectChanges();
    routeData.next({ profile });
    expect(component.companyProfileForm.get('title')?.value).toBe('ACME');
    expect(component.companyProfileForm.get('currencyCode')?.value).toBe('USD');
    expect(component.imgSrc).toContain('/uploads/logo.png');
  });

  it('filterName narrows currencies by symbol or name and resets on empty', () => {
    fixture.detectChanges();
    component.filterName('pak');
    expect(component.filteredCurrencies.length).toBe(1);
    expect(component.filteredCurrencies[0].symbol).toBe('PKR');
    component.filterName('us dollar');
    expect(component.filteredCurrencies.length).toBe(1);
    component.filterName('');
    expect(component.filteredCurrencies.length).toBe(2);
  });

  it('invalid save marks touched and never calls the service', () => {
    fixture.detectChanges();
    component.saveCompanyProfile();
    expect(component.companyProfileForm.get('title')?.touched).toBeTrue();
    expect(companyProfileService.updateCompanyProfile).not.toHaveBeenCalled();
  });

  it('valid save posts the profile, updates security profile, toasts and navigates', () => {
    fixture.detectChanges();
    routeData.next({ profile });
    component.saveCompanyProfile();
    expect(companyProfileService.updateCompanyProfile).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'cp1', title: 'ACME' }));
    expect(securityService.updateProfile).toHaveBeenCalled();
    expect(toastrService.success).toHaveBeenCalledWith('COMPANY_PROFILE_UPDATED_SUCCESSFULLY');
    expect(router.navigate).toHaveBeenCalledWith(['dashboard']);
  });

  it('onFileSelect ignores non-image files', () => {
    fixture.detectChanges();
    const before = component.imgSrc;
    component.onFileSelect({ target: { files: [{ type: 'application/pdf', name: 'f.pdf' }] } });
    expect(component.imgSrc).toBe(before);
  });
});
