import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';

import { eventStatusLabel, memberTypeLabel } from '../../shared/display-labels';
import { PageNavComponent } from '../../shared/page-nav.component';
import { EventItem } from '../events/event.model';
import { LanguageService } from '../../core/language.service';
import { EventsService } from '../events/events.service';
import { Group } from '../groups/group.model';
import { GroupsService } from '../groups/groups.service';
import { Person } from '../persons/person.model';
import { PersonsService } from '../persons/persons.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, MatIconModule, PageNavComponent],
  styles: [`
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 22px;
      align-items: stretch;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 11px;
      margin-bottom: 18px;
      padding: 14px;
      border: 1px solid rgba(203, 213, 225, 0.72);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.86);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08), 0 20px 60px rgba(15, 23, 42, 0.12);
    }

    .stat-card {
      display: grid;
      align-content: start;
      gap: 4px;
      min-width: 0;
      border: 1px solid #dbe3ef;
      border-radius: 14px;
      background: #f8fafc;
      padding: 12px;
      color: inherit;
      text-decoration: none;
      transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
    }

    .stat-card:hover {
      border-color: color-mix(in srgb, var(--app-primary) 42%, var(--app-border));
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.11);
      transform: translateY(-1px);
    }

    .stat-card:focus-visible {
      outline: 3px solid color-mix(in srgb, var(--app-primary) 26%, transparent);
      outline-offset: 2px;
    }

    .stat-icon {
      color: #475569;
      line-height: 1;
    }

    .stat-icon mat-icon {
      width: 19px;
      height: 19px;
      font-size: 19px;
    }

    .stat-main {
      display: grid;
      gap: 2px;
      min-width: 0;
    }

    .stat-value {
      display: block;
      color: #0f172a;
      font-size: 25px;
      font-weight: 800;
      line-height: 1.08;
    }

    .stat-label {
      display: block;
      color: #64748b;
      font-size: 12px;
      font-weight: 750;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .quick-actions {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .quick-action {
      justify-content: flex-start;
      min-height: 48px;
    }

    .dashboard-grid > .surface,
    .status-panel {
      height: 100%;
      box-sizing: border-box;
    }

    .dashboard-grid > .surface {
      background: var(--app-bg);
    }

    .list {
      display: grid;
      gap: 10px;
    }

    .list-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 12px 0;
      border-bottom: 1px solid var(--app-border);
    }

    .list-item:last-child {
      border-bottom: 0;
    }

    .item-main {
      display: grid;
      gap: 3px;
      min-width: 0;
    }

    .item-title {
      overflow: hidden;
      font-weight: 650;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-meta {
      color: var(--app-muted);
      font-size: 12px;
    }

    .status-panel {
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: linear-gradient(180deg, #ffffff, #f8fafc);
      padding: 18px;
    }

    .status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--app-border);
    }

    .status-row:last-child {
      border-bottom: 0;
    }

    .next-event {
      display: grid;
      gap: 12px;
      padding: 16px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: #ffffff;
    }

    .next-event-title {
      margin: 0;
      font-size: 18px;
      font-weight: 750;
      line-height: 1.2;
    }

    .next-event-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    @media (max-width: 980px) {
      .dashboard-grid,
      .stats-grid,
      .quick-actions {
        grid-template-columns: 1fr;
      }

      .dashboard-grid {
        align-items: start;
      }

      .dashboard-grid > .surface,
      .status-panel {
        height: auto;
      }
    }
  `],
  template: `
    <main class="page">
      <header class="page-header">
        <div class="page-header-main">
          <h1 class="page-title page-title-offset">{{ language.t('page.dashboard') }}</h1>
          <p class="page-subtitle" aria-hidden="true">&nbsp;</p>
        </div>
        <div class="page-header-actions">
          <app-page-nav />
        </div>
      </header>

      <section class="stats-grid">
        <a class="stat-card" routerLink="/persons" [queryParams]="{ memberType: 'MEMBERS_AND_CHILDREN' }" [attr.aria-label]="reportText('Deschide tabelul de membri și copii', 'Open the members and children table')">
          <span class="stat-icon"><mat-icon>groups</mat-icon></span>
          <span class="stat-main">
            <span class="stat-value">{{ dashboardLoaded() ? memberCount() : '…' }}</span>
            <span class="stat-label">{{ reportText('membri + copii', 'members + children') }}</span>
          </span>
        </a>
        <a class="stat-card" routerLink="/persons" [queryParams]="{ memberType: 'OCCASIONAL_VISITOR' }" [attr.aria-label]="reportText('Deschide tabelul de vizitatori ocazionali', 'Open the occasional visitors table')">
          <span class="stat-icon"><mat-icon>person_search</mat-icon></span>
          <span class="stat-main">
            <span class="stat-value">{{ dashboardLoaded() ? occasionalVisitorCount() : '…' }}</span>
            <span class="stat-label">{{ reportText('vizitatori ocazionali', 'occasional visitors') }}</span>
          </span>
        </a>
        <a class="stat-card" routerLink="/groups" [attr.aria-label]="reportText('Deschide tabelul de grupuri', 'Open the groups table')">
          <span class="stat-icon"><mat-icon>diversity_3</mat-icon></span>
          <span class="stat-main">
            <span class="stat-value">{{ dashboardLoaded() ? groups().length : '…' }}</span>
            <span class="stat-label">{{ reportText('grupuri', 'groups') }}</span>
          </span>
        </a>
        <a class="stat-card" routerLink="/events" [attr.aria-label]="reportText('Deschide tabelul de evenimente', 'Open the events table')">
          <span class="stat-icon"><mat-icon>event</mat-icon></span>
          <span class="stat-main">
            <span class="stat-value">{{ dashboardLoaded() ? events().length : '…' }}</span>
            <span class="stat-label">{{ reportText('evenimente', 'events') }}</span>
          </span>
        </a>
      </section>

      <section class="dashboard-grid">
        <section class="surface">
          <div class="surface-header">
            <div>
              <h2 class="surface-title">{{ reportText('Acțiuni rapide', 'Quick actions') }}</h2>
              <p class="surface-kicker">{{ reportText('Module principale', 'Main modules') }}</p>
            </div>
          </div>
          <div class="surface-content">
            <div class="quick-actions">
              <a class="quick-action toolbar-button toolbar-secondary-button" routerLink="/persons">
                <mat-icon>person_add</mat-icon>
                {{ language.t('table.persons') }}
              </a>
              <a class="quick-action toolbar-button toolbar-secondary-button" routerLink="/groups">
                <mat-icon>group_add</mat-icon>
                {{ language.t('table.groups') }}
              </a>
              <a class="quick-action toolbar-button toolbar-secondary-button" routerLink="/events">
                <mat-icon>add_circle</mat-icon>
                {{ language.t('table.events') }}
              </a>
            </div>
          </div>
        </section>

        <aside class="status-panel">
          <div class="status-row">
            <span class="secondary-text">{{ reportText('Autentificare', 'Authentication') }}</span>
            <span class="badge">{{ reportText('JWT activ', 'JWT active') }}</span>
          </div>
          <div class="status-row">
            <span class="secondary-text">API</span>
            <span class="badge info">{{ reportText('Conectat', 'Connected') }}</span>
          </div>
          <div class="status-row">
            <span class="secondary-text">{{ reportText('Bază locală', 'Local database') }}</span>
            <span class="badge warning">SQLite</span>
          </div>
        </aside>

        <section class="surface">
          <div class="surface-header">
            <div>
              <h2 class="surface-title">{{ reportText('Următorul eveniment', 'Next event') }}</h2>
              <p class="surface-kicker">{{ reportText('Prima activitate planificată', 'First planned activity') }}</p>
            </div>
          </div>
          <div class="surface-content">
            @if (nextEvent(); as event) {
              <div class="next-event">
                <h3 class="next-event-title">{{ event.eventName }}</h3>
                <div class="next-event-meta">
                  <span class="badge info">{{ eventStatusLabel(event.status) }}</span>
                  <span class="badge warning">{{ event.openDate ? (event.openDate | date:'dd.MM.yyyy') : reportText('fără dată', 'no date') }}</span>
                </div>
                <span class="secondary-text">{{ event.groupName || event.implementedByName || reportText('fără grup sau responsabil', 'no group or person responsible') }}</span>
              </div>
            } @else {
              <div class="empty-state">
                <mat-icon>event_available</mat-icon>
                <span>{{ reportText('Nu există evenimente viitoare.', 'There are no upcoming events.') }}</span>
              </div>
            }
          </div>
        </section>

        <section class="surface">
          <div class="surface-header">
            <div>
              <h2 class="surface-title">{{ reportText('Evenimente viitoare', 'Upcoming events') }}</h2>
              <p class="surface-kicker">{{ reportText('Următoarele activități din calendar', 'The next activities in the calendar') }}</p>
            </div>
          </div>
          <div class="surface-content">
            @if (upcomingEvents().length > 0) {
              <div class="list">
                @for (event of upcomingEvents().slice(0, 5); track event.id) {
                  <div class="list-item">
                    <span class="item-main">
                      <span class="item-title">{{ event.eventName }}</span>
                      <span class="item-meta">{{ event.openDate ? (event.openDate | date:'dd.MM.yyyy') : reportText('fără dată', 'no date') }}</span>
                    </span>
                    <span class="badge info">{{ eventStatusLabel(event.status) }}</span>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-state">
                <mat-icon>event_available</mat-icon>
                <span>{{ reportText('Nu există evenimente.', 'There are no events.') }}</span>
              </div>
            }
          </div>
        </section>

        <section class="surface">
          <div class="surface-header">
            <div>
              <h2 class="surface-title">{{ reportText('Persoane recente', 'Recent people') }}</h2>
              <p class="surface-kicker">{{ reportText('Primele profiluri din registru', 'The first profiles in the register') }}</p>
            </div>
          </div>
          <div class="surface-content">
            @if (recentPersons().length > 0) {
              <div class="list">
                @for (person of recentPersons(); track person.id) {
                  <div class="list-item">
                    <span class="item-main">
                      <span class="item-title">{{ person.fullName }}</span>
                      <span class="item-meta">{{ person.phone || person.email || reportText('fără contact', 'no contact') }}</span>
                    </span>
                    <span class="badge">{{ memberTypeLabel(person.memberType) }}</span>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-state">
                <mat-icon>person_add</mat-icon>
                <span>{{ reportText('Nu există persoane.', 'There are no people.') }}</span>
              </div>
            }
          </div>
        </section>
      </section>
    </main>
  `
})
export class DashboardComponent implements OnInit {
  language = inject(LanguageService);
  private personsService = inject(PersonsService);
  private groupsService = inject(GroupsService);
  private eventsService = inject(EventsService);

  persons = signal<Person[]>([]);
  groups = signal<Group[]>([]);
  events = signal<EventItem[]>([]);
  dashboardLoaded = signal(false);

  memberCount(): number {
    return this.persons().filter((person) => person.memberType === 'MEMBER' || person.memberType === 'CHILD').length;
  }

  occasionalVisitorCount(): number {
    return this.persons().filter((person) => person.memberType === 'OCCASIONAL_VISITOR').length;
  }

  upcomingEvents(): EventItem[] {
    const today = toIsoDate(new Date());
    return this.events()
      .filter((event) => event.openDate && event.openDate >= today)
      .sort(compareEventsByDateAndTime);
  }

  nextEvent(): EventItem | null {
    return this.upcomingEvents()[0] || null;
  }

  recentPersons(): Person[] {
    return this.persons().slice(0, 5);
  }

  eventStatusLabel = eventStatusLabel;
  memberTypeLabel = memberTypeLabel;

  reportText(ro: string, en: string): string {
    return this.language.language() === 'en' ? en : ro;
  }

  ngOnInit(): void {
    forkJoin({
      persons: this.personsService.list().pipe(catchError(() => of([] as Person[]))),
      groups: this.groupsService.list().pipe(catchError(() => of([] as Group[]))),
      events: this.eventsService.list().pipe(catchError(() => of([] as EventItem[])))
    }).subscribe(({ persons, groups, events }) => {
      this.persons.set(persons);
      this.groups.set(groups);
      this.events.set(events);
      this.dashboardLoaded.set(true);
    });
  }
}

function compareEventsByDateAndTime(left: EventItem, right: EventItem): number {
  return (left.openDate || '').localeCompare(right.openDate || '')
    || eventTimeOrder(left.eventTime) - eventTimeOrder(right.eventTime)
    || left.eventName.localeCompare(right.eventName);
}

function eventTimeOrder(time?: string | null): number {
  return time ? timeToMinutes(time) : Number.MAX_SAFE_INTEGER;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return Number.MAX_SAFE_INTEGER;
  }
  return hours * 60 + minutes;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
