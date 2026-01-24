import { Routes } from '@angular/router';
import { ReminderListComponent } from './reminder-list/reminder-list.component';
import { AddReminderComponent } from './add-reminder/add-reminder.component';
import { reminderDetailResolver } from './add-reminder/reminder-detail-resolver';

export const REMINDER_ROUTES: Routes = [
  {
    path: '',
    component: ReminderListComponent,
    data: { claimType: 'VIEW_REMINDERS' }
  }, {
    path: 'add',
    component: AddReminderComponent,
    data: { claimType: 'CREATE_REMINDER' }
  }
  , {
    path: 'manage/:id',
    resolve: { reminder: reminderDetailResolver },
    component: AddReminderComponent,
    data: { claimType: 'EDIT_REMINDER' }
  }
];

