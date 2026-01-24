import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TableSetting } from '../domain-classes/table-setting';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TableSettingsService {
  constructor(private httpClient: HttpClient) { }

  getTableSettings(screenName: string): Observable<TableSetting> {
    const url = `tableSettings/${screenName}`;
    return this.httpClient.get<TableSetting>(url);
  }
  saveTableSettings(tableSetting: TableSetting): Observable<TableSetting> {
    const url = `TableSettings`;
    return this.httpClient.post<TableSetting>(url, tableSetting);
  }

}
