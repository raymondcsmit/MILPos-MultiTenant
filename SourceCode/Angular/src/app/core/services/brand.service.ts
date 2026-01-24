import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Brand } from '@core/domain-classes/brand';
import { filter, Observable, switchMap, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BrandService {

  httpClient = inject(HttpClient);

  getAll(): Observable<Brand[]> {
    const url = 'Brands';
    return this.httpClient.get<Brand[]>(url);
  }

  getById(id: string): Observable<Brand> {
    const url = 'Brand/' + id;
    return this.httpClient.get<Brand>(url);
  }

  delete(id: string): Observable<void> {
    const url = `Brand/${id}`;
    return this.httpClient.delete<void>(url);
  }

  update(id: string, brand: Brand): Observable<Brand> {
    const url = 'Brand/' + id;
    return this.httpClient.put<Brand>(url, brand);
  }

  add(brand: Brand): Observable<Brand> {
    const url = 'Brand';
    return this.httpClient.post<Brand>(url, brand);
  }
}
