import { EventStatus, EventType, Priority } from '../features/events/event.model';
import { GroupType } from '../features/groups/group.model';
import { Person } from '../features/persons/person.model';
import { SocialNeedType, SocialSupportPriority, SocialSupportStatus } from '../features/social-support/social-support.model';

function isEnglish(): boolean {
  return document.documentElement.lang === 'en';
}

export function eventStatusLabel(status: EventStatus): string {
  const labels: Record<EventStatus, string> = {
    PLANNED: isEnglish() ? 'planned' : 'planificat',
    ACTIVE: isEnglish() ? 'active' : 'activ',
    DONE: isEnglish() ? 'completed' : 'finalizat',
    CANCELED: isEnglish() ? 'canceled' : 'anulat'
  };
  return labels[status] || status.toLowerCase();
}

export function eventTypeLabel(type: EventType): string {
  const labels: Partial<Record<EventType, string>> = {
    SERVICE: isEnglish() ? 'service' : 'părtășie',
    MEETING: isEnglish() ? 'meeting' : 'catch up',
    STUDY: isEnglish() ? 'study' : 'studiu',
    FELLOWSHIP: isEnglish() ? 'fellowship' : 'părtășie',
    OTHER: isEnglish() ? 'other' : 'alt tip',
    EVENT: isEnglish() ? 'event' : 'eveniment',
    ACT_DE_CULT: isEnglish() ? 'worship service' : 'act de cult',
    EVANGELISM: isEnglish() ? 'evangelism' : 'evanghelizare',
    FUNERAL: isEnglish() ? 'funeral' : 'înmormântare',
    IT: 'IT',
    MUSIC: isEnglish() ? 'music' : 'muzică',
    ADMINISTRATION: isEnglish() ? 'administration' : 'administrare',
    MAINTENANCE: isEnglish() ? 'maintenance' : 'întreținere',
    SOCIAL_MEDIA_PUBLISHING: isEnglish() ? 'social media publishing' : 'publicare rețele sociale',
    RENOVATION: isEnglish() ? 'renovation' : 'renovare'
  };
  return labels[type] || type.toLowerCase();
}

export function priorityLabel(priority: Priority): string {
  const labels: Record<Priority, string> = {
    LOW: isEnglish() ? 'low' : 'scăzută',
    MEDIUM_LOW: isEnglish() ? 'normal' : 'normală',
    MEDIUM: isEnglish() ? 'high' : 'ridicată',
    HIGH_MEDIUM: isEnglish() ? 'very high' : 'foarte ridicată',
    HIGH: isEnglish() ? 'urgent' : 'urgentă'
  };
  return labels[priority] || priority.toLowerCase();
}

export function groupTypeLabel(type: GroupType): string {
  const labels: Record<GroupType, string> = {
    SMALL_GROUP: isEnglish() ? 'small group' : 'grup mic',
    MINISTRY: isEnglish() ? 'ministry' : 'lucrare',
    TEAM: isEnglish() ? 'team' : 'echipă',
    CLASS: isEnglish() ? 'class' : 'clasă',
    OTHER: isEnglish() ? 'other' : 'alt tip'
  };
  return labels[type] || type.toLowerCase();
}

export function memberTypeLabel(type: Person['memberType']): string {
  const labels: Record<Person['memberType'], string> = {
    MEMBER: isEnglish() ? 'member' : 'membru',
    CHILD: isEnglish() ? 'child' : 'copil',
    ADHERENT: isEnglish() ? 'adherent' : 'apartenent',
    OCCASIONAL_VISITOR: isEnglish() ? 'occasional visitor' : 'vizitator ocazional',
    VISITOR: isEnglish() ? 'visitor' : 'vizitator',
    PASTOR: 'pastor',
    LEADER: isEnglish() ? 'leader' : 'lider'
  };
  return labels[type] || type.toLowerCase();
}

export function socialNeedTypeLabel(type: SocialNeedType): string {
  const labels: Record<SocialNeedType, string> = {
    FINANCIAL: isEnglish() ? 'financial support' : 'sprijin financiar',
    SOCIAL: isEnglish() ? 'social support' : 'sprijin social',
    FOOD: isEnglish() ? 'food' : 'alimente',
    MEDICAL: 'medical',
    HOUSING: isEnglish() ? 'housing' : 'locuire',
    COUNSELING: isEnglish() ? 'counseling' : 'consiliere',
    OTHER: isEnglish() ? 'other need' : 'altă nevoie'
  };
  return labels[type] || type.toLowerCase();
}

export function socialSupportStatusLabel(status: SocialSupportStatus): string {
  const labels: Record<SocialSupportStatus, string> = {
    UNDER_OBSERVATION: isEnglish() ? 'under observation' : 'sub observație',
    ACTIVE_NEED: isEnglish() ? 'active need' : 'nevoie activă',
    SUPPORTED: isEnglish() ? 'supported' : 'sprijin activ',
    RESOLVED: isEnglish() ? 'resolved' : 'rezolvat',
    CLOSED: isEnglish() ? 'closed' : 'închis'
  };
  return labels[status] || status.toLowerCase();
}

export function socialSupportPriorityLabel(priority: SocialSupportPriority): string {
  const labels: Record<SocialSupportPriority, string> = {
    LOW: isEnglish() ? 'low' : 'scăzută',
    MEDIUM: isEnglish() ? 'normal' : 'normală',
    HIGH: isEnglish() ? 'high' : 'ridicată',
    URGENT: isEnglish() ? 'urgent' : 'urgentă'
  };
  return labels[priority] || priority.toLowerCase();
}
