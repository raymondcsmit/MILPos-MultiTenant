import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LanguagesService {
  constructor(private httpClient: HttpClient) {}

  getDefaultLanguage(): Observable<any> {
    const url = 'language/default';
    return this.httpClient.get<any>(url);
  }

  getLanguageById(id: string): Observable<any> {
    const url = `language/${id}/`;
    return this.httpClient.get<any>(url);
  }

  getLanguages(): Observable<any[]> {
    const url = 'language';
    return this.httpClient.get<any[]>(url);
  }

  saveLanguages(language: any): Observable<any> {
    const url = 'language';
    return this.httpClient.post(url, language);
  }

  updateLanguages(language: any): Observable<any> {
    const url = 'language/' + language.id;
    return this.httpClient.put(url, language);
  }

  deleteLanguages(id: any): Observable<any> {
    const url = `language/${id}`;
    return this.httpClient.delete(url);
  }
}
