import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../core/environment';
import { EventItem, EventRequest } from './event.model';

@Injectable({ providedIn: 'root' })
export class EventsService {
  constructor(private http: HttpClient) {}

  list(query = '') {
    const params = query ? new HttpParams().set('q', query) : undefined;
    return this.http.get<EventItem[]>(`${environment.apiUrl}/events`, { params });
  }

  create(request: EventRequest) {
    return this.http.post<EventItem>(`${environment.apiUrl}/events`, request);
  }

  update(id: number, request: EventRequest) {
    return this.http.put<EventItem>(`${environment.apiUrl}/events/${id}`, request);
  }

  delete(id: number) {
    return this.http.delete<void>(`${environment.apiUrl}/events/${id}`);
  }
}
