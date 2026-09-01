import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { NotificationService } from './notification.service';
import { ReminderResourceParameter } from '@core/domain-classes/reminder-resource-parameter';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;

  function makeParams(overrides: Partial<ReminderResourceParameter> = {}): ReminderResourceParameter {
    const p = new ReminderResourceParameter();
    p.fields = '';
    p.orderBy = 'createdDate desc';
    p.pageSize = 25;
    p.skip = 0;
    p.searchQuery = '';
    Object.assign(p, overrides);
    return p;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), NotificationService],
    });
    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getNotifications GETs notification/all with observe response and params', () => {
    const body = [{ id: 'r1' }];
    let result: any;
    service.getNotifications(makeParams()).subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'notification/all');
    expect(req.request.params.get('pageSize')).toBe('25');
    expect(req.request.params.get('skip')).toBe('0');
    expect(req.request.params.get('orderBy')).toBe('createdDate desc');
    req.flush(body);
    expect(result.body).toEqual(body);
  });

  it('markAsReadNotification GETs notification/markasread/{id}', () => {
    let result: boolean | undefined;
    service.markAsReadNotification('r1').subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'notification/markasread/r1');
    req.flush(true);
    expect(result).toBe(true);
  });

  it('markAllAsRead POSTs notification/markAllAsRead with an empty body', () => {
    service.markAllAsRead().subscribe();
    const req = httpMock.expectOne((r) => r.method === 'POST' && r.url === 'notification/markAllAsRead');
    expect(req.request.body).toEqual({});
    req.flush(null);
  });

  it('getUserNotificationCount GETs notification/count', () => {
    let result: number | undefined;
    service.getUserNotificationCount().subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'notification/count');
    req.flush(7);
    expect(result).toBe(7);
  });

  it('getTop10UserNotification GETs notification/top10', () => {
    let result: any[] | undefined;
    service.getTop10UserNotification().subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'notification/top10');
    req.flush([{ id: 'r1' }]);
    expect(result).toEqual([{ id: 'r1' }]);
  });
});
