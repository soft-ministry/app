export type SocialNeedType = 'FINANCIAL' | 'SOCIAL' | 'FOOD' | 'MEDICAL' | 'HOUSING' | 'COUNSELING' | 'OTHER';
export type SocialSupportStatus = 'UNDER_OBSERVATION' | 'ACTIVE_NEED' | 'SUPPORTED' | 'RESOLVED' | 'CLOSED';
export type SocialSupportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface SocialSupportCase {
  id: number;
  churchId: number;
  personId: number;
  personName: string;
  assignedToId?: number | null;
  assignedToName?: string | null;
  needType: SocialNeedType;
  status: SocialSupportStatus;
  priority: SocialSupportPriority;
  summary: string;
  privateNotes?: string | null;
  estimatedAmount?: number | null;
  approvedAmount?: number | null;
  nextReviewDate?: string | null;
  closedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SocialSupportCaseRequest {
  personId: number;
  assignedToId?: number | null;
  needType: SocialNeedType;
  status: SocialSupportStatus;
  priority: SocialSupportPriority;
  summary: string;
  privateNotes?: string | null;
  estimatedAmount?: number | null;
  approvedAmount?: number | null;
  nextReviewDate?: string | null;
  closedAt?: string | null;
}
