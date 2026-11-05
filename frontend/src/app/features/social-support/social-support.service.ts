import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../core/environment';
import { SocialSupportCase, SocialSupportCaseRequest } from './social-support.model';

@Injectable({ providedIn: 'root' })
export class SocialSupportService {
  constructor(private http: HttpClient) {}

  list(query = '') {
    const params = query ? new HttpParams().set('q', query) : undefined;
    return this.http.get<SocialSupportCase[]>(`${environment.apiUrl}/social-support`, { params });
  }

  create(request: SocialSupportCaseRequest) {
    return this.http.post<SocialSupportCase>(`${environment.apiUrl}/social-support`, request);
  }

  update(id: number, request: SocialSupportCaseRequest) {
    return this.http.put<SocialSupportCase>(`${environment.apiUrl}/social-support/${id}`, request);
  }

  delete(id: number) {
    return this.http.delete<void>(`${environment.apiUrl}/social-support/${id}`);
  }
}
