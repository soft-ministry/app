import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';

import { environment } from '../../core/environment';

export interface DatabaseExportDownload {
  blob: Blob;
  filename: string;
}

export interface DatabaseImportResponse {
  message: string;
  backupPath: string;
  restartRequired: boolean;
}

@Injectable({ providedIn: 'root' })
export class DatabaseExportService {
  constructor(private http: HttpClient) {}

  download() {
    return this.http.get(`${environment.apiUrl}/database/export`, {
      observe: 'response',
      responseType: 'blob'
    }).pipe(map((response) => ({
      blob: response.body || new Blob(),
      filename: this.filenameFromResponse(response)
    })));
  }

  import(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<DatabaseImportResponse>(`${environment.apiUrl}/database/import`, formData);
  }

  private filenameFromResponse(response: HttpResponse<Blob>): string {
    const contentDisposition = response.headers.get('content-disposition') || '';
    const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }
    const quotedMatch = /filename="([^"]+)"/i.exec(contentDisposition);
    if (quotedMatch?.[1]) {
      return quotedMatch[1];
    }
    return `modern-ministry-db-${new Date().toISOString().slice(0, 10)}.sqlite`;
  }
}
