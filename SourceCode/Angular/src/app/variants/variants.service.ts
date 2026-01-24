import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Variant } from '@core/domain-classes/variant';

@Injectable({
  providedIn: 'root',
})
export class VariantService {
  constructor(private http: HttpClient) {}

  getVariants(): Observable<Variant[]> {
    const url = 'variant';
    return this.http.get<Variant[]>(url);
  }

  getVariant(id: string): Observable<Variant> {
    const url = 'variant/' + id;
    return this.http.get<Variant>(url);
  }

  deleteVariant(id: string): Observable<void> {
    const url = `variant/${id}`;
    return this.http.delete<void>(url);
  }

  updateVariant(id: string, variant: Variant): Observable<Variant> {
    const url = 'variant/' + id;
    return this.http.put<Variant>(url, variant);
  }

  saveVariant(variant: Variant): Observable<Variant> {
    const url = 'variant';
    return this.http.post<Variant>(url, variant);
  }
}
