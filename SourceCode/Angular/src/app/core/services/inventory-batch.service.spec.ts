import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { InventoryBatchService } from './inventory-batch.service';
import { InventoryBatch } from '@core/domain-classes/inventory-batch';

describe('InventoryBatchService', () => {
  let service: InventoryBatchService;
  let httpMock: HttpTestingController;

  const batches: InventoryBatch[] = [
    { id: 'b1', productId: 'p1', batchNumber: 'BATCH-1', quantity: 10 } as InventoryBatch,
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), InventoryBatchService],
    });
    service = TestBed.inject(InventoryBatchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getBatches GETs api/InventoryBatch/{productId} and emits the list', () => {
    let result: InventoryBatch[] | undefined;
    service.getBatches('p1').subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === 'api/InventoryBatch/p1');
    req.flush(batches);
    expect(result).toEqual(batches);
  });
});
