import {  Routes } from '@angular/router';
import { LanguagesListComponent } from './languages-list/languages-list.component';
import { AuthGuard } from '@core/security/auth.guard';
import { ManageLanguageComponent } from './manage-language/manage-language.component';
import { LanguageDetailResolver } from './manage-language/language-detail-resolver';

export const LANGUAGES_ROUTES: Routes = [
  {
    path: '',
    component: LanguagesListComponent,
    canActivate: [AuthGuard],
    data: { claimType: 'SETT_MANAGE_LAN' },
  },
  {
    path: 'add',
    component: ManageLanguageComponent,
    data: { claimType: 'SETT_MANAGE_LAN' },
    canActivate: [AuthGuard],
  },
  {
    path: 'manage/:id',
    component: ManageLanguageComponent,
    resolve: {
      language: LanguageDetailResolver,
    },
    data: { claimType: 'SETT_MANAGE_LAN' },
    canActivate: [AuthGuard],
  },
];


