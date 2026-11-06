export type FamilyRole = 'HUSBAND' | 'WIFE' | 'FATHER' | 'MOTHER' | 'GRANDFATHER' | 'GRANDMOTHER' | 'CHILD' | 'PARENT' | 'WIDOWED' | 'OTHER';
export type FamilyRelationshipType = 'SPOUSE' | 'PARENT_CHILD' | 'SIBLING';

export interface FamilyMember {
  id: number;
  personId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  role: FamilyRole;
  primaryMember: boolean;
}

export interface FamilyRelationship {
  id: number;
  personAId: number;
  personBId: number;
  personAName: string;
  personBName: string;
  type: FamilyRelationshipType;
}

export interface Family {
  id: number;
  name: string;
  notes?: string | null;
  members: FamilyMember[];
  relationships: FamilyRelationship[];
}

export interface FamilyRequest {
  name: string;
  notes?: string | null;
}

export interface FamilyMemberRequest {
  personId: number;
  role: FamilyRole;
  primaryMember: boolean;
}

export interface FamilyRelationshipRequest {
  personAId: number;
  personBId: number;
  type: FamilyRelationshipType;
}
