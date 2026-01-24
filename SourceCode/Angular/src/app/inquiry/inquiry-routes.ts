import { InquiryListComponent } from './inquiry-list/inquiry-list.component';
import { Routes } from '@angular/router';
import { AddInquiryComponent } from './add-inquiry/add-inquiry.component';
import { InquiryDetailResolver } from './add-inquiry/inquiry-detail-resolver';
import { InquiryDetailComponent } from './inquiry-detail/inquiry-detail.component';
import { AuthGuard } from '@core/security/auth.guard';

export const INQUIRY_ROUTES: Routes = [
  {
    path: '',
    component: InquiryListComponent,
    data: { claimType: 'INQ_VIEW_INQUIRIES' },
    canActivate: [AuthGuard]
  }, {
    path: 'add',
    component: AddInquiryComponent,
    data: { claimType: 'INQ_ADD_INQUIRY' },
    canActivate: [AuthGuard]
  },
  {
    path: 'manage/:id',
    component: InquiryDetailComponent,
    resolve: {
      inquiry: InquiryDetailResolver,
    },
    data: { claimType: 'INQ_UPDATE_INQUIRY' },
    canActivate: [AuthGuard]
  }
];


