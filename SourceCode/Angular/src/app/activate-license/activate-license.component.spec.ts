import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { ActivateLicenseComponent } from './activate-license.component';
import { SecurityService } from '@core/security/security.service';
import { WrLicenseService } from '@core/services/wr-license.service';

describe('ActivateLicenseComponent', () => {
  let component: ActivateLicenseComponent;
  let fixture: ComponentFixture<ActivateLicenseComponent>;
  let wrLicenseService: jasmine.SpyObj<WrLicenseService>;
  let companyProfile$: BehaviorSubject<any>;
  const validCode = '12345678-1234-1234-1234-123456789012';

  function createFixture(): void {
    fixture = TestBed.createComponent(ActivateLicenseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    wrLicenseService = jasmine.createSpyObj<WrLicenseService>('WrLicenseService', ['onActivateLicense']);
    companyProfile$ = new BehaviorSubject<any>(null);
    const securityService = jasmine.createSpyObj<SecurityService>('SecurityService', ['hasClaim']);
    (securityService as any).companyProfile = companyProfile$.asObservable();

    TestBed.configureTestingModule({
      imports: [ActivateLicenseComponent, TranslateModule.forRoot()],
      providers: [
        { provide: SecurityService, useValue: securityService },
        { provide: WrLicenseService, useValue: wrLicenseService },
      ],
    });
  });

  it('should create and build the purchase code form', () => {
    createFixture();
    expect(component).toBeTruthy();
    expect(component.activatedForm.get('purchaseCode')?.value).toBe('');
    expect(component.activatedForm.get('purchaseCode')?.hasError('required')).toBeTrue();
  });

  it('should require a purchase code of at least 36 characters', () => {
    createFixture();
    component.activatedForm.get('purchaseCode')?.setValue(validCode.slice(0, 35));
    expect(component.activatedForm.get('purchaseCode')?.hasError('minlength')).toBeTrue();
    component.activatedForm.get('purchaseCode')?.setValue(validCode);
    expect(component.activatedForm.valid).toBeTrue();
  });

  it('should mark the form touched and not call the service when invalid', () => {
    createFixture();
    component.onActivateLicense();
    expect(component.activatedForm.get('purchaseCode')?.touched).toBeTrue();
    expect(wrLicenseService.onActivateLicense).not.toHaveBeenCalled();
  });

  it('should activate the license with the purchase code when valid', () => {
    createFixture();
    component.activatedForm.get('purchaseCode')?.setValue(validCode);
    component.onActivateLicense();
    expect(wrLicenseService.onActivateLicense).toHaveBeenCalledWith(validCode);
  });

  it('should pick up the company profile logo', () => {
    createFixture();
    companyProfile$.next({ logoUrl: 'logo.png' });
    expect(component.logoUrl).toBe('logo.png');
  });
});
