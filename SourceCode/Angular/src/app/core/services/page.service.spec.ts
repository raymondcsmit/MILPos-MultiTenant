import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { PageService } from './page.service';
import { Page } from '@core/domain-classes/page';

describe('PageService', () => {
  let service: PageService;
  let httpMock: HttpTestingController;

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PageService],
    });
    service = TestBed.inject(PageService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAll GETs Pages', () => {
    const body: Page[] = [{ id: 'p1', name: 'Dashboard' } as Page];
    let result: Page[] | undefined;
    service.getAll().subscribe((r) => (result = r));

    const req = expectUrl('GET', 'Pages');
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('getById GETs Page/{id}', () => {
    const body: Page = { id: 'p1', name: 'Dashboard' } as Page;
    let result: Page | undefined;
    service.getById('p1').subscribe((r) => (result = r));

    expectUrl('GET', 'Page/p1').flush(body);
    expect(result).toEqual(body);
  });

  it('delete DELETEs Page/{id}', () => {
    service.delete('p1').subscribe();
    expectUrl('DELETE', 'Page/p1').flush(null);
  });

  it('update PUTs Page/{id} with the page body', () => {
    const page: Page = { id: 'p1', name: 'Dashboard' } as Page;
    service.update('p1', page).subscribe();

    const req = expectUrl('PUT', 'Page/p1');
    expect(req.request.body).toBe(page);
    req.flush(page);
  });

  it('add POSTs Page with the page body', () => {
    const page: Page = { id: 'p1', name: 'Dashboard' } as Page;
    let result: Page | undefined;
    service.add(page).subscribe((r) => (result = r));

    const req = expectUrl('POST', 'Page');
    expect(req.request.body).toBe(page);
    req.flush(page);
    expect(result).toEqual(page);
  });
});