import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { ActionService } from './action.service';
import { Action } from '@core/domain-classes/action';

describe('ActionService', () => {
  let service: ActionService;
  let httpMock: HttpTestingController;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ActionService],
    });
    service = TestBed.inject(ActionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAll GETs action', () => {
    const body: Action[] = [
      { id: 'a1', name: 'Add', code: 'ADD' },
      { id: 'a2', name: 'Edit', code: 'EDIT' },
    ];
    let result: Action[] | undefined;
    service.getAll().subscribe((r) => (result = r));

    const req = expectUrl('GET', 'action');
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('getById GETs action/{id}', () => {
    const body: Action = { id: 'a1', name: 'Add', code: 'ADD' };
    let result: Action | undefined;
    service.getById('a1').subscribe((r) => (result = r));

    expectUrl('GET', 'action/a1').flush(body);
    expect(result).toEqual(body);
  });

  it('delete DELETEs Action/{id}', () => {
    service.delete('a1').subscribe();
    expectUrl('DELETE', 'Action/a1').flush(null);
  });

  it('updateAction PUTs Action/{id} with the action body', () => {
    const action: Action = { id: 'a1', name: 'Add', code: 'ADD' };
    let result: Action | undefined;
    service.updateAction('a1', action).subscribe((r) => (result = r));

    const req = expectUrl('PUT', 'Action/a1');
    expect(req.request.body).toBe(action);
    req.flush(action);
    expect(result).toEqual(action);
  });

  it('addAction POSTs Action with the action body', () => {
    const action: Action = { name: 'Add', code: 'ADD' };
    service.addAction(action).subscribe();
    const req = expectUrl('POST', 'Action');
    expect(req.request.body).toBe(action);
    req.flush(action);
  });

  it('getActionByPage GETs action then filters by pageId', () => {
    const body: Action[] = [
      { id: 'a1', name: 'Add', code: 'ADD', pageId: 'p1' },
      { id: 'a2', name: 'Edit', code: 'EDIT', pageId: 'p2' },
    ];
    let result: Action[] | undefined;
    service.getActionByPage('p1').subscribe((r) => (result = r));

    const req = expectUrl('GET', 'action');
    req.flush(body);
    expect(result).toEqual([body[0]]);
  });
});