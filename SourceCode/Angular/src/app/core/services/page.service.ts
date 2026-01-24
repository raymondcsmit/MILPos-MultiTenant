import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Page } from '@core/domain-classes/page';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PageService {
  httpClient = inject(HttpClient);

  getAll(): Observable<Page[]> {
    const url = 'Pages';
    return this.httpClient.get<Page[]>(url);
  }

  getById(id: string): Observable<Page> {
    const url = 'Page/' + id;
    return this.httpClient.get<Page>(url);
  }

  delete(id: string): Observable<void> {
    const url = `Page/${id}`;
    return this.httpClient.delete<void>(url);
  }

  update(id: string, page: Page): Observable<Page> {
    const url = 'Page/' + id;
    return this.httpClient.put<Page>(url, page);
  }

  add(page: Page): Observable<Page> {
    const url = 'Page';
    return this.httpClient.post<Page>(url, page);
  }

}
