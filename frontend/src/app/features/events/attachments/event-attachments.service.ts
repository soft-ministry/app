import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../core/environment';
import { EventAttachment } from './event-attachment.model';

@Injectable({ providedIn: 'root' })
export class EventAttachmentsService {
  constructor(private http: HttpClient) {}

  list(eventId: number) {
    return this.http.get<EventAttachment[]>(`${environment.apiUrl}/events/${eventId}/attachments`);
  }

  upload(eventId: number, files: File[]) {
    const data = new FormData();
    files.forEach((file) => data.append('files', file));
    return this.http.post<EventAttachment[]>(`${environment.apiUrl}/events/${eventId}/attachments`, data);
  }

  content(eventId: number, attachmentId: number) {
    return this.http.get(`${environment.apiUrl}/events/${eventId}/attachments/${attachmentId}/content`, {
      responseType: 'blob'
    });
  }

  delete(eventId: number, attachmentId: number) {
    return this.http.delete<void>(`${environment.apiUrl}/events/${eventId}/attachments/${attachmentId}`);
  }
}
