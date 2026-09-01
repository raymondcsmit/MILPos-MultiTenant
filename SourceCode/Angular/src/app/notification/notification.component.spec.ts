import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

import { NotificationComponent } from './notification.component';
import { NotificationService } from './notification.service';
import { SecurityService } from '@core/security/security.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { ReminderResourceParameter } from '@core/domain-classes/reminder-resource-parameter';

describe('NotificationComponent', () => {
  let component: NotificationComponent;
  let fixture: ComponentFixture<NotificationComponent>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  const reminders = [
    { subject: 'Low stock', message: 'Product A low' },
  ];

  function makeResponse(): HttpResponse<any[]> {
    return new HttpResponse({
      body: reminders,
      headers: new HttpHeaders().set(
        'X-Pagination',
        JSON.stringify({ pageSize: 15, skip: 0, totalCount: 1 })
      ),
    });
  }

  beforeEach(() => {
    notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'markAllAsRead', 'getNotifications',
    ]);
    notificationService.markAllAsRead.and.returnValue(of({} as any));
    notificationService.getNotifications.and.returnValue(of(makeResponse()));

    const securityService = jasmine.createSpyObj<SecurityService>('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    (translationService as any).lanDir$ = of('ltr');

    TestBed.configureTestingModule({
      imports: [NotificationComponent, TranslateModule.forRoot()],
      providers: [
        { provide: NotificationService, useValue: notificationService },
        { provide: SecurityService, useValue: securityService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
      ],
    });
    fixture = TestBed.createComponent(NotificationComponent);
    component = fixture.componentInstance;
  });

  it('should create, mark all as read and load the first page', fakeAsync(() => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(notificationService.markAllAsRead).toHaveBeenCalled();
    const firstCall = notificationService.getNotifications.calls.argsFor(0)[0] as ReminderResourceParameter;
    expect(firstCall.pageSize).toBe(15);
    expect(firstCall.orderBy).toBe('createdDate asc');
    expect(component.reminders.length).toBe(1);
    expect(component.reminderResource.totalCount).toBe(1);
  }));

  it('should reload from the first page with an escaped subject filter after debounce', fakeAsync(() => {
    fixture.detectChanges();
    component.SubjectFilter = 'a b';
    tick(1000);
    const lastCall = notificationService.getNotifications.calls.mostRecent().args[0] as ReminderResourceParameter;
    expect(lastCall.subject).toBe('a%20b');
    expect(lastCall.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);
  }));

  it('should reload with the raw message filter after debounce', fakeAsync(() => {
    fixture.detectChanges();
    component.MessageFilter = 'hello';
    tick(1000);
    const lastCall = notificationService.getNotifications.calls.mostRecent().args[0] as ReminderResourceParameter;
    expect(lastCall.message).toBe('hello');
    expect(lastCall.skip).toBe(0);
  }));

  it('should expose row helpers used by the template', fakeAsync(() => {
    fixture.detectChanges();
    expect(component.isOddDataRow(0)).toBeFalse();
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.getDataIndex(component.reminders[0])).toBe(0);
  }));
});
