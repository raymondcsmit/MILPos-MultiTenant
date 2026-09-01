import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { InquiryTaskService } from './inquiry-task.service';
import { InquiryTask } from '@core/domain-classes/inquiry-task';

describe('InquiryTaskService', () => {
  let service: InquiryTaskService;
  let httpMock: HttpTestingController;

  const task: InquiryTask = { id: 't1', subject: 'follow up' } as InquiryTask;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), InquiryTaskService],
    });
    service = TestBed.inject(InquiryTaskService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getInquiryTasks GETs inquiryActivity/{inquiryId} and emits the list', () => {
    let result: InquiryTask[] | undefined;
    service.getInquiryTasks('q1').subscribe((r) => (result = r));
    const req = expectUrl('GET', 'inquiryActivity/q1');
    req.flush([task]);
    expect(result).toEqual([task]);
  });

  it('saveInquiryActivity POSTs inquiryActivity/ with the body', () => {
    let result: InquiryTask | undefined;
    service.saveInquiryActivity(task).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'inquiryActivity/');
    expect(req.request.body).toBe(task);
    req.flush(task);
    expect(result).toEqual(task);
  });

  it('updateInquiryActivity PUTs inquiryActivity/{id} with the body', () => {
    service.updateInquiryActivity('t1', task).subscribe();
    const req = expectUrl('PUT', 'inquiryActivity/t1');
    expect(req.request.body).toBe(task);
    req.flush(task);
  });

  it('deleteInquiryActivity DELETEs inquiryActivity/{id}', () => {
    service.deleteInquiryActivity('t1').subscribe();
    const req = expectUrl('DELETE', 'inquiryActivity/t1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
