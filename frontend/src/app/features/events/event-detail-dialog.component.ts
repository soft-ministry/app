import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { LanguageService } from '../../core/language.service';
import { eventStatusLabel, eventTypeLabel, priorityLabel } from '../../shared/display-labels';
import { EventAttachmentsComponent } from './attachments/event-attachments.component';
import { EventItem } from './event.model';

@Component({
  selector: 'app-event-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatIconModule, EventAttachmentsComponent],
  styles: [`
    :host {
      display: block;
    }

    .detail-shell {
      display: grid;
      gap: 14px;
      width: min(640px, 100%);
      box-sizing: border-box;
    }

    .detail-header {
      display: grid;
      grid-template-columns: 44px minmax(0, 1fr);
      gap: 12px;
      padding: 14px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background:
        linear-gradient(90deg, var(--app-primary-soft), transparent 58%),
        var(--app-surface);
    }

    .detail-icon {
      display: grid;
      width: 44px;
      height: 44px;
      place-items: center;
      border-radius: 8px;
      background: var(--app-primary);
      color: #ffffff;
    }

    .detail-icon mat-icon {
      width: 22px;
      height: 22px;
      font-size: 22px;
      line-height: 22px;
    }

    .detail-heading {
      display: grid;
      gap: 10px;
      min-width: 0;
    }

    .detail-title {
      margin: 0;
      color: var(--app-text);
      font-size: 24px;
      font-weight: 750;
      line-height: 1.18;
    }

    .detail-meta {
      display: flex;
      gap: 7px;
      flex-wrap: wrap;
    }

    .detail-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-height: 25px;
      padding: 2px 9px;
      border: 1px solid var(--app-border);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.82);
      color: var(--app-primary-strong);
      font-size: 12px;
      font-weight: 650;
    }

    .detail-badge mat-icon {
      width: 15px;
      height: 15px;
      font-size: 15px;
      line-height: 15px;
    }

    .detail-badge.info {
      background: #e0ebf5;
      color: var(--app-info);
    }

    .detail-badge.warning {
      background: #f6eadf;
      color: var(--app-accent);
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      padding: 11px 12px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.84);
    }

    .detail-item-icon {
      display: grid;
      flex: 0 0 auto;
      width: 32px;
      height: 32px;
      place-items: center;
      border-radius: 8px;
      background: var(--app-primary-soft);
      color: var(--app-primary-strong);
    }

    .detail-item-icon mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
      line-height: 18px;
    }

    .detail-item-copy {
      display: grid;
      gap: 2px;
      min-width: 0;
    }

    .detail-label {
      color: var(--app-muted);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .detail-value {
      color: var(--app-text);
      font-size: 14px;
      font-weight: 650;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }

    .detail-description {
      display: grid;
      gap: 8px;
      padding: 13px 14px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface-muted);
    }

    .section-title {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: var(--app-muted);
      font-size: 12px;
      font-weight: 750;
      text-transform: uppercase;
    }

    .section-title mat-icon {
      width: 17px;
      height: 17px;
      color: var(--app-primary);
      font-size: 17px;
      line-height: 17px;
    }

    .detail-description p {
      margin: 0;
      color: var(--app-text);
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .dialog-actions {
      padding-top: 4px;
    }

    @media (max-width: 620px) {
      .detail-header {
        grid-template-columns: 1fr;
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
  template: `
    <mat-dialog-content>
      <section class="detail-shell">
        <header class="detail-header">
          <span class="detail-icon">
            <mat-icon>event</mat-icon>
          </span>
          <div class="detail-heading">
            <h2 class="detail-title">{{ event.eventName }}</h2>
            <div class="detail-meta">
              <span class="detail-badge info">
                <mat-icon>task_alt</mat-icon>
                {{ eventStatusLabel(event.status) }}
              </span>
              <span class="detail-badge">
                <mat-icon>category</mat-icon>
                {{ eventTypeLabel(event.eventType) }}
              </span>
              <span class="detail-badge">
                <mat-icon>schedule</mat-icon>
                {{ formatEventTime(event.eventTime) || text('Fără oră', 'No time') }}
              </span>
              <span class="detail-badge warning">
                <mat-icon>flag</mat-icon>
                {{ priorityLabel(event.priority) }}
              </span>
            </div>
          </div>
        </header>

        <div class="detail-grid">
          @if (event.openDate && shouldShowSingleDate()) {
            <div class="detail-item">
              <span class="detail-item-icon"><mat-icon>today</mat-icon></span>
              <span class="detail-item-copy">
                <span class="detail-label">{{ text('Data', 'Date') }}</span>
                <span class="detail-value">{{ event.openDate | date:'dd.MM.yyyy' }}</span>
              </span>
            </div>
          }
          @if (event.eventTime) {
            <div class="detail-item">
              <span class="detail-item-icon"><mat-icon>schedule</mat-icon></span>
              <span class="detail-item-copy">
                <span class="detail-label">{{ text('Ora', 'Time') }}</span>
                <span class="detail-value">{{ formatEventTime(event.eventTime) }}</span>
              </span>
            </div>
          }
          @if (event.openDate && event.endDate && !sameEventDate()) {
            <div class="detail-item">
              <span class="detail-item-icon"><mat-icon>event_available</mat-icon></span>
              <span class="detail-item-copy">
                <span class="detail-label">{{ text('Început', 'Start') }}</span>
                <span class="detail-value">{{ event.openDate | date:'dd.MM.yyyy' }}</span>
              </span>
            </div>
          }
          @if (event.endDate && !shouldShowSingleDate()) {
            <div class="detail-item">
              <span class="detail-item-icon"><mat-icon>event_busy</mat-icon></span>
              <span class="detail-item-copy">
                <span class="detail-label">{{ text('Final', 'End') }}</span>
                <span class="detail-value">{{ event.endDate | date:'dd.MM.yyyy' }}</span>
              </span>
            </div>
          }
          @if (hasText(responsibleNames())) {
            <div class="detail-item">
              <span class="detail-item-icon"><mat-icon>person</mat-icon></span>
              <span class="detail-item-copy">
                <span class="detail-label">{{ text('Responsabili', 'Responsible people') }}</span>
                <span class="detail-value">{{ responsibleNames() }}</span>
              </span>
            </div>
          }
          @if (event.eventType === 'MEETING' && hasText(contactedPersonNames())) {
            <div class="detail-item">
              <span class="detail-item-icon"><mat-icon>person_search</mat-icon></span>
              <span class="detail-item-copy">
                <span class="detail-label">{{ text('Persoane contactate', 'Contacted people') }}</span>
                <span class="detail-value">{{ contactedPersonNames() }}</span>
              </span>
            </div>
          }
          @if (hasText(event.groupName)) {
            <div class="detail-item">
              <span class="detail-item-icon"><mat-icon>diversity_3</mat-icon></span>
              <span class="detail-item-copy">
                <span class="detail-label">{{ text('Grup', 'Group') }}</span>
                <span class="detail-value">{{ event.groupName }}</span>
              </span>
            </div>
          }
        </div>

        @if (hasText(event.about)) {
          <div class="detail-description">
            <span class="section-title">
              <mat-icon>notes</mat-icon>
              {{ text('Descriere', 'Description') }}
            </span>
            <p>{{ event.about }}</p>
          </div>
        }

        <app-event-attachments [eventId]="event.id" [readonly]="true" />
      </section>
    </mat-dialog-content>
    <mat-dialog-actions class="dialog-actions" align="end">
      <button class="toolbar-button toolbar-primary-button" type="button" mat-dialog-close>
        <mat-icon>check</mat-icon>
        {{ text('Închide', 'Close') }}
      </button>
    </mat-dialog-actions>
  `
})
export class EventDetailDialogComponent {
  event = inject<EventItem>(MAT_DIALOG_DATA);
  language = inject(LanguageService);
  eventStatusLabel = eventStatusLabel;
  eventTypeLabel = eventTypeLabel;
  priorityLabel = priorityLabel;
  formatEventTime = formatEventTime;

  text(ro: string, en: string): string {
    return this.language.language() === 'en' ? en : ro;
  }

  hasText(value: string | null | undefined): boolean {
    return !!value?.trim();
  }

  shouldShowSingleDate(): boolean {
    return !!this.event.openDate && (!this.event.endDate || this.sameEventDate());
  }

  sameEventDate(): boolean {
    return !!this.event.openDate && !!this.event.endDate && this.event.openDate === this.event.endDate;
  }

  responsibleNames(): string {
    if (this.event.responsibleNames?.length) {
      return this.event.responsibleNames.join(', ');
    }
    return this.event.implementedByName || '';
  }

  contactedPersonNames(): string {
    if (this.event.contactedPersonNames?.length) {
      return this.event.contactedPersonNames.join(', ');
    }
    return this.event.contactedPersonName || '';
  }
}

function formatEventTime(time?: string | null): string {
  return time ? time.slice(0, 5) : '';
}
