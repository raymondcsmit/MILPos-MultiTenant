import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { FooterComponent } from './footer.component';
import { SecurityService } from '@core/security/security.service';
import { TranslationService } from '@core/services/translation.service';
import { CompanyProfile } from '@core/domain-classes/company-profile';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;
  let securityService: jasmine.SpyObj<SecurityService>;
  let companyProfile$: BehaviorSubject<CompanyProfile | null>;

  beforeEach(() => {
    securityService = jasmine.createSpyObj<SecurityService>('SecurityService', ['hasClaim', 'logout']);
    companyProfile$ = new BehaviorSubject<CompanyProfile | null>(null);
    (securityService as any).companyProfile = companyProfile$.asObservable();

    TestBed.configureTestingModule({
      imports: [FooterComponent, TranslateModule.forRoot()],
      providers: [
        { provide: SecurityService, useValue: securityService },
        { provide: TranslationService, useValue: jasmine.createSpyObj('TranslationService', ['getValue']) },
      ],
    });
  });

  function createFixture(): void {
    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
  }

  it('should create and set current year', () => {
    companyProfile$.next({ title: 'ACME' } as unknown as CompanyProfile);
    createFixture();
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.currentYear).toBe(new Date().getFullYear());
  });

  it('should render the company profile title in the footer', () => {
    companyProfile$.next({ title: 'ACME' } as unknown as CompanyProfile);
    createFixture();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('ACME');

    companyProfile$.next({ title: 'GLOBEX' } as unknown as CompanyProfile);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('GLOBEX');
  });

  it('should keep the last profile when a null profile is emitted', () => {
    companyProfile$.next({ title: 'ACME' } as unknown as CompanyProfile);
    createFixture();
    fixture.detectChanges();
    companyProfile$.next(null);
    fixture.detectChanges();
    expect(component.companyProfile).toEqual({ title: 'ACME' } as unknown as CompanyProfile);
  });
});
