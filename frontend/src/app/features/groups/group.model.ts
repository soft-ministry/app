export interface Group {
  id: number;
  name: string;
  type: GroupType;
  description?: string | null;
  whatsappLink?: string | null;
  leaderId?: number | null;
  leaderName?: string | null;
  memberIds: number[];
  memberCount: number;
}

export type GroupType = 'SMALL_GROUP' | 'MINISTRY' | 'TEAM' | 'CLASS' | 'OTHER';

export interface GroupRequest {
  name: string;
  type: GroupType;
  description?: string | null;
  whatsappLink?: string | null;
  leaderId?: number | null;
  memberIds: number[];
}
