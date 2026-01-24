import { inject, Injectable } from '@angular/core';
import { Tax } from '@core/domain-classes/tax';
import { filter, Observable, switchMap, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class TaxService {
  httpClient = inject(HttpClient);

  getAll(): Observable<Tax[]> {
    const url = 'Tax';
    return this.httpClient.get<Tax[]>(url);
  }

  getById(id: string): Observable<Tax> {
    const url = 'Tax/' + id;
    return this.httpClient.get<Tax>(url);
  }

  delete(id: string): Observable<void> {
    const url = `Tax/${id}`;
    return this.httpClient.delete<void>(url);
  }

  update(id: string, tax: Tax): Observable<Tax> {
    const url = 'Tax/' + id;
    return this.httpClient.put<Tax>(url, tax);
  }

  add(tax: Tax): Observable<Tax> {
    const url = 'Tax';
    return this.httpClient.post<Tax>(url, tax);
  }
}
