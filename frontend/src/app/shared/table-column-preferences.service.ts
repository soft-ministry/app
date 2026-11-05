import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../core/environment';

export interface TableColumnsPreference {
  tableId: string;
  columns: string[];
}

@Injectable({ providedIn: 'root' })
export class TableColumnPreferencesService {
  constructor(private http: HttpClient) {}

  columns(tableId: string) {
    return this.http.get<TableColumnsPreference>(`${environment.apiUrl}/settings/table-preferences/${tableId}/columns`);
  }

  saveColumns(tableId: string, columns: string[]) {
    return this.http.put<TableColumnsPreference>(`${environment.apiUrl}/settings/table-preferences/${tableId}/columns`, { columns });
  }
}
