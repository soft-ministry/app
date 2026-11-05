import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../core/environment';
import { AttendanceSaveRequest, AttendanceSession, AttendanceSheet, AttendanceSummary, AttendanceUpdateRequest } from './attendance.model';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  constructor(private http: HttpClient) {}

  sessions() {
    return this.http.get<AttendanceSummary[]>(`${environment.apiUrl}/attendance/sessions`);
  }

  sheet(date: string, session: AttendanceSession, groupId?: number | null) {
    let params = new HttpParams().set('date', date).set('session', session);
    if (groupId) {
      params = params.set('groupId', groupId);
    }
    return this.http.get<AttendanceSheet>(`${environment.apiUrl}/attendance/sheet`, { params });
  }

  save(request: AttendanceSaveRequest) {
    return this.http.post<AttendanceSheet>(`${environment.apiUrl}/attendance`, request);
  }

  update(request: AttendanceUpdateRequest) {
    return this.http.put<AttendanceSheet>(`${environment.apiUrl}/attendance`, request);
  }

  delete(date: string, session: AttendanceSession) {
    const params = new HttpParams().set('date', date).set('session', session);
    return this.http.delete<void>(`${environment.apiUrl}/attendance`, { params });
  }
}
