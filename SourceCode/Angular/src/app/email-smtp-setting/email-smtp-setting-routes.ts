import { Routes } from '@angular/router';
import { EmailSmtpSettingListComponent } from './email-smtp-setting-list/email-smtp-setting-list.component';
import { AuthGuard } from '@core/security/auth.guard';
import { ManageEmailSmtpSettingComponent } from './manage-email-smtp-setting/manage-email-smtp-setting.component';
import { EmailSmtpSettingResolver } from './email-smtp-setting-resolver';

export const EMAIL_SMTP_SETTING_ROUTES: Routes = [
  {
    path: '',
    component: EmailSmtpSettingListComponent,
    data: { claimType: 'EMAIL_MANAGE_EMAIL_SMTP_SETTINS' },
    canActivate: [AuthGuard]
  }, {
    path: 'manage/:id',
    component: ManageEmailSmtpSettingComponent,
    data: { claimType: 'EMAIL_MANAGE_EMAIL_SMTP_SETTINS' },
    resolve: { smtpSetting: EmailSmtpSettingResolver },
    canActivate: [AuthGuard]
  }, {
    path: 'manage',
    component: ManageEmailSmtpSettingComponent,
    data: { claimType: 'EMAIL_MANAGE_EMAIL_SMTP_SETTINS' },
    canActivate: [AuthGuard]
  },
];


