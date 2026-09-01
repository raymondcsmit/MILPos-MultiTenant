import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { ImportExportService, ImportResult } from './import-export.service';

describe('ImportExportService', () => {
  let service: ImportExportService;
  let httpMock: HttpTestingController;

  const file = new File(['sku,price'], 'products.csv', { type: 'text/csv' });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ImportExportService],
    });
    service = TestBed.inject(ImportExportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('file upload', () => {
    it('importData POSTs the file as FormData to importexport/{entityType}/import', () => {
      const body: ImportResult = { success: true, totalRecords: 2, successCount: 2, failureCount: 0, errors: [] };
      let result: ImportResult | undefined;
      service.importData('product', file).subscribe((r) => (result = r));

      const req = httpMock.expectOne('importexport/product/import');
      expect(req.request.method).toBe('POST');
      expect((req.request.body as FormData).get('file')).toBe(file);
      req.flush(body);
      expect(result).toEqual(body);
    });

    it('validateImport POSTs the file as FormData to importexport/{entityType}/validate', () => {
      const body: ImportResult = {
        success: false,
        totalRecords: 1,
        successCount: 0,
        failureCount: 1,
        errors: [{ rowNumber: 1, fieldName: 'price', errorMessage: 'required' }],
      };
      let result: ImportResult | undefined;
      service.validateImport('customer', file).subscribe((r) => (result = r));

      const req = httpMock.expectOne('importexport/customer/validate');
      expect(req.request.method).toBe('POST');
      expect((req.request.body as FormData).get('file')).toBe(file);
      req.flush(body);
      expect(result).toEqual(body);
    });
  });

  describe('downloads', () => {
    it('exportData GETs importexport/{entityType}/export?format=csv as a blob', () => {
      service.exportData('product', 'csv').subscribe();
      const req = httpMock.expectOne('importexport/product/export?format=csv');
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      req.flush(new Blob(['a']));
    });

    it('exportData defaults the format to excel', () => {
      service.exportData('product').subscribe();
      const req = httpMock.expectOne('importexport/product/export?format=excel');
      expect(req.request.responseType).toBe('blob');
      req.flush(new Blob());
    });

    it('downloadTemplate GETs importexport/{entityType}/template?format=excel as a blob', () => {
      service.downloadTemplate('supplier').subscribe();
      const req = httpMock.expectOne('importexport/supplier/template?format=excel');
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      req.flush(new Blob());
    });

    it('downloadTemplate honours a csv format', () => {
      service.downloadTemplate('supplier', 'csv').subscribe();
      httpMock.expectOne('importexport/supplier/template?format=csv').flush(new Blob());
    });
  });

  describe('pure helpers', () => {
    it('getFileExtension lowercases the extension after the last dot', () => {
      expect(service.getFileExtension('Products.XLSX')).toBe('xlsx');
      expect(service.getFileExtension('a.b.csv')).toBe('csv');
      expect(service.getFileExtension('no-extension')).toBe('no-extension');
      expect(service.getFileExtension('trailing.')).toBe('');
    });

    it('isValidFile accepts csv, xlsx and xls and rejects anything else', () => {
      expect(service.isValidFile(new File([''], 'a.csv'))).toBe(true);
      expect(service.isValidFile(new File([''], 'a.xlsx'))).toBe(true);
      expect(service.isValidFile(new File([''], 'a.xls'))).toBe(true);
      expect(service.isValidFile(new File([''], 'a.txt'))).toBe(false);
      expect(service.isValidFile(new File([''], 'a'))).toBe(false);
    });
  });
});