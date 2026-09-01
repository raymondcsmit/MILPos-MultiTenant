import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { UnitConversationService } from './unit-conversation.service';
import { UnitConversation } from '@core/domain-classes/unit-conversation';

describe('UnitConversationService', () => {
  let service: UnitConversationService;
  let httpMock: HttpTestingController;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), UnitConversationService],
    });
    service = TestBed.inject(UnitConversationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAll GETs UnitConversations', () => {
    const body: UnitConversation[] = [{ id: 'u1', name: 'Piece' } as UnitConversation];
    let result: UnitConversation[] | undefined;
    service.getAll().subscribe((r) => (result = r));

    const req = expectUrl('GET', 'UnitConversations');
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('getById GETs UnitConversation/{id}', () => {
    const body: UnitConversation = { id: 'u1', name: 'Piece' } as UnitConversation;
    let result: UnitConversation | undefined;
    service.getById('u1').subscribe((r) => (result = r));

    expectUrl('GET', 'UnitConversation/u1').flush(body);
    expect(result).toEqual(body);
  });

  it('delete DELETEs UnitConversation/{id}', () => {
    service.delete('u1').subscribe();
    expectUrl('DELETE', 'UnitConversation/u1').flush(null);
  });

  it('update PUTs UnitConversation/{id} with the unit body', () => {
    const unit: UnitConversation = { id: 'u1', name: 'Piece' } as UnitConversation;
    service.update('u1', unit).subscribe();

    const req = expectUrl('PUT', 'UnitConversation/u1');
    expect(req.request.body).toBe(unit);
    req.flush(unit);
  });

  it('add POSTs UnitConversation with the unit body', () => {
    const unit: UnitConversation = { name: 'Piece' } as UnitConversation;
    let result: UnitConversation | undefined;
    service.add(unit).subscribe((r) => (result = r));

    const req = expectUrl('POST', 'UnitConversation');
    expect(req.request.body).toBe(unit);
    req.flush(unit);
    expect(result).toEqual(unit);
  });
});