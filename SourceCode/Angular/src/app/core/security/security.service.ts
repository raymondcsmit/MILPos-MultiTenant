import { inject, Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { tap, map } from 'rxjs/operators';
import { AuthToken, UserAuth } from '../domain-classes/user-auth';
import { User } from '@core/domain-classes/user';
import { Router } from '@angular/router';
import { ClonerService } from '@core/services/clone.service';
import { CompanyProfile } from '@core/domain-classes/company-profile';
import { environment } from '@environments/environment';

import {
  BusinessLocation,
  UserFinancialYears,
  UserLocations,
} from '@core/domain-classes/business-location';
import { TranslationService } from '@core/services/translation.service';
import { WrLicenseService } from '@core/services/wr-license.service';
import { FinancialYear } from '../../accounting/financial-year/financial-year';

@Injectable({ providedIn: 'root' })
export class SecurityService {
  securityObject: UserAuth = new UserAuth();
  private _securityObject$: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);
  private _companyProfile$: BehaviorSubject<CompanyProfile | null> =
    new BehaviorSubject<CompanyProfile | null>(null);

  private _claims: string[] = [];
  private _token: AuthToken | null = null;
  private _selectedLocation: string = '';

  public currencyCode = 'USD';
  private wrLicenseService: WrLicenseService = inject(WrLicenseService);

  setCompany(companyProfile?: CompanyProfile) {
    if (companyProfile) {
      sessionStorage.setItem(
        this.wrLicenseService.keyValues.COMPANY_PROFILE,
        JSON.stringify(companyProfile)
      );
      this._companyProfile$.next(JSON.parse(JSON.stringify(companyProfile)));
    } else {
      const companyProfileJson = sessionStorage.getItem(
        this.wrLicenseService.keyValues.COMPANY_PROFILE
      );
      if (
        companyProfileJson &&
        companyProfileJson !== 'null' &&
        companyProfileJson !== 'undefined'
      ) {
        this._companyProfile$.next(JSON.parse(companyProfileJson));
      }
    }
  }

  public get companyProfile(): Observable<CompanyProfile | null> {
    return this._companyProfile$;
  }

  public get Claims(): string[] {
    if (this._claims.length > 0) {
      return this._claims;
    }
    if (this.Token) {
      // Only include claims whose value is the string "true"
      this._claims = Object.keys(this.Token).filter(
        (key) => this.Token && this.Token[key] === "true"
      );
    }
    return this._claims;
  }

  public get Token(): AuthToken | null {
    if (this._token) {
      return this._token;
    }
    this._token = this.wrLicenseService.getJWtToken();
    return this._token ?? null;
  }

  public get SelectedLocation(): string {
    if (this._selectedLocation) {
      return this._selectedLocation;
    }
    const authObj = this.wrLicenseService.getAuthObject();
    if (authObj) {
      this._selectedLocation = authObj.selectedLocation ?? '';
    }
    return this._selectedLocation;
  }

  public get isPOSPermissionOnly(): boolean {
    return this.Claims.length == 1 && this.Claims[0].toLowerCase() == 'pos_pos';
  }

  public get securityObject$(): Observable<User | null> {
    return this._securityObject$.pipe(
      map((c) => {
        if (c) {
          return c;
        }
        const currentData = localStorage.getItem(this.wrLicenseService.keyValues.authObj);
        if (currentData) {
          this._securityObject$.next(JSON.parse(currentData));
          return JSON.parse(currentData);
        }
        return null;
      })
    );
  }

  public get locations$(): Observable<UserLocations> {
    return this.companyProfile.pipe(
      map((c: CompanyProfile | null) => {
        if (!c) {
          const userLocations: UserLocations = {
            locations: [],
            selectedLocation: '',
          };
          return userLocations;
        }
        if (this.Token && this.Token['locationIds']) {
          if (c) {
            const companyProfile = c as CompanyProfile;
            const userLocations = companyProfile.locations?.filter((l: BusinessLocation) =>
              this.Token ? this.Token['locationIds'].split(',')?.indexOf(l?.id ?? '') >= 0 : false
            );
            return {
              locations: userLocations,
              selectedLocation: this.SelectedLocation,
            } as UserLocations;
          }
        }
        return {
          locations: [],
          selectedLocation: '',
        } as UserLocations;
      })
    );
  }

  public get AllLocationList$(): Observable<BusinessLocation[]> {
    return this.companyProfile.pipe(
      map((c: CompanyProfile | null) => {
        if (c) {
          return c.locations ? c.locations : [];
        }
        return [];
      })
    );
  }

  public get allLocations$(): Observable<UserLocations> {
    return this.companyProfile.pipe(
      map((c: CompanyProfile | null) => {
        if (!c) {
          return {
            locations: [],
            selectedLocation: '',
          };
        }
        if (c) {
          if (c.locations) {
            const userLocations = c.locations.filter((l) =>
              this.Token ? this.Token['locationIds'].split(',').indexOf(l.id ?? '') >= 0 : false
            );
            if (userLocations.length == c.locations.length) {
              userLocations.unshift({
                id: '',
                name: this.translationService.getValue('ALL_LOCATIONS'),
              });
            }
            return {
              locations: userLocations,
              selectedLocation: this.SelectedLocation,
            };
          }
        }
        return {
          locations: [],
          selectedLocation: '',
        };
      })
    );
  }

  setFinancialYears(financialYears: FinancialYear[]) {
    const currentProfile = this._companyProfile$.value;
    if (currentProfile) {
      this._companyProfile$.next({
        ...currentProfile,
        financialYears: [...financialYears],
      });
    }
  }

  public get allFinancialYears$(): Observable<UserFinancialYears> {
    return this.companyProfile.pipe(
      map((c: CompanyProfile | null) => {
        if (!c || !c.financialYears) {
          return {
            financialYears: [],
            selectedFinancialYearId: '',
          } as UserFinancialYears;
        }

        // Clone the financial years array
        const userFinancialYears = [...c.financialYears];

        // Get saved selection from localStorage or default to first open year
        let selectedFinancialYearId = localStorage.getItem('selectedFinancialYearId') || '';
        if (!selectedFinancialYearId) {
          const openYear = userFinancialYears.find((fy) => !fy.isClosed);
          selectedFinancialYearId = openYear?.id || '';
        }

        return {
          financialYears: userFinancialYears,
          selectedFinancialYearId,
        } as UserFinancialYears;
      })
    );
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private clonerService: ClonerService,
    private translationService: TranslationService
  ) { }

  login(entity: User): Observable<UserAuth> {
    // Initialize security object
    this.resetSecurityObject();
    return this.http.post<UserAuth>('authentication', entity).pipe(
      tap((resp: any) => {
        this.securityObject = this.clonerService.deepClone<UserAuth>(resp);
        this.wrLicenseService.setTokenValue(this.securityObject);
        if (this.Token) {
          const userLocations = this.Token['locationIds']?.split(',').filter((id: string) => id?.toString() != '');
          if (userLocations == null || userLocations.length == 0) {
            this.wrLicenseService.removeToken();
            throw new Error('No location assigned to user.');
          }
          this.updateSelectedLocation(userLocations[0]);
        }
        this._securityObject$.next(resp.user);
      })
    );
  }

  isLogin(): boolean {
    const authStr = this.wrLicenseService.getAuthObject();
    return !!authStr;
  }

  logout(): void {
    this.resetSecurityObject();
  }

  resetSecurityObject(): void {
    localStorage.removeItem(this.wrLicenseService.keyValues.authObj);
    localStorage.removeItem(this.wrLicenseService.keyValues.BEARER_TOKEN);
    this._securityObject$.next(null);
    this._token = null;
    this._claims = [];
    this.router.navigate(['/login']);
  }

  updateProfile(companyProfile: CompanyProfile) {
    this.currencyCode = companyProfile.currencyCode ?? '';
    if (companyProfile.logoUrl) {
      companyProfile.logoUrl = `${environment.apiUrl}${companyProfile.logoUrl}`;
    }
    this._companyProfile$.next(companyProfile);
  }

  updateSelectedLocation(selectedLocation: string) {
    const authObj = this.wrLicenseService.getAuthObject();
    if (authObj) {
      authObj.selectedLocation = selectedLocation;
      localStorage.setItem(this.wrLicenseService.keyValues.authObj, JSON.stringify(authObj));
      this._selectedLocation = selectedLocation;
    }
  }

  updateUserProfile(user: User) {
    const authObj = this.wrLicenseService.getAuthObject();
    if (authObj) {
      authObj.firstName = user.firstName;
      authObj.lastName = user.lastName;
      authObj.profilePhoto = user.profilePhoto;
      authObj.phoneNumber = user.phoneNumber;
      localStorage.setItem(this.wrLicenseService.keyValues.authObj, JSON.stringify(authObj));
      this._securityObject$.next(this.clonerService.deepClone<User>(authObj));
    }
  }

  // This method can be called a couple of different ways
  // *hasClaim="'claimType'"  // Assumes claimValue is true
  // *hasClaim="'claimType:value'"  // Compares claimValue to value
  // *hasClaim="['claimType1','claimType2:value','claimType3']"
  // tslint:disable-next-line: typedef
  hasClaim(claimType: any, claimValue?: any): boolean {
    let ret = false;
    // See if an array of values was passed in.
    if (typeof claimType === 'string') {
      ret = this.isClaimValid(claimType, claimValue);
    } else {
      const claims: string[] = claimType;
      if (claims) {
        // tslint:disable-next-line: prefer-for-of
        for (let index = 0; index < claims.length; index++) {
          ret = this.isClaimValid(claims[index]);
          // If one is successful, then let them in
          if (ret) {
            break;
          }
        }
      }
    }
    return ret;
  }

  private isClaimValid(claimType: string, claimValue?: string): boolean {
    let ret = false;
    // See if the claim type has a value
    // *hasClaim="'claimType:value'"
    if (claimType.indexOf(':') >= 0) {
      const words: string[] = claimType.split(':');
      claimType = words[0].toLowerCase();
      claimValue = words[1];
    } else {
      claimType = claimType.toLowerCase();
      // Either get the claim value, or assume 'true'
      claimValue = claimValue ? claimValue : 'true';
    }
    const token = this.wrLicenseService.getJWtToken();
    if (token) {
      const claims = Object.keys(token).filter((key) => token[key]);
      ret = claims?.find((c: any) => c.toLowerCase() == claimType) != null;
    }

    return ret;
  }

  getUserDetail(): User | null {
    return this.wrLicenseService.getAuthObject();
  }
}
