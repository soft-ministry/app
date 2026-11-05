import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../core/environment';
import { UserAccount, UserAccountRequest } from './user-account.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private http: HttpClient) {}

  list() {
    return this.http.get<UserAccount[]>(`${environment.apiUrl}/users`);
  }

  create(request: UserAccountRequest) {
    return this.http.post<UserAccount>(`${environment.apiUrl}/users`, request);
  }

  update(id: number, request: UserAccountRequest) {
    return this.http.put<UserAccount>(`${environment.apiUrl}/users/${id}`, request);
  }
}
