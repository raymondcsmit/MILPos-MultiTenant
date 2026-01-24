import { Routes } from '@angular/router';
import { AuthGuard } from '@core/security/auth.guard';
import { EmailTemplateListComponent } from './email-template-list/email-template-list.component';
import { EmailTemplateManageComponent } from './email-template-manage/email-template-manage.component';
import { EmailTemplateResolver } from './email-template-resolver';

export const EMAIL_TEMPLATE_ROUTES: Routes = [
  {
    path: '',
    component: EmailTemplateListComponent,
    data: { claimType: 'EMAIL_MANAGE_EMAIL_TEMPLATES' },
    canActivate: [AuthGuard]
  },
  {
    path: ':id',
    component: EmailTemplateManageComponent,
    resolve: { emailTemplate: EmailTemplateResolver },
    data: { claimType: ['EMAIL_MANAGE_EMAIL_TEMPLATES'] },
    canActivate: [AuthGuard]
  }
];


