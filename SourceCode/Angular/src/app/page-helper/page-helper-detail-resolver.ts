import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { PageHelperService } from './page-helper.service';
import { PageHelper } from '@core/domain-classes/page-helper';
import { Observable } from 'rxjs';

export const PageHelperDetailResolver: ResolveFn<PageHelper | null> = (route: ActivatedRouteSnapshot) => {
  const pageHelperService = inject(PageHelperService);
  
  const id = route.paramMap.get('id');
  if (id !== null) {
    return pageHelperService.getPageHelper(id ?? '') as Observable<PageHelper>;
  }
  return null;
};
