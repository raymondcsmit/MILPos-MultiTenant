import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { LanguagesService } from '../languages.service';
import { environment } from '@environments/environment';
import { EMPTY, of, take, mergeMap } from 'rxjs';

export const LanguageDetailResolver: ResolveFn<any | null> = (route: ActivatedRouteSnapshot) => {
  const languageService = inject(LanguagesService);
  const router = inject(Router);
  
  const id = route.paramMap.get('id');
  if (id === 'addItem') {
    return of(null);
  }
  
  return languageService.getLanguageById(id ?? '').pipe(
    take(1),
    mergeMap((language: any) => {
      if (language) {
        return of(language);
      } else {
        router.navigate(['/languages']);
        return EMPTY;
      }
    })
  );
};