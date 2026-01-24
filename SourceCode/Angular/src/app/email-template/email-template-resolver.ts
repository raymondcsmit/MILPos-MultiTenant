import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { EmailTemplateService } from './email-template.service';
import { EmailTemplate } from '@core/domain-classes/email-template';
import { Observable } from 'rxjs';

export const EmailTemplateResolver: ResolveFn<EmailTemplate | null> = (route: ActivatedRouteSnapshot) => {
  const emailTemplateService = inject(EmailTemplateService);
  const id = route.paramMap.get('id');
  if (id && id !== 'add') {
    return emailTemplateService.getEmailTemplate(id) as Observable<EmailTemplate>;
  }
  return null;
};
