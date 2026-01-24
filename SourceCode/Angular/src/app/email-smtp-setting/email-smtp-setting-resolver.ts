import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { EmailSmtpSettingService } from './email-smtp-setting.service';
import { Observable } from 'rxjs';
import { EmailSMTPSetting } from '@core/domain-classes/email-smtp-setting';

export const EmailSmtpSettingResolver: ResolveFn<EmailSMTPSetting | null> = (route: ActivatedRouteSnapshot) => {
  const emailSmtpSettingService = inject(EmailSmtpSettingService);

  const id = route.paramMap.get('id') ?? '';
  if (id !== null) {
    return emailSmtpSettingService.getEmailSMTPSetting(id) as Observable<EmailSMTPSetting>;
  }
  return null;
};
