import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../core/environment';
import { Group, GroupRequest } from './group.model';

@Injectable({ providedIn: 'root' })
export class GroupsService {
  constructor(private http: HttpClient) {}

  list(query = '') {
    const params = query ? new HttpParams().set('q', query) : undefined;
    return this.http.get<Group[]>(`${environment.apiUrl}/groups`, { params });
  }

  create(request: GroupRequest) {
    return this.http.post<Group>(`${environment.apiUrl}/groups`, request);
  }

  update(id: number, request: GroupRequest) {
    return this.http.put<Group>(`${environment.apiUrl}/groups/${id}`, request);
  }

  delete(id: number) {
    return this.http.delete<void>(`${environment.apiUrl}/groups/${id}`);
  }
}
