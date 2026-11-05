import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../core/environment';
import { Family, FamilyMemberRequest, FamilyRelationshipRequest, FamilyRequest } from './family.model';

@Injectable({ providedIn: 'root' })
export class FamiliesService {
  constructor(private http: HttpClient) {}

  list() {
    return this.http.get<Family[]>(`${environment.apiUrl}/families`);
  }

  create(request: FamilyRequest) {
    return this.http.post<Family>(`${environment.apiUrl}/families`, request);
  }

  update(id: number, request: FamilyRequest) {
    return this.http.put<Family>(`${environment.apiUrl}/families/${id}`, request);
  }

  delete(id: number) {
    return this.http.delete<void>(`${environment.apiUrl}/families/${id}`);
  }

  addMember(familyId: number, request: FamilyMemberRequest) {
    return this.http.post<Family>(`${environment.apiUrl}/families/${familyId}/members`, request);
  }

  updateMember(familyId: number, memberId: number, request: FamilyMemberRequest) {
    return this.http.put<Family>(`${environment.apiUrl}/families/${familyId}/members/${memberId}`, request);
  }

  removeMember(familyId: number, memberId: number) {
    return this.http.delete<Family>(`${environment.apiUrl}/families/${familyId}/members/${memberId}`);
  }

  addRelationship(familyId: number, request: FamilyRelationshipRequest) {
    return this.http.post<Family>(`${environment.apiUrl}/families/${familyId}/relationships`, request);
  }

  deleteRelationship(familyId: number, relationshipId: number) {
    return this.http.delete<Family>(`${environment.apiUrl}/families/${familyId}/relationships/${relationshipId}`);
  }
}
