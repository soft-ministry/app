import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../core/environment';
import { Person, PersonRequest } from './person.model';

@Injectable({ providedIn: 'root' })
export class PersonsService {
  constructor(private http: HttpClient) {}

  list(query = '') {
    const params = query ? new HttpParams().set('q', query) : undefined;
    return this.http.get<Person[]>(`${environment.apiUrl}/persons`, { params });
  }

  create(request: PersonRequest) {
    return this.http.post<Person>(`${environment.apiUrl}/persons`, request);
  }

  update(id: number, request: PersonRequest) {
    return this.http.put<Person>(`${environment.apiUrl}/persons/${id}`, request);
  }

  uploadStatusPhoto(id: number, file: File) {
    const data = new FormData();
    data.append('file', file);
    return this.http.post<Person>(`${environment.apiUrl}/persons/${id}/status-photo`, data);
  }

  statusPhoto(id: number) {
    return this.http.get(`${environment.apiUrl}/persons/${id}/status-photo`, { responseType: 'blob' });
  }

  delete(id: number) {
    return this.http.delete<void>(`${environment.apiUrl}/persons/${id}`);
  }
}
