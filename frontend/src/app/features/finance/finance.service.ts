import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../core/environment';
import { FinanceOverview, FinancialTransaction, TransactionRequest } from './finance.model';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  constructor(private http: HttpClient) {}

  overview(query = '') {
    const params = query ? new HttpParams().set('q', query) : undefined;
    return this.http.get<FinanceOverview>(`${environment.apiUrl}/finance`, { params });
  }

  create(request: TransactionRequest) {
    return this.http.post<FinancialTransaction>(`${environment.apiUrl}/finance/transactions`, request);
  }

  update(id: number, request: TransactionRequest) {
    return this.http.put<FinancialTransaction>(`${environment.apiUrl}/finance/transactions/${id}`, request);
  }

  delete(id: number) {
    return this.http.delete<void>(`${environment.apiUrl}/finance/transactions/${id}`);
  }
}
