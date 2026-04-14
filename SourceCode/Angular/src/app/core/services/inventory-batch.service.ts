import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InventoryBatch } from '../domain-classes/inventory-batch';

@Injectable({
  providedIn: 'root'
})
export class InventoryBatchService {

  constructor(private http: HttpClient) { }

  getBatches(productId: string): Observable<InventoryBatch[]> {
    return this.http.get<InventoryBatch[]>(`api/InventoryBatch/${productId}`);
  }
}
