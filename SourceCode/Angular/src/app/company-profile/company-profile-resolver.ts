import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { CompanyProfileService } from './company-profile.service';
import { of } from 'rxjs';
import { take, mergeMap, catchError, map } from 'rxjs/operators';
import { CompanyProfile } from '@core/domain-classes/company-profile';
import { environment } from '@environments/environment';
import { SecurityService } from '@core/security/security.service';
import { BusinessLocationService } from '../business-location/business-location.service';
import { WrLicenseService } from '@core/services/wr-license.service';

export const CompanyProfileResolver: ResolveFn<CompanyProfile | null> = (route: ActivatedRouteSnapshot) => {
  const companyProfileService = inject(CompanyProfileService);
  const router = inject(Router);
  const securityService = inject(SecurityService);
  const businessLocationService = inject(BusinessLocationService);
  const wrLicenseService = inject(WrLicenseService);

  return companyProfileService.getCompanyProfile().pipe(
    take(1),
    mergeMap((companyProfile: CompanyProfile) => {
      if (companyProfile) {
        if (companyProfile.languages) {
          companyProfile.languages.forEach((lan) => {
            lan.imageUrl = `${environment.apiUrl}${lan.imageUrl}`;
          });
        }
        
        // Fetch locations if the user is logged in so they are ready before any component loads
        if (securityService.isLogin()) {
          return businessLocationService.getLocations().pipe(
            map(locations => {
              companyProfile.locations = locations;
              sessionStorage.setItem(wrLicenseService.keyValues.LOCATION_CACHE, JSON.stringify(locations));
              return companyProfile;
            }),
            catchError(() => of(companyProfile))
          );
        }

        return of(companyProfile);
      } else {
        return of(null);
      }
    }),
    catchError((err) => {
      console.error('CompanyProfileResolver failed:', err);
      return of(null);
    })
  );
};

