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
import { CacheSyncService } from '../services/cache-sync.service';
import { BusinessLocationService } from '../../business-location/business-location.service';

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
        const profileData: CompanyProfile = JSON.parse(companyProfileJson);
        // Restore cached locations if the stored profile has none (e.g. after F5 refresh)
        if (!profileData.locations || profileData.locations.length === 0) {
          const locationJson = sessionStorage.getItem(this.wrLicenseService.keyValues.LOCATION_CACHE);
          if (locationJson) {
            profileData.locations = JSON.parse(locationJson);
          }
        }
        this._companyProfile$.next(profileData);
      }
    }
  }

  /** Cache location list in sessionStorage and merge into companyProfile so all
   *  subscribers (CommonService.getLocationsForCurrentUser etc.) see fresh data. */
  setLocationsCache(locations: BusinessLocation[]) {
    sessionStorage.setItem(
      this.wrLicenseService.keyValues.LOCATION_CACHE,
      JSON.stringify(locations)
    );
    const current = this._companyProfile$.value;
    if (current) {
      this._companyProfile$.next({ ...current, locations });
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
            ) ?? [];

            let selectedLoc = this.SelectedLocation;
            if (!selectedLoc && userLocations.length > 0) {
              selectedLoc = userLocations[0].id ?? '';
              if (selectedLoc) {
                setTimeout(() => this.updateSelectedLocation(selectedLoc), 0);
              }
            }

            return {
              locations: userLocations,
              selectedLocation: selectedLoc,
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

            let selectedLoc = this.SelectedLocation;
            if (!selectedLoc && userLocations.length > 0) {
              selectedLoc = userLocations[0].id ?? '';
              if (selectedLoc || selectedLoc === '') {
                setTimeout(() => this.updateSelectedLocation(selectedLoc), 0);
              }
            }

            return {
              locations: userLocations,
              selectedLocation: selectedLoc,
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
    private translationService: TranslationService,
    private cacheSyncService: CacheSyncService,
    private businessLocationService: BusinessLocationService
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
        if (resp.menus) {
            localStorage.setItem('userMenus', JSON.stringify(resp.menus));
        }
        this._securityObject$.next(resp.user);
        // Pre-load locations immediately at login so all components read from cache
        this.businessLocationService.getLocations().subscribe({
          next: (locations) => this.setLocationsCache(locations),
          error: (err) => console.error('Could not pre-load locations:', err)
        });
        this.cacheSyncService.syncMasterData();
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
    localStorage.removeItem('userMenus');
    sessionStorage.removeItem(this.wrLicenseService.keyValues.LOCATION_CACHE);
    this.cacheSyncService.clearCache(); // Ensure IndexedDB is cleared on reset
    this._companyProfile$.next(null);
    this._securityObject$.next(null);
    this._token = null;
    this._claims = [];
    this._selectedLocation = '';
    this.router.navigate(['/login']);
  }

  updateProfile(companyProfile: CompanyProfile) {
    this.currencyCode = companyProfile.currencyCode ?? '';
    if (companyProfile.logoUrl) {
      companyProfile.logoUrl = `${environment.apiUrl}${companyProfile.logoUrl}`;
    }

    // Fix: Restore cached locations if the server profile has none (prevents empty dropdowns after login)
    if (!companyProfile.locations || companyProfile.locations.length === 0) {
      const locationJson = sessionStorage.getItem(this.wrLicenseService.keyValues.LOCATION_CACHE);
      if (locationJson) {
        companyProfile.locations = JSON.parse(locationJson);
      }
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
    const token = this.Token;
    if (token) {
      const tokenRecord = token as Record<string, any>;
      // For specific value checks, evaluate the exact token property
      if (claimValue && claimValue !== 'true') {
        ret = Object.keys(tokenRecord).some(
          (key) => key.toLowerCase() === claimType && tokenRecord[key] === claimValue
        );
      } else {
        // For standard permission checks, use the pre-cached Claims array
        ret = this.Claims.some((c: string) => c.toLowerCase() === claimType);
      }
    }

    return ret;
  }

  getUserDetail(): User | null {
    return this.wrLicenseService.getAuthObject();
  }
}
