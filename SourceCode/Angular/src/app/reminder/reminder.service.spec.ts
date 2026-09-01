import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

import { ReminderService } from './reminder.service';
import { ReminderResourceParameter } from '@core/domain-classes/reminder-resource-parameter';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { CommonError } from '@core/error-handler/common-error';

describe('ReminderService', () => {
  let service: ReminderService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<CommonHttpErrorService>;

  function makeParams(overrides: Partial<ReminderResourceParameter> = {}): ReminderResourceParameter {
    const p = new ReminderResourceParameter();
    p.fields = '';
    p.orderBy = 'subject asc';
    p.pageSize = 25;
    p.skip = 0;
    p.searchQuery = '';
    p.name = '';
    Object.assign(p, overrides);
    return p;
  }

  beforeEach(() => {
    errorHandler = jasmine.createSpyObj<CommonHttpErrorService>('CommonHttpErrorService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ReminderService,
        { provide: CommonHttpErrorService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(ReminderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getReminders', () => {
    it('GETs reminder/GetReminders with observe response and capitalized params', () => {
      const body = [{ id: 'r1' }];
      let result: any;
      service
        .getReminders(makeParams({ subject: 'Call', message: 'Hi', frequency: 'Daily' }))
        .subscribe((r) => (result = r));
      const req = expectUrl('GET', 'reminder/GetReminders');
      const params = req.request.params;
      expect(params.get('Fields')).toBe('');
      expect(params.get('OrderBy')).toBe('subject asc');
      expect(params.get('PageSize')).toBe('25');
      expect(params.get('Skip')).toBe('0');
      expect(params.get('SearchQuery')).toBe('');
      expect(params.get('subject')).toBe('Call');
      expect(params.get('message')).toBe('Hi');
      expect(params.get('frequency')).toBe('Daily');
      req.flush(body);
      expect(result.body).toEqual(body);
    });

    it('passes empty strings for unset subject/message/frequency', () => {
      service.getReminders(makeParams()).subscribe();
      const req = expectUrl('GET', 'reminder/GetReminders');
      const params = req.request.params;
      expect(params.get('subject')).toBe('');
      expect(params.get('message')).toBe('');
      expect(params.get('frequency')).toBe('');
      req.flush([]);
    });
  });

  describe('CRUD', () => {
    it('addReminder POSTs reminder with the body', () => {
      const reminder = { id: 'r1', subject: 'Call' } as any;
      let result: any;
      service.addReminder(reminder).subscribe((r) => (result = r));
      const req = expectUrl('POST', 'reminder');
      expect(req.request.body).toBe(reminder);
      req.flush(reminder);
      expect(result).toEqual(reminder);
    });

    it('updateReminder PUTs reminder/{id} with the body', () => {
      const reminder = { id: 'r1', subject: 'Call' } as any;
      service.updateReminder(reminder).subscribe();
      const req = expectUrl('PUT', 'reminder/r1');
      expect(req.request.body).toBe(reminder);
      req.flush(reminder);
    });

    it('deleteReminder DELETEs reminder/{id}', () => {
      service.deleteReminder('r1').subscribe();
      const req = expectUrl('DELETE', 'reminder/r1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('error propagation', () => {
    it('propagates CommonError from updateReminder', () => {
      errorHandler.handleError.and.callFake((err: HttpErrorResponse) =>
        throwError(() => ({ statusText: err.statusText, code: err.status } as CommonError))
      );
      let error: any;
      service.updateReminder({ id: 'r1' } as any).subscribe({ error: (e) => (error = e) });
      expectUrl('PUT', 'reminder/r1').flush({ messages: ['nope'] }, { status: 422, statusText: 'Unprocessable Entity' });
      expect(error.code).toBe(422);
      expect(errorHandler.handleError).toHaveBeenCalled();
    });
  });
});
