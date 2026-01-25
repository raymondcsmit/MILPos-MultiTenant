import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { CompanyProfileService } from './company-profile.service';
import { of } from 'rxjs';
import { take, mergeMap, catchError } from 'rxjs/operators';
import { CompanyProfile } from '@core/domain-classes/company-profile';
import { environment } from '@environments/environment';

export const CompanyProfileResolver: ResolveFn<CompanyProfile | null> = (route: ActivatedRouteSnapshot) => {
  const companyProfileService = inject(CompanyProfileService);
  const router = inject(Router);

  return companyProfileService.getCompanyProfile().pipe(
    take(1),
    mergeMap((companyProfile: CompanyProfile) => {
      if (companyProfile) {
        if (companyProfile.languages) {
          companyProfile.languages.forEach((lan) => {
            lan.imageUrl = `${environment.apiUrl}${lan.imageUrl}`;
          });
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
