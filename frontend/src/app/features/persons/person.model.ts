export interface Person {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  churchRole?: string | null;
  position?: string | null;
  description?: string | null;
  publicDescription?: string | null;
  privateDescription?: string | null;
  descriptionPrivate?: boolean;
  descriptionVisible?: boolean;
  memberType: 'MEMBER' | 'CHILD' | 'ADHERENT' | 'OCCASIONAL_VISITOR' | 'VISITOR' | 'PASTOR' | 'LEADER';
  birthDate?: string | null;
  gender?: Gender | null;
  active: boolean;
  status: PersonStatus;
  statusChangedDate?: string | null;
  statusDetails?: string | null;
  statusPhotoAvailable?: boolean;
  statusPhotoFileName?: string | null;
}

export type PersonStatus = 'ACTIVE' | 'INACTIVE' | 'DECEASED' | 'TRANSFERRED' | 'WITHDRAWN';
export type Gender = 'MALE' | 'FEMALE';

export interface PersonRequest {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  churchRole?: string | null;
  position?: string | null;
  description?: string | null;
  publicDescription?: string | null;
  privateDescription?: string | null;
  descriptionPrivate?: boolean;
  birthDate?: string | null;
  memberType: Person['memberType'];
  gender?: Gender | null;
  active: boolean;
  status: PersonStatus;
  statusChangedDate?: string | null;
  statusDetails?: string | null;
}
