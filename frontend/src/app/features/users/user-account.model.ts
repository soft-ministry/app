export interface UserAccount {
  id: number;
  username: string;
  role: UserRole;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'ADMIN' | 'USER';

export interface UserAccountRequest {
  username: string;
  password?: string | null;
  role: UserRole;
  enabled: boolean;
}
