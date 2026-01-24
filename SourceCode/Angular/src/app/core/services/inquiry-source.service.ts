import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { InquirySource } from '@core/domain-classes/inquiry-source';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class InquirySourceService {

  httpClient = inject(HttpClient);

  getAll(): Observable<InquirySource[]> {
    const url = 'InquirySources';
    return this.httpClient.get<InquirySource[]>(url);
  }

  getById(id: string): Observable<InquirySource> {
    const url = 'InquirySource/' + id;
    return this.httpClient.get<InquirySource>(url);
  }

  delete(id: string): Observable<void> {
    const url = `InquirySource/${id}`;
    return this.httpClient.delete<void>(url);
  }

  update(id: string, inquirySource: InquirySource): Observable<InquirySource> {
    const url = 'InquirySource/' + id;
    return this.httpClient.put<InquirySource>(url, inquirySource);
  }

  add(inquirySource: InquirySource): Observable<InquirySource> {
    const url = 'InquirySource';
    return this.httpClient.post<InquirySource>(url, inquirySource);
  }
}
