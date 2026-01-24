import { inject, Injectable } from '@angular/core';
import { InquiryStatus } from '@core/domain-classes/inquiry-status';
import { filter, Observable, switchMap, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class InquiryStatusService {

  httpClient = inject(HttpClient);

  getAll(): Observable<InquiryStatus[]> {
    const url = 'InquiryStatuses';
    return this.httpClient.get<InquiryStatus[]>(url);
  }

  getById(id: string): Observable<InquiryStatus> {
    const url = 'InquiryStatus/' + id;
    return this.httpClient.get<InquiryStatus>(url);
  }

  delete(id: string): Observable<void> {
    const url = `InquiryStatus/${id}`;
    return this.httpClient.delete<void>(url);
  }

  update(id: string, inquiryStatus: InquiryStatus): Observable<InquiryStatus> {
    const url = 'InquiryStatus/' + id;
    return this.httpClient.put<InquiryStatus>(url, inquiryStatus);
  }

  add(inquiryStatus: InquiryStatus): Observable<InquiryStatus> {
    const url = 'InquiryStatus';
    return this.httpClient.post<InquiryStatus>(url, inquiryStatus);
  }
}
