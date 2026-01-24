import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { InquiryService } from '../inquiry.service';
import { Inquiry } from '@core/domain-classes/inquiry';
import { EMPTY, of, take, mergeMap } from 'rxjs';

export const InquiryDetailResolver: ResolveFn<Inquiry | null> = (route: ActivatedRouteSnapshot) => {
  const inquiryService = inject(InquiryService);
  const router = inject(Router);
  
  const id = route.paramMap.get('id');
  if (id === 'addItem') {
    return of(null);
  }
  
  return inquiryService.getInquiry(id ?? '').pipe(
    take(1),
    mergeMap((inquiry: Inquiry) => {
      if (inquiry) {
        // Inquiry data is already in the correct format
        // Attachments are handled via separate service calls
        return of(inquiry);
      } else {
        router.navigate(['/inquiry']);
        return EMPTY;
      }
    })
  );
};
