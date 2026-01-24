import { inject, Injectable } from '@angular/core';
import { Action } from '@core/domain-classes/action';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ActionService {
  httpClient = inject(HttpClient)

  getAll(): Observable<Action[]> {
    const url = 'action';
    return this.httpClient.get<Action[]>(url);
  }

  getById(id: string): Observable<Action> {
    const url = 'action/' + id;
    return this.httpClient.get<Action>(url);
  }

  delete(id: string): Observable<void> {
    const url = `Action/${id}`;
    return this.httpClient.delete<void>(url);
  }

  updateAction(id: string, action: Action): Observable<Action> {
    const url = 'Action/' + id;
    return this.httpClient.put<Action>(url, action);
  }

  addAction(action: Action): Observable<Action> {
    const url = 'Action';
    return this.httpClient.post<Action>(url, action);
  }

  getActionByPage(id: string) {
    return this.getAll().pipe(
      map(response => {
        return response.filter(c => c.pageId == id);
      })
    )
  }

}
