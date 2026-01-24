import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { Reminder } from '@core/domain-classes/reminder';
import { CommonService } from '@core/services/common.service';
import { Observable, of } from 'rxjs';
import { take, mergeMap } from 'rxjs/operators';

export const reminderDetailResolver: ResolveFn<Reminder | null> = (route: ActivatedRouteSnapshot): Observable<Reminder | null> => {
  const commonService = inject(CommonService);
  const router = inject(Router);
  
  const id = route.paramMap.get('id');
  if (id === 'add') {
    return of(null);
  }
  
  return commonService.getReminder(id ?? '').pipe(
    take(1),
    mergeMap((reminder: Reminder) => {
      if (reminder) {
        if (reminder.startDate) {
          reminder.startTime = new Date(reminder.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        if (reminder.endDate) {
          reminder.endTime = new Date(reminder.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        return of(reminder);
      } else {
        router.navigate(['/reminders']);
        return of(null);
      }
    })
  );
};
