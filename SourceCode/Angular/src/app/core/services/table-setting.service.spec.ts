import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { TableSettingsService } from './table-setting.service';
import { TableSetting } from '@core/domain-classes/table-setting';

describe('TableSettingsService', () => {
  let service: TableSettingsService;
  let httpMock: HttpTestingController;

  const setting: TableSetting = { id: 1, screenName: 'SalesOrder', settings: [] };

  function expectUrl(method: string, url: string) {
    return httpMock.expectOne((r) => r.method === method && r.url === url);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), TableSettingsService],
    });
    service = TestBed.inject(TableSettingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getTableSettings GETs tableSettings/{screenName}', () => {
    let result: TableSetting | undefined;
    service.getTableSettings('SalesOrder').subscribe((r) => (result = r));
    const req = expectUrl('GET', 'tableSettings/SalesOrder');
    req.flush(setting);
    expect(result).toEqual(setting);
  });

  it('saveTableSettings POSTs TableSettings with the body', () => {
    let result: TableSetting | undefined;
    service.saveTableSettings(setting).subscribe((r) => (result = r));
    const req = expectUrl('POST', 'TableSettings');
    expect(req.request.body).toBe(setting);
    req.flush(setting);
    expect(result).toEqual(setting);
  });
});
