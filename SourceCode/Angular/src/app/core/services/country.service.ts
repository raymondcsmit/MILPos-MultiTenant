import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Country } from '@core/domain-classes/country';
import { filter, Observable, switchMap, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CountryService {

  httpClient = inject(HttpClient);

  getAll(): Observable<Country[]> {
    const url = 'Countries';
    return this.httpClient.get<Country[]>(url);
  }

  getById(id: string): Observable<Country> {
    const url = 'country/' + id;
    return this.httpClient.get<Country>(url);
  }

  delete(id: string): Observable<void> {
    const url = `country/${id}`;
    return this.httpClient.delete<void>(url);
  }

  update(id: string, country: Country): Observable<Country> {
    const url = 'country/' + id;
    return this.httpClient.put<Country>(url, country);
  }

  add(country: Country): Observable<Country> {
    const url = 'Country';
    return this.httpClient.post<Country>(url, country);
  }
}
