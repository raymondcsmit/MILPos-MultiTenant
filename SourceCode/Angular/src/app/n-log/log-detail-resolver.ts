import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { NLogService } from './n-log.service';
import { NLog } from '@core/domain-classes/n-log';
import { Observable } from 'rxjs';

export const LogDetailResolver: ResolveFn<NLog | null> = (route: ActivatedRouteSnapshot) => {
  const nLogService = inject(NLogService);

  const id = route.paramMap.get('id');
  if (id !== null) {
    return nLogService.getLogDetails(id ?? '') as Observable<NLog>;
  }
  return null;
};