import { Component, ElementRef, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { AppearanceThemeService } from '../../core/theme/appearance-theme.service';
import { apiErrorMessage } from '../../shared/api-error-message';
import { exportEventIcs } from '../../shared/ics-export';
import { EventItem, EventRequest } from '../events/event.model';
import { Person } from '../persons/person.model';
import { PersonsService } from '../persons/persons.service';
import { eventStatusLabel } from '../../shared/display-labels';
import { EventDetailDialogComponent } from '../events/event-detail-dialog.component';
import { EventFormDialogComponent } from '../events/event-form-dialog.component';
import { EventsService } from '../events/events.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { ToastService } from '../../shared/toast.service';
import { PageNavComponent } from '../../shared/page-nav.component';

interface CalendarDay {
  date: Date;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  events: EventItem[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [DatePipe, CdkDrag, CdkDropList, MatDialogModule, MatIconModule, MatMenuModule, MatTooltipModule, PageNavComponent],
  styles: [`
    .calendar-page-main {
      width: var(--app-calendar-page-width);
      max-width: var(--app-calendar-page-max-width);
      padding-right: var(--app-calendar-page-padding-x);
      padding-left: var(--app-calendar-page-padding-x);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    .calendar-page-main .page-header-main::after {
      content: "";
      display: block;
      height: 16px;
      margin-top: 6px;
    }

    .calendar-page-main .page-header-actions {
      transform: translateX(var(--app-calendar-header-actions-x));
    }

    .calendar-toolbar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      min-width: 0;
      width: 100%;
    }

    .month-title {
      margin: 0;
      color: var(--app-text);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 1.35rem;
      font-weight: 700;
      text-transform: capitalize;
    }

    .month-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }

    .today-button {
      margin-left: 4px;
    }

    .month-controls .toolbar-secondary-button {
      background: var(--app-bg);
      border-radius: 700px !important;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: none;
    }

    .weekday-grid,
    .month-grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
    }

    .calendar-grid-frame {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 1px;
      overflow: hidden;
      border: 1px solid #d8dee8;
      border-radius: 10px;
      background: #d8dee8;
      box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
    }

    .weekday-grid {
      display: contents;
    }

    .weekday {
      padding: 14px 8px;
      background: #eef2f7;
      color: #6b7280;
      font-size: 14.85px;
      font-weight: 500;
      text-align: center;
    }

    .month-grid {
      display: contents;
    }

    .day-cell {
      min-height: 176px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px;
      border: 0;
      background: #ffffff;
      cursor: pointer;
      scroll-margin: 48px;
      text-align: left;
      transition: background-color 0.15s ease;
    }

    .day-cell:hover {
      background: #f8fbff;
    }

    .day-cell.drag-over {
      background: #dbeafe;
      box-shadow: inset 0 0 0 2px var(--app-primary);
    }

    .day-cell.outside {
      background: #f8fafc;
    }

    .day-cell.outside.drag-over {
      background: #dbeafe;
    }

    .day-cell.selected {
      outline: 2px solid rgba(29, 78, 216, 0.35);
      outline-offset: -2px;
    }

    .day-cell.today .day-number {
      background: var(--app-primary);
      color: #ffffff;
    }

    .day-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .day-event-count {
      display: none;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      border-radius: 999px;
      background: var(--app-primary-soft);
      color: var(--app-primary-strong);
      font-size: 11px;
      font-weight: 800;
      line-height: 1;
    }

    .day-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 999px;
      color: #374151;
      font-size: 15.95px;
    }

    .event-pill-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .event-pill {
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 9px 10px;
      border-left: 4px solid #6366f1;
      border-radius: 12px;
      background: #eef2ff;
      color: var(--app-calendar-event-color);
      font-family: var(--app-calendar-event-font);
      text-decoration: none;
    }

    .event-pill.cdk-drag {
      cursor: grab;
    }

    .event-pill.cdk-drag.cdk-drag-dragging {
      cursor: grabbing;
      opacity: 0.45;
    }

    .event-pill strong {
      display: -webkit-box;
      overflow: hidden;
      color: var(--app-calendar-event-color);
      font-size: calc(var(--app-calendar-event-size) * 1.1);
      font-style: var(--app-calendar-event-style);
      font-weight: var(--app-calendar-event-weight);
      line-height: 1.25;
      white-space: normal;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }

    .event-pill span {
      overflow: hidden;
      color: #6b7280;
      font-size: calc((var(--app-calendar-event-size) * 1.1) - 2px);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .event-pill.multi-day {
      min-height: 52px;
      margin-right: -12px;
      margin-left: -12px;
      border-left-width: 0;
      border-radius: 0;
    }

    .event-pill.multi-day.segment-start {
      margin-left: 0;
      padding-left: 10px;
      border-left-width: 4px;
      border-top-left-radius: 12px;
      border-bottom-left-radius: 12px;
    }

    .event-pill.multi-day.segment-end {
      margin-right: 0;
      border-top-right-radius: 12px;
      border-bottom-right-radius: 12px;
    }

    .event-pill.multi-day.segment-middle strong,
    .event-pill.multi-day.segment-middle span,
    .event-pill.multi-day.segment-end:not(.segment-start) strong,
    .event-pill.multi-day.segment-end:not(.segment-start) span {
      visibility: hidden;
    }

    .event-description {
      display: -webkit-box;
      overflow: hidden;
      color: #6b7280;
      font-size: 11.5px;
      font-style: italic;
      font-weight: 400;
      line-height: 1.25;
      white-space: normal;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .priority-high {
      background: #fee2e2;
      border-left-color: #dc2626;
    }

    .priority-high_medium {
      background: #ffedd5;
      border-left-color: #ea580c;
    }

    .priority-medium {
      background: #fef3c7;
      border-left-color: #d97706;
    }

    .priority-medium_low {
      background: #dcfce7;
      border-left-color: #16a34a;
    }

    .priority-low {
      background: #e0f2fe;
      border-left-color: #0284c7;
    }

    .event-status-planned {
      background: color-mix(in srgb, var(--app-event-status-planned) 14%, #ffffff);
      border-left-color: var(--app-event-status-planned);
    }

    .event-status-active {
      background: color-mix(in srgb, var(--app-event-status-active) 14%, #ffffff);
      border-left-color: var(--app-event-status-active);
    }

    .event-status-done {
      background: color-mix(in srgb, var(--app-event-status-done) 16%, #ffffff);
      border-left-color: var(--app-event-status-done);
    }

    .event-status-canceled {
      background: color-mix(in srgb, var(--app-event-status-canceled) 13%, #ffffff);
      border-left-color: var(--app-event-status-canceled);
    }

    .event-type-other {
      background: color-mix(in srgb, var(--app-event-type-other) 14%, #ffffff);
      border-left-color: var(--app-event-type-other);
    }

    .event-type-service {
      background: color-mix(in srgb, var(--app-event-type-service) 14%, #ffffff);
      border-left-color: var(--app-event-type-service);
    }

    .event-type-meeting {
      background: color-mix(in srgb, var(--app-event-type-meeting) 14%, #ffffff);
      border-left-color: var(--app-event-type-meeting);
    }

    .event-type-event {
      background: color-mix(in srgb, var(--app-event-type-event) 14%, #ffffff);
      border-left-color: var(--app-event-type-event);
    }

    .event-type-study {
      background: color-mix(in srgb, var(--app-event-type-study) 14%, #ffffff);
      border-left-color: var(--app-event-type-study);
    }

    .event-type-act-de-cult {
      background: color-mix(in srgb, var(--app-event-type-act-de-cult) 14%, #ffffff);
      border-left-color: var(--app-event-type-act-de-cult);
    }

    .event-type-evangelism {
      background: color-mix(in srgb, var(--app-event-type-evangelism) 14%, #ffffff);
      border-left-color: var(--app-event-type-evangelism);
    }

    .event-type-fellowship {
      background: color-mix(in srgb, var(--app-event-type-fellowship) 14%, #ffffff);
      border-left-color: var(--app-event-type-fellowship);
    }

    .event-type-funeral {
      background: color-mix(in srgb, var(--app-event-type-funeral) 14%, #ffffff);
      border-left-color: var(--app-event-type-funeral);
    }

    .event-type-it {
      background: color-mix(in srgb, var(--app-event-type-it) 14%, #ffffff);
      border-left-color: var(--app-event-type-it);
    }

    .event-type-music {
      background: color-mix(in srgb, var(--app-event-type-music) 14%, #ffffff);
      border-left-color: var(--app-event-type-music);
    }

    .event-type-administration {
      background: color-mix(in srgb, var(--app-event-type-administration) 14%, #ffffff);
      border-left-color: var(--app-event-type-administration);
    }

    .event-type-maintenance {
      background: color-mix(in srgb, var(--app-event-type-maintenance) 14%, #ffffff);
      border-left-color: var(--app-event-type-maintenance);
    }

    .event-type-social-media-publishing {
      background: color-mix(in srgb, var(--app-event-type-social-media-publishing) 14%, #ffffff);
      border-left-color: var(--app-event-type-social-media-publishing);
    }

    .event-type-renovation {
      background: color-mix(in srgb, var(--app-event-type-renovation) 14%, #ffffff);
      border-left-color: var(--app-event-type-renovation);
    }

    .more-events {
      color: var(--app-muted);
      font-size: 11.5px;
      font-weight: 650;
    }

    .context-anchor {
      position: fixed;
      width: 0;
      height: 0;
      padding: 0;
      border: 0;
      outline: 0;
      opacity: 0;
      overflow: hidden;
      appearance: none;
      background: transparent;
      pointer-events: none;
    }

    .mobile-day-agenda {
      display: none;
    }

    @media (max-width: 980px) {
      .calendar-page-main .page-header-actions {
        transform: none;
      }

      .day-cell {
        min-height: 143px;
      }
    }

    @media (max-width: 900px) {
      .calendar-page-main {
        padding-right: var(--app-calendar-page-tablet-padding-x);
        padding-left: var(--app-calendar-page-tablet-padding-x);
      }
    }

    @media (max-width: 680px) {
      .calendar-page-main .page-header {
        align-items: stretch;
        gap: 10px;
      }

      .calendar-page-main .page-header-actions {
        justify-content: flex-start;
      }

      .table-surface {
        border-radius: 8px;
      }

      .table-surface-header {
        align-items: stretch;
      }

      .calendar-toolbar,
      .month-controls {
        align-items: stretch;
        justify-content: center;
        width: 100%;
      }

      .month-controls {
        display: grid;
        grid-template-columns: 42px minmax(0, 1fr) 42px 64px;
        gap: 7px;
      }

      .month-title {
        align-self: center;
        overflow: hidden;
        font-size: 1.05rem;
        text-align: center;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .month-controls .toolbar-button {
        min-width: 0;
        padding: 0;
      }

      .weekday {
        padding-inline: 2px;
        font-size: 11px;
      }

      .day-cell {
        min-height: 92px;
        padding: 6px;
      }

      .day-head {
        align-items: start;
      }

      .day-number {
        width: 28px;
        height: 28px;
        font-size: 13px;
      }

      .day-event-count {
        display: inline-flex;
      }

      .event-pill {
        display: none;
      }

      .more-events {
        display: none;
      }

      .mobile-day-agenda {
        display: grid;
        gap: 10px;
        margin-top: 12px;
      }

      .mobile-day-agenda-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .mobile-day-agenda-title {
        margin: 0;
        color: var(--app-text);
        font-size: 15px;
        font-weight: 800;
      }

      .mobile-day-agenda-list {
        display: grid;
        gap: 8px;
      }

      .mobile-event-card {
        display: grid;
        gap: 6px;
        padding: 11px 12px;
        border: 1px solid var(--app-border);
        border-left: 4px solid var(--app-primary);
        border-radius: 8px;
        background: var(--app-surface);
        color: var(--app-text);
        text-align: left;
      }

      .mobile-event-card strong {
        overflow: hidden;
        font-size: 14px;
        font-weight: 800;
        line-height: 1.25;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .mobile-event-card span {
        overflow: hidden;
        color: var(--app-muted);
        font-size: 12px;
        font-weight: 650;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    @media (max-width: 640px) {
      .calendar-page-main {
        padding-right: var(--app-calendar-page-mobile-padding-x);
        padding-left: var(--app-calendar-page-mobile-padding-x);
      }
    }

  `],
  template: `
    <main class="page calendar-page-main">
      <header class="page-header">
        <div class="page-header-main">
          <h1 class="page-title page-title-offset">{{ language.t('page.calendar') }}</h1>
        </div>
        <div class="page-header-actions">
          <app-page-nav />
        </div>
      </header>

      <section class="surface table-surface">
        <div class="surface-header table-surface-header">
          <div class="calendar-toolbar">
          <div class="month-controls">
            <button class="toolbar-button toolbar-secondary-button" type="button" [attr.aria-label]="language.t('calendar.previousMonth')" [title]="language.t('calendar.previousMonth')" (click)="previousMonth()">
              &lt;
            </button>
            <h2 class="month-title">{{ visibleMonth() | date:'MMMM yyyy':'':(language.language() === 'en' ? 'en-US' : 'ro') }}</h2>
            <button class="toolbar-button toolbar-secondary-button" type="button" [attr.aria-label]="language.t('calendar.nextMonth')" [title]="language.t('calendar.nextMonth')" (click)="nextMonth()">
              &gt;
            </button>
            <button class="today-button toolbar-button toolbar-primary-button" type="button" (click)="goToday()">{{ language.t('calendar.today') }}</button>
          </div>
          </div>
        </div>

        <div class="surface-content table-surface-content">
          <div class="calendar-grid-frame">
          <div class="weekday-grid">
            @for (day of weekdays; track day) {
              <div class="weekday">{{ day }}</div>
            }
          </div>

          <div class="month-grid">
            @for (day of calendarDays(); track day.iso) {
              <button
                class="day-cell"
                type="button"
                [attr.data-calendar-date]="day.iso"
                [class.outside]="!day.inMonth"
                [class.today]="day.isToday"
                [class.selected]="day.iso === selectedDate()"
                [class.drag-over]="dropTargetDate() === day.iso"
                [id]="calendarDayDropListId(day.iso)"
                cdkDropList
                [cdkDropListData]="day.events"
                [cdkDropListConnectedTo]="calendarDropListIds()"
                [cdkDropListDisabled]="!auth.isAdmin()"
                [cdkDropListSortingDisabled]="true"
                (click)="selectDate(day.iso)"
                (cdkDropListEntered)="setDropTarget(day.iso)"
                (cdkDropListExited)="clearDropTarget(day.iso)"
                (cdkDropListDropped)="dropEvent($event, day.iso)">
                <span class="day-head">
                  @if (day.events.length > 0) {
                    <span class="day-event-count">{{ day.events.length }}</span>
                  } @else {
                    <span></span>
                  }
                  <span class="day-number">{{ day.date | date:'d' }}</span>
                </span>
                @if (day.events.length > 0) {
                  <span class="event-pill-list">
                    @for (event of day.events.slice(0, 4); track event.id) {
                      <span
                        class="event-pill"
                        cdkDrag
                        [cdkDragData]="event"
                        [cdkDragDisabled]="!auth.isAdmin() || isBirthdayEvent(event)"
                        [class.dragging]="draggingEvent() === event"
                        (cdkDragStarted)="startEventDrag(event)"
                        (cdkDragEnded)="endEventDrag()"
                        (click)="openViewDialog(event, $event)"
                        (contextmenu)="openEventMenu($event, event)"
                        [class.priority-high]="event.priority === 'HIGH'"
                        [class.priority-high_medium]="event.priority === 'HIGH_MEDIUM'"
                        [class.priority-medium]="event.priority === 'MEDIUM'"
                        [class.priority-medium_low]="event.priority === 'MEDIUM_LOW'"
                        [class.priority-low]="event.priority === 'LOW'"
                        [class.event-status-planned]="colorCalendarByStatus() && event.status === 'PLANNED'"
                        [class.event-status-active]="colorCalendarByStatus() && event.status === 'ACTIVE'"
                        [class.event-status-done]="colorCalendarByStatus() && event.status === 'DONE'"
                        [class.event-status-canceled]="colorCalendarByStatus() && event.status === 'CANCELED'"
                        [class.event-type-other]="colorCalendarByType() && event.eventType === 'OTHER'"
                        [class.event-type-service]="colorCalendarByType() && event.eventType === 'SERVICE'"
                        [class.event-type-meeting]="colorCalendarByType() && event.eventType === 'MEETING'"
                        [class.event-type-event]="colorCalendarByType() && event.eventType === 'EVENT'"
                        [class.event-type-study]="colorCalendarByType() && event.eventType === 'STUDY'"
                        [class.event-type-act-de-cult]="colorCalendarByType() && event.eventType === 'ACT_DE_CULT'"
                        [class.event-type-evangelism]="colorCalendarByType() && event.eventType === 'EVANGELISM'"
                        [class.event-type-fellowship]="colorCalendarByType() && event.eventType === 'FELLOWSHIP'"
                        [class.event-type-funeral]="colorCalendarByType() && event.eventType === 'FUNERAL'"
                        [class.event-type-it]="colorCalendarByType() && event.eventType === 'IT'"
                        [class.event-type-music]="colorCalendarByType() && event.eventType === 'MUSIC'"
                        [class.event-type-administration]="colorCalendarByType() && event.eventType === 'ADMINISTRATION'"
                        [class.event-type-maintenance]="colorCalendarByType() && event.eventType === 'MAINTENANCE'"
                        [class.event-type-social-media-publishing]="colorCalendarByType() && event.eventType === 'SOCIAL_MEDIA_PUBLISHING'"
                        [class.event-type-renovation]="colorCalendarByType() && event.eventType === 'RENOVATION'"
                        [class.multi-day]="isMultiDayEvent(event)"
                        [class.segment-start]="isEventSegmentStart(event, day.iso)"
                        [class.segment-middle]="isEventSegmentMiddle(event, day.iso)"
                        [class.segment-end]="isEventSegmentEnd(event, day.iso)">
                        <strong>{{ event.eventName }}</strong>
                        @if (eventPillMeta(event)) {
                          <span>{{ eventPillMeta(event) }}</span>
                        }
                      </span>
                    }
                    @if (day.events.length > 4) {
                      <span class="more-events">+{{ day.events.length - 4 }} {{ language.t('common.moreEvents') }}</span>
                    }
                  </span>
                }
              </button>
            }
          </div>
        </div>
          <section class="mobile-day-agenda" [attr.aria-label]="language.t('calendar.selectedDay')">
            <div class="mobile-day-agenda-header">
              <h2 class="mobile-day-agenda-title">{{ selectedDateLabel() }}</h2>
              <button
                class="toolbar-button toolbar-primary-button"
                type="button"
                [disabled]="!auth.isAdmin()"
                (click)="openSelectedDateCreate()">
                <mat-icon>add</mat-icon>
                {{ language.t('common.add') }}
              </button>
            </div>
            @if (selectedDayEvents().length > 0) {
              <div class="mobile-day-agenda-list">
                @for (event of selectedDayEvents(); track event.id) {
                  <button class="mobile-event-card" type="button" (click)="openViewDialog(event, $event)" (contextmenu)="openEventMenu($event, event)">
                    <strong>{{ event.eventName }}</strong>
                    <span>{{ mobileEventMeta(event) }}</span>
                  </button>
                }
              </div>
            } @else {
              <div class="empty-state">
                <mat-icon>event_available</mat-icon>
                <span>{{ language.t('calendar.noSelectedDayEvents') }}</span>
              </div>
            }
          </section>
        </div>
      </section>

      <button
        class="context-anchor"
        type="button"
        [style.left.px]="menuPosition().x"
        [style.top.px]="menuPosition().y"
        [matMenuTriggerFor]="eventMenu"
        aria-hidden="true"
        tabindex="-1">
      </button>
      <mat-menu #eventMenu="matMenu" panelClass="event-context-menu" xPosition="after" yPosition="below">
        <div class="context-menu-list" (click)="$event.stopPropagation()">
          <button class="context-menu-action" type="button" (click)="viewSelectedEvent()">
            <mat-icon>visibility</mat-icon>
            <span>{{ language.t('common.view') }}</span>
          </button>
          <button class="context-menu-action" type="button" (click)="downloadSelectedEvent()">
            <mat-icon>calendar_month</mat-icon>
            <span>{{ language.t('common.download') }}</span>
          </button>
          <button class="context-menu-action" type="button" [disabled]="!auth.isAdmin()" (click)="editSelectedEvent()">
            <mat-icon>edit</mat-icon>
            <span>{{ language.t('common.edit') }}</span>
          </button>
          <div class="context-menu-separator" role="separator"></div>
          <button class="context-menu-action danger-menu-item" type="button" [disabled]="!auth.isAdmin()" (click)="deleteSelectedEvent()">
            <mat-icon>delete</mat-icon>
            <span>{{ language.t('common.delete') }}</span>
          </button>
        </div>
      </mat-menu>
    </main>
  `
})
export class CalendarComponent implements OnInit {
  @ViewChild(MatMenuTrigger) private menuTrigger?: MatMenuTrigger;

  private eventsService = inject(EventsService);
  private personsService = inject(PersonsService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  private elementRef = inject(ElementRef<HTMLElement>);
  private themeService = inject(AppearanceThemeService);
  auth = inject(AuthService);
  language = inject(LanguageService);

  weekdays = this.language.language() === 'en'
    ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    : ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
  events = signal<EventItem[]>([]);
  people = signal<Person[]>([]);
  visibleMonth = signal(startOfMonth(new Date()));
  selectedDate = signal(toIsoDate(new Date()));
  selectedEvent = signal<EventItem | null>(null);
  draggingEvent = signal<EventItem | null>(null);
  dropTargetDate = signal<string | null>(null);
  menuPosition = signal({ x: 0, y: 0 });
  colorCalendarByType = computed(() => this.themeService.theme().calendarEventColorMode === 'type');
  colorCalendarByStatus = computed(() => !this.colorCalendarByType());
  calendarDropListIds = computed(() => this.calendarDays().map((day) => this.calendarDayDropListId(day.iso)));

  calendarDays = computed<CalendarDay[]>(() => {
    const month = this.visibleMonth();
    const first = startOfMonth(month);
    const firstWeekday = mondayBasedDay(first);
    const gridStart = addDays(first, -firstWeekday);
    const todayIso = toIsoDate(new Date());

    return Array.from({ length: 42 }, (_, index) => {
      const date = addDays(gridStart, index);
      const iso = toIsoDate(date);
      return {
        date,
        iso,
        inMonth: date.getMonth() === month.getMonth(),
        isToday: iso === todayIso,
        events: this.visibleEvents().filter((event) => eventOccursOnDate(event, iso)).sort(compareEventsByDateAndTime)
      };
    });
  });
  selectedDayEvents = computed(() => this.visibleEvents()
    .filter((event) => eventOccursOnDate(event, this.selectedDate()))
    .sort(compareEventsByDateAndTime));

  ngOnInit(): void {
    this.load();
  }

  @HostListener('document:contextmenu', ['$event'])
  closeEventMenuOnOutsideRightClick(event: MouseEvent): void {
    if (!this.menuTrigger?.menuOpen) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('.event-context-menu')) {
      return;
    }

    event.preventDefault();
    this.menuTrigger.closeMenu();
  }

  load(): void {
    const birthdaysEnabled = this.themeService.current().calendarBirthdaysEnabled === 'true';
    forkJoin({
      events: this.eventsService.list(),
      people: birthdaysEnabled
        ? this.personsService.list().pipe(catchError(() => of([] as Person[])))
        : of([] as Person[])
    }).subscribe(({ events, people }) => {
      this.events.set(events);
      this.people.set(people);
    });
  }

  previousMonth(): void {
    this.setVisibleMonth(addMonths(this.visibleMonth(), -1));
  }

  nextMonth(): void {
    this.setVisibleMonth(addMonths(this.visibleMonth(), 1));
  }

  goToday(): void {
    const today = new Date();
    const todayIso = toIsoDate(today);
    this.visibleMonth.set(startOfMonth(today));
    this.selectedDate.set(todayIso);
    this.scrollDateIntoView(todayIso);
  }

  selectDate(iso: string): void {
    this.selectedDate.set(iso);
    if (this.isMobileViewport()) {
      return;
    }
    if (!this.auth.isAdmin()) {
      return;
    }
    this.openCreateDialog(iso);
  }

  openSelectedDateCreate(): void {
    if (!this.auth.isAdmin()) {
      return;
    }
    this.openCreateDialog(this.selectedDate());
  }

  startEventDrag(event: EventItem): void {
    this.draggingEvent.set(event);
  }

  setDropTarget(iso: string): void {
    if (!this.auth.isAdmin() || !this.draggingEvent()) {
      return;
    }
    this.dropTargetDate.set(iso);
  }

  clearDropTarget(iso: string): void {
    if (this.dropTargetDate() === iso) {
      this.dropTargetDate.set(null);
    }
  }

  dropEvent(dropEvent: CdkDragDrop<EventItem[]>, targetDate: string): void {
    const event = dropEvent.item.data;
    this.dropTargetDate.set(null);
    this.draggingEvent.set(null);
    if (!event || !this.auth.isAdmin() || isBirthdayEvent(event) || !event.openDate || event.openDate === targetDate) {
      return;
    }

    this.eventsService.create(this.copyEventRequest(event, targetDate)).subscribe({
      next: () => {
        this.toast.success(this.language.language() === 'en'
          ? `The event was copied to ${formatDateForToast(targetDate)}.`
          : `Evenimentul a fost copiat pe ${formatDateForToast(targetDate)}.`);
        this.load();
      },
      error: (error) => this.toast.error(apiErrorMessage(error, this.language.language() === 'en' ? 'The event could not be copied.' : 'Nu s-a putut copia evenimentul.'))
    });
  }

  endEventDrag(): void {
    this.draggingEvent.set(null);
    this.dropTargetDate.set(null);
  }

  calendarDayDropListId(iso: string): string {
    return `calendar-day-${iso}`;
  }

  private copyEventRequest(event: EventItem, targetDate: string): EventRequest {
    const dates = shiftedEventDates(event, targetDate);
    return {
      eventName: event.eventName,
      about: event.about ?? null,
      publicAbout: event.publicAbout ?? null,
      privateAbout: event.privateAbout ?? null,
      aboutPrivate: event.aboutPrivate ?? false,
      openDate: dates.openDate,
      endDate: dates.endDate,
      eventTime: event.eventTime ?? null,
      status: event.status,
      eventType: event.eventType,
      priority: event.priority,
      recurrenceType: event.recurrenceType,
      groupId: event.groupId ?? null,
      implementedById: event.implementedById ?? null,
      contactedPersonId: event.contactedPersonId ?? null,
      contactedPersonIds: event.contactedPersonIds?.length
        ? [...event.contactedPersonIds]
        : event.contactedPersonId
          ? [event.contactedPersonId]
          : [],
      responsibleIds: event.responsibleIds?.length
        ? [...event.responsibleIds]
        : event.implementedById
          ? [event.implementedById]
          : []
    };
  }

  openCreateDialog(openDate: string): void {
    const dialogRef = this.dialog.open(EventFormDialogComponent, {
      width: '920px',
      maxWidth: 'calc(100vw - 32px)',
      data: { openDate }
    });

    dialogRef.afterClosed().subscribe((request) => {
      if (!request) {
        return;
      }
      this.eventsService.create(request).subscribe({
        next: () => {
          this.toast.success(this.language.language() === 'en' ? 'The event was added.' : 'Evenimentul a fost adăugat.');
          this.load();
        },
        error: (error) => this.toast.error(apiErrorMessage(error, this.language.language() === 'en' ? 'The event could not be saved.' : 'Nu s-a putut salva evenimentul.'))
      });
    });
  }

  openEventMenu(event: MouseEvent, item: EventItem): void {
    if (isBirthdayEvent(item)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.selectedEvent.set(item);
    this.menuPosition.set({ x: event.clientX, y: event.clientY });
    this.menuTrigger?.openMenu();
  }

  viewSelectedEvent(): void {
    const event = this.selectedEvent();
    if (!event) {
      return;
    }
    this.openViewDialog(event);
  }

  downloadSelectedEvent(): void {
    const event = this.selectedEvent();
    if (!event) {
      return;
    }
    if (isBirthdayEvent(event)) {
      this.menuTrigger?.closeMenu();
      return;
    }
    this.menuTrigger?.closeMenu();
    exportEventIcs(event);
  }

  openViewDialog(event: EventItem, clickEvent?: MouseEvent): void {
    clickEvent?.stopPropagation();
    if (isBirthdayEvent(event)) {
      return;
    }
    this.menuTrigger?.closeMenu();
    this.dialog.open(EventDetailDialogComponent, {
      width: '680px',
      maxWidth: 'calc(100vw - 32px)',
      data: event
    });
  }

  editSelectedEvent(): void {
    const event = this.selectedEvent();
    if (!event || isBirthdayEvent(event)) {
      return;
    }
    const dialogRef = this.dialog.open(EventFormDialogComponent, {
      width: '920px',
      maxWidth: 'calc(100vw - 32px)',
      data: { event }
    });

    dialogRef.afterClosed().subscribe((request) => {
      if (!request) {
        return;
      }
      this.eventsService.update(event.id, request).subscribe({
        next: () => {
          this.toast.success(this.language.language() === 'en' ? 'The event was updated.' : 'Evenimentul a fost actualizat.');
          this.load();
        },
        error: (error) => this.toast.error(apiErrorMessage(error, this.language.language() === 'en' ? 'The event could not be saved.' : 'Nu s-a putut salva evenimentul.'))
      });
    });
  }

  deleteSelectedEvent(): void {
    const event = this.selectedEvent();
    if (!event || isBirthdayEvent(event)) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        title: this.language.language() === 'en' ? 'Delete event' : 'Șterge evenimentul',
        message: this.language.language() === 'en' ? `Are you sure you want to delete ${event.eventName}?` : `Sigur vrei să ștergi ${event.eventName}?`,
        confirmLabel: this.language.t('common.delete')
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.eventsService.delete(event.id).subscribe({
        next: () => {
          this.toast.success(this.language.language() === 'en' ? 'The event was deleted.' : 'Evenimentul a fost șters.');
          this.load();
        },
        error: (error) => this.toast.error(apiErrorMessage(error, this.language.language() === 'en' ? 'The event could not be deleted.' : 'Nu s-a putut șterge evenimentul.'))
      });
    });
  }

  eventStatusLabel = eventStatusLabel;
  eventPillMeta = eventPillMeta;
  isBirthdayEvent = isBirthdayEvent;
  isMultiDayEvent = isMultiDayEvent;
  isEventSegmentStart = isEventSegmentStart;
  isEventSegmentMiddle = isEventSegmentMiddle;
  isEventSegmentEnd = isEventSegmentEnd;

  selectedDateLabel(): string {
    return new Intl.DateTimeFormat(this.language.language() === 'en' ? 'en-GB' : 'ro-RO', {
      weekday: 'long',
      day: '2-digit',
      month: 'long'
    }).format(parseLocalDate(this.selectedDate()));
  }

  mobileEventMeta(event: EventItem): string {
    const status = isBirthdayEvent(event) ? this.language.t('calendar.birthday') : eventStatusLabel(event.status).toLowerCase();
    const meta = eventPillMeta(event);
    return meta ? `${status} · ${meta}` : status;
  }

  private setVisibleMonth(month: Date): void {
    const next = startOfMonth(month);
    this.visibleMonth.set(next);
    this.selectedDate.set(toIsoDate(next));
  }

  private scrollDateIntoView(iso: string): void {
    window.setTimeout(() => {
      const host = this.elementRef.nativeElement as HTMLElement;
      const target = host.querySelector(`[data-calendar-date="${iso}"]`) as HTMLElement | null;
      target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    });
  }

  private birthdayEvents(people: Person[]): EventItem[] {
    const year = this.visibleMonth().getFullYear();
    return people
      .filter((person) => !!person.birthDate)
      .reduce<EventItem[]>((events, person) => {
        const [birthYear, month, day] = person.birthDate!.split('-').map(Number);
        if (!birthYear || !month || !day) {
          return events;
        }
        const name = [person.lastName, person.firstName].filter(Boolean).join(' ').trim() || person.fullName;
        events.push({
          id: -person.id,
          eventName: `${this.language.t('calendar.birthday')}: ${name}`,
          about: null,
          publicAbout: null,
          privateAbout: null,
          aboutPrivate: false,
          aboutVisible: true,
          openDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          endDate: null,
          eventTime: null,
          status: 'PLANNED',
          eventType: 'OTHER',
          priority: 'LOW',
          recurrenceType: 'YEARLY',
          groupId: null,
          groupName: null,
          implementedById: person.id,
          implementedByName: name,
          responsibleIds: [],
          responsibleNames: []
        });
        return events;
      }, []);
  }

  private visibleEvents(): EventItem[] {
    return [...this.events(), ...this.birthdayEvents(this.people())];
  }

  private isMobileViewport(): boolean {
    return window.matchMedia('(max-width: 680px)').matches;
  }
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function mondayBasedDay(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function shiftedEventDates(event: EventItem, targetDate: string): { openDate: string; endDate: string | null } {
  if (!event.openDate || !event.endDate || event.endDate < event.openDate) {
    return { openDate: targetDate, endDate: event.endDate ? targetDate : null };
  }
  const duration = calendarDayDifference(parseLocalDate(event.openDate), parseLocalDate(event.endDate));
  return {
    openDate: targetDate,
    endDate: toIsoDate(addDays(parseLocalDate(targetDate), duration))
  };
}

function calendarDayDifference(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - startUtc) / 86_400_000);
}

function formatDateForToast(iso: string): string {
  return new Intl.DateTimeFormat(document.documentElement.lang === 'en' ? 'en-GB' : 'ro-RO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(parseLocalDate(iso));
}

function eventOccursOnDate(event: EventItem, iso: string): boolean {
  if (!event.openDate) {
    return false;
  }
  const endDate = event.endDate && event.endDate >= event.openDate ? event.endDate : event.openDate;
  return iso >= event.openDate && iso <= endDate;
}

function eventEndDate(event: EventItem): string | null {
  if (!event.openDate) {
    return null;
  }
  return event.endDate && event.endDate >= event.openDate ? event.endDate : event.openDate;
}

function isMultiDayEvent(event: EventItem): boolean {
  const endDate = eventEndDate(event);
  return !!event.openDate && !!endDate && endDate > event.openDate;
}

function isEventSegmentStart(event: EventItem, iso: string): boolean {
  return !isMultiDayEvent(event) || event.openDate === iso || mondayBasedDay(parseLocalDate(iso)) === 0;
}

function isEventSegmentEnd(event: EventItem, iso: string): boolean {
  const endDate = eventEndDate(event);
  return !isMultiDayEvent(event) || endDate === iso || mondayBasedDay(parseLocalDate(iso)) === 6;
}

function isEventSegmentMiddle(event: EventItem, iso: string): boolean {
  return isMultiDayEvent(event) && !isEventSegmentStart(event, iso) && !isEventSegmentEnd(event, iso);
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

function eventPillMeta(event: EventItem): string {
  if (isBirthdayEvent(event)) {
    return document.documentElement.lang === 'en' ? 'Birthday' : 'Zi de naștere';
  }
  const details = event.responsibleNames?.length ? event.responsibleNames.join(', ') : event.implementedByName || '';
  const time = event.eventTime ? event.eventTime.slice(0, 5) : '';
  if (!details) {
    return time;
  }
  return time ? `${time} · ${details}` : details;
}

function isBirthdayEvent(event: EventItem): boolean {
  return event.id < 0 && event.recurrenceType === 'YEARLY';
}
