export interface EventItem {
  id: number;
  eventName: string;
  about?: string | null;
  publicAbout?: string | null;
  privateAbout?: string | null;
  aboutPrivate?: boolean;
  aboutVisible?: boolean;
  openDate?: string | null;
  endDate?: string | null;
  eventTime?: string | null;
  status: EventStatus;
  eventType: EventType;
  priority: Priority;
  recurrenceType: RecurrenceType;
  groupId?: number | null;
  groupName?: string | null;
  implementedById?: number | null;
  implementedByName?: string | null;
  contactedPersonId?: number | null;
  contactedPersonName?: string | null;
  contactedPersonIds?: number[];
  contactedPersonNames?: string[];
  responsibleIds?: number[];
  responsibleNames?: string[];
}

export type EventStatus = 'PLANNED' | 'ACTIVE' | 'DONE' | 'CANCELED';
export type EventType = 'OTHER' | 'SERVICE' | 'MEETING' | 'EVENT' | 'STUDY' | 'ACT_DE_CULT' | 'EVANGELISM' | 'FELLOWSHIP' | 'FUNERAL' | 'IT' | 'MUSIC' | 'ADMINISTRATION' | 'MAINTENANCE' | 'SOCIAL_MEDIA_PUBLISHING' | 'RENOVATION';
export type Priority = 'LOW' | 'MEDIUM_LOW' | 'MEDIUM' | 'HIGH_MEDIUM' | 'HIGH';
export type RecurrenceType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface EventRequest {
  eventName: string;
  about?: string | null;
  publicAbout?: string | null;
  privateAbout?: string | null;
  aboutPrivate?: boolean;
  openDate?: string | null;
  endDate?: string | null;
  eventTime?: string | null;
  status: EventStatus;
  eventType: EventType;
  priority: Priority;
  recurrenceType: RecurrenceType;
  groupId?: number | null;
  implementedById?: number | null;
  contactedPersonId?: number | null;
  contactedPersonIds?: number[];
  responsibleIds?: number[];
}
