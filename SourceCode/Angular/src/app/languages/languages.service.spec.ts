import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { LanguagesService } from './languages.service';

describe('LanguagesService', () => {
  let service: LanguagesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), LanguagesService],
    });
    service = TestBed.inject(LanguagesService);
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

  it('getDefaultLanguage GETs language/default', () => {
    const language = { id: 'lang1', name: 'English', isDefault: true };
    let result: any;
    service.getDefaultLanguage().subscribe((r) => (result = r));
    const req = expectUrl('GET', 'language/default');
    expect(req.request.method).toBe('GET');
    req.flush(language);
    expect(result).toEqual(language);
  });

  it('getLanguageById GETs language/{id}/ with trailing slash', () => {
    service.getLanguageById('lang1').subscribe();
    const req = expectUrl('GET', 'language/lang1/');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'lang1' });
  });

  it('getLanguages GETs language', () => {
    const body = [{ id: 'lang1', name: 'English' }];
    let result: any;
    service.getLanguages().subscribe((r) => (result = r));
    const req = expectUrl('GET', 'language');
    expect(req.request.method).toBe('GET');
    req.flush(body);
    expect(result).toEqual(body);
  });

  it('saveLanguages POSTs language with the body', () => {
    const language = { id: 'lang1', name: 'English' };
    let result: any;
    service.saveLanguages(language).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'language');
    expect(req.request.body).toBe(language);
    req.flush(language);
    expect(result).toEqual(language);
  });

  it('updateLanguages PUTs language/{id} with the body', () => {
    const language = { id: 'lang1', name: 'English' };
    service.updateLanguages(language).subscribe();
    const req = expectUrl('PUT', 'language/lang1');
    expect(req.request.body).toBe(language);
    req.flush(language);
  });

  it('deleteLanguages DELETEs language/{id}', () => {
    service.deleteLanguages('lang1').subscribe();
    const req = expectUrl('DELETE', 'language/lang1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
