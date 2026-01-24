import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UnitOperator, unitOperators } from '@core/domain-classes/operator';
import { UnitConversation } from '@core/domain-classes/unit-conversation';
import { filter, Observable, of, switchMap, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UnitConversationService {
  httpClient = inject(HttpClient);

  getAll(): Observable<UnitConversation[]> {
    const url = 'UnitConversations';
    return this.httpClient.get<UnitConversation[]>(url);
  }

  getById(id: string): Observable<UnitConversation> {
    const url = 'UnitConversation/' + id;
    return this.httpClient.get<UnitConversation>(url);
  }

  delete(id: string): Observable<void> {
    const url = `UnitConversation/${id}`;
    return this.httpClient.delete<void>(url);
  }

  update(id: string, unitConversation: UnitConversation): Observable<UnitConversation> {
    const url = 'UnitConversation/' + id;
    return this.httpClient.put<UnitConversation>(url, unitConversation);
  }

  add(unitConversation: UnitConversation): Observable<UnitConversation> {
    const url = 'UnitConversation';
    return this.httpClient.post<UnitConversation>(url, unitConversation);
  }
}
