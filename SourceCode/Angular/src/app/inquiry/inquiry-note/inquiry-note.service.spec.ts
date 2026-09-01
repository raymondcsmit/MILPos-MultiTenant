import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { InquiryNoteService } from './inquiry-note.service';
import { InquiryNote } from '@core/domain-classes/inquiry-note';

describe('InquiryNoteService', () => {
  let service: InquiryNoteService;
  let httpMock: HttpTestingController;

  const note: InquiryNote = { id: 'n1', note: 'call back' } as InquiryNote;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), InquiryNoteService],
    });
    service = TestBed.inject(InquiryNoteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getInquiryNotes GETs inquiryNote/{inquiryId} and emits the list', () => {
    let result: InquiryNote[] | undefined;
    service.getInquiryNotes('q1').subscribe((r) => (result = r));
    const req = expectUrl('GET', 'inquiryNote/q1');
    req.flush([note]);
    expect(result).toEqual([note]);
  });

  it('saveInquiryNote POSTs inquiryNote/ with the body', () => {
    let result: InquiryNote | undefined;
    service.saveInquiryNote(note).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'inquiryNote/');
    expect(req.request.body).toBe(note);
    req.flush(note);
    expect(result).toEqual(note);
  });

  it('updateInquiryNote PUTs inquiryNote/{id} with the body', () => {
    service.updateInquiryNote('n1', note).subscribe();
    const req = expectUrl('PUT', 'inquiryNote/n1');
    expect(req.request.body).toBe(note);
    req.flush(note);
  });

  it('deleteInquiryNote DELETEs inquiryNote/{id}', () => {
    service.deleteInquiryNote('n1').subscribe();
    const req = expectUrl('DELETE', 'inquiryNote/n1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
