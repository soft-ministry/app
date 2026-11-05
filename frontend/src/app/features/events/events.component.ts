import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { AppearanceThemeService } from '../../core/theme/appearance-theme.service';
import { apiErrorMessage } from '../../shared/api-error-message';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { exportCsv } from '../../shared/csv-export';
import { eventStatusLabel, eventTypeLabel, priorityLabel } from '../../shared/display-labels';
import { exportEventIcs, exportEventsIcs } from '../../shared/ics-export';
import { ToastService } from '../../shared/toast.service';
import { TablePreferencesService } from '../../shared/table-preferences.service';
import { EventDetailDialogComponent } from './event-detail-dialog.component';
import { EventFormDialogComponent } from './event-form-dialog.component';
import { EventItem, EventRequest, EventStatus, EventType, Priority } from './event.model';
import { EventsService } from './events.service';
import { PageNavComponent } from '../../shared/page-nav.component';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatCheckboxModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    PageNavComponent
  ],
  styles: [`
    .events-toolbar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      flex: 1 1 auto;
      flex-wrap: nowrap;
      min-width: 0;
      width: 100%;
    }

    .events-toolbar .toolbar-select {
      width: 132px;
    }

    .events-toolbar .toolbar-input {
      width: min(240px, 100%);
      flex: 1 1 190px;
    }

    .events-toolbar button {
      flex: 0 0 auto;
    }

    .events-toolbar .search-button {
      width: 40px;
      min-width: 40px;
      padding: 0;
    }

    .table-surface-header {
      justify-content: flex-end;
    }

    .date-column {
      width: 130px;
    }

    .select-column {
      width: 46px;
    }

    .owner-column {
      width: 160px;
    }

    .status-column,
    .type-column,
    .priority-column {
      width: 130px;
    }

    .event-type-badge {
      background: color-mix(in srgb, var(--event-type-color) 14%, #ffffff);
      border-color: color-mix(in srgb, var(--event-type-color) 28%, #ffffff);
      color: var(--event-type-color);
    }

    .event-type-initial {
      justify-content: center;
      min-width: 28px;
      padding-right: 0;
      padding-left: 0;
      text-transform: uppercase;
    }

    .event-type-other {
      --event-type-color: var(--app-event-type-other);
    }

    .event-type-service {
      --event-type-color: var(--app-event-type-service);
    }

    .event-type-meeting {
      --event-type-color: var(--app-event-type-meeting);
    }

    .event-type-event {
      --event-type-color: var(--app-event-type-event);
    }

    .event-type-study {
      --event-type-color: var(--app-event-type-study);
    }

    .event-type-act-de-cult {
      --event-type-color: var(--app-event-type-act-de-cult);
    }

    .event-type-evangelism {
      --event-type-color: var(--app-event-type-evangelism);
    }

    .event-type-fellowship {
      --event-type-color: var(--app-event-type-fellowship);
    }

    .event-type-funeral {
      --event-type-color: var(--app-event-type-funeral);
    }

    .event-type-it {
      --event-type-color: var(--app-event-type-it);
    }

    .event-type-music {
      --event-type-color: var(--app-event-type-music);
    }

    .event-type-administration {
      --event-type-color: var(--app-event-type-administration);
    }

    .event-type-maintenance {
      --event-type-color: var(--app-event-type-maintenance);
    }

    .event-type-social-media-publishing {
      --event-type-color: var(--app-event-type-social-media-publishing);
    }

    .event-type-renovation {
      --event-type-color: var(--app-event-type-renovation);
    }

    .event-status-badge {
      background: color-mix(in srgb, var(--event-status-color) 14%, #ffffff);
      border-color: color-mix(in srgb, var(--event-status-color) 28%, #ffffff);
      color: var(--event-status-color);
    }

    .status-cell-select {
      width: 122px;
      min-height: 32px;
      box-sizing: border-box;
      border: 1px solid color-mix(in srgb, var(--event-status-color, var(--app-border)) 28%, #ffffff);
      border-radius: 8px;
      background-color: color-mix(in srgb, var(--event-status-color, var(--app-border)) 12%, #ffffff);
      color: var(--event-status-color, var(--app-text));
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      font-weight: 700;
      outline: none;
      padding: 0 8px;
    }

    .status-cell-select:disabled {
      cursor: default;
      opacity: 0.62;
    }

    .status-cell-select:focus {
      border-color: var(--app-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    .event-status-planned {
      --event-status-color: var(--app-event-status-planned);
    }

    .event-status-active {
      --event-status-color: var(--app-event-status-active);
    }

    .event-status-done {
      --event-status-color: var(--app-event-status-done);
    }

    .event-status-canceled {
      --event-status-color: var(--app-event-status-canceled);
    }

    .priority-stars {
      display: inline-flex;
      align-items: center;
      gap: 1px;
      font-size: 16px;
      line-height: 1;
      letter-spacing: 0;
      white-space: nowrap;
    }

    .priority-stars.priority-level-1 {
      color: var(--app-priority-low);
    }

    .priority-stars.priority-level-2 {
      color: var(--app-priority-medium-low);
    }

    .priority-stars.priority-level-3 {
      color: var(--app-priority-medium);
    }

    .priority-stars.priority-level-4 {
      color: var(--app-priority-high-medium);
    }

    .priority-stars.priority-level-5 {
      color: var(--app-priority-high);
    }

    .priority-star-empty {
      color: #d1d5db;
    }

    .priority-badge {
      background: color-mix(in srgb, var(--priority-color) 14%, #ffffff);
      border-color: color-mix(in srgb, var(--priority-color) 28%, #ffffff);
      color: var(--priority-color);
    }

    .priority-low {
      --priority-color: var(--app-priority-low);
    }

    .priority-medium-low {
      --priority-color: var(--app-priority-medium-low);
    }

    .priority-medium {
      --priority-color: var(--app-priority-medium);
    }

    .priority-high-medium {
      --priority-color: var(--app-priority-high-medium);
    }

    .priority-high {
      --priority-color: var(--app-priority-high);
    }

    .event-row {
      cursor: default;
    }

    .event-row:hover {
      background: #ffffff;
    }

    .mobile-event-list {
      display: none;
    }

    .mobile-event-card {
      display: grid;
      gap: 12px;
      padding: 13px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface);
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
    }

    .mobile-event-main {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: start;
    }

    .mobile-event-title {
      overflow: hidden;
      margin: 0;
      color: var(--app-text);
      font-size: 16px;
      font-weight: 800;
      line-height: 1.25;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mobile-event-meta {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 6px;
    }

    .mobile-event-details {
      display: grid;
      gap: 7px;
      min-width: 0;
    }

    .mobile-event-detail {
      display: grid;
      grid-template-columns: 22px minmax(0, 1fr);
      gap: 8px;
      align-items: center;
      min-width: 0;
      color: var(--app-muted);
      font-size: 13px;
      font-weight: 650;
    }

    .mobile-event-detail mat-icon {
      width: 18px;
      height: 18px;
      color: var(--app-primary-strong);
      font-size: 18px;
      line-height: 18px;
    }

    .mobile-event-detail span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mobile-event-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .mobile-event-actions .table-icon-button {
      width: 38px;
      min-width: 38px;
      height: 38px;
    }

    @media (max-width: 980px) {
      .events-toolbar {
        justify-content: flex-start;
        flex-wrap: wrap;
        width: 100%;
      }
    }

    @media (max-width: 640px) {
      .page-header {
        align-items: stretch;
        gap: 10px;
      }

      .page-header-actions {
        justify-content: flex-start;
      }

      .table-surface {
        border-radius: 8px;
      }

      .table-surface-header {
        align-items: stretch;
      }

      .events-toolbar {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 40px;
        gap: 7px;
      }

      .events-toolbar .toolbar-input {
        min-height: 38px;
        padding: 0 10px;
        font-size: 14px;
      }

      .events-toolbar .toolbar-select {
        grid-column: 1 / -1;
        min-height: 36px;
        padding: 0 9px;
        font-size: 13px;
        width: min(220px, 100%);
        justify-self: start;
      }

      .events-toolbar .search-button {
        width: 40px;
        min-width: 40px;
        min-height: 38px;
        grid-column: 2;
        grid-row: 1;
      }

      .events-toolbar .toolbar-secondary-button,
      .events-toolbar .toolbar-primary-button,
      .events-toolbar .toolbar-icon-button:not(.search-button) {
        min-height: 38px;
        width: auto;
        justify-self: start;
      }

      .table-wrap {
        display: none;
      }

      .mobile-event-list {
        display: grid;
        gap: 10px;
      }
    }
  `],
  template: `
    <main class="page">
      <header class="page-header">
        <div class="page-header-main">
          <h1 class="page-title page-title-offset">{{ language.t('page.events') }}</h1>
          <p class="page-subtitle" aria-hidden="true">&nbsp;</p>
        </div>
        <div class="page-header-actions">
          <app-page-nav />
        </div>
      </header>

      <section class="surface table-surface">
        <div class="surface-header table-surface-header">
          <div class="events-toolbar">
            <input
              class="toolbar-control toolbar-input"
              type="search"
              [placeholder]="language.t('common.search')"
              [formControl]="query"
              (keyup.enter)="load()">

            <select class="toolbar-control toolbar-select" [formControl]="statusFilter" (change)="applyFilters()" [attr.aria-label]="language.t('common.status')">
              <option value="">{{ language.t('common.all') }}</option>
              <option value="PLANNED">{{ eventStatusLabel('PLANNED') }}</option>
              <option value="ACTIVE">{{ eventStatusLabel('ACTIVE') }}</option>
              <option value="DONE">{{ eventStatusLabel('DONE') }}</option>
              <option value="CANCELED">{{ eventStatusLabel('CANCELED') }}</option>
            </select>

            <select class="toolbar-control toolbar-select" [formControl]="typeFilter" (change)="applyFilters()" [attr.aria-label]="language.t('common.type')">
              <option value="">{{ language.t('common.all') }}</option>
              <option value="SERVICE">{{ eventTypeLabel('SERVICE') }}</option>
              <option value="MEETING">{{ eventTypeLabel('MEETING') }}</option>
              <option value="EVENT">{{ eventTypeLabel('EVENT') }}</option>
              <option value="STUDY">{{ eventTypeLabel('STUDY') }}</option>
              <option value="ADMINISTRATION">{{ eventTypeLabel('ADMINISTRATION') }}</option>
              <option value="MAINTENANCE">{{ eventTypeLabel('MAINTENANCE') }}</option>
              <option value="SOCIAL_MEDIA_PUBLISHING">{{ eventTypeLabel('SOCIAL_MEDIA_PUBLISHING') }}</option>
              <option value="RENOVATION">{{ eventTypeLabel('RENOVATION') }}</option>
              <option value="ACT_DE_CULT">{{ eventTypeLabel('ACT_DE_CULT') }}</option>
              <option value="EVANGELISM">{{ eventTypeLabel('EVANGELISM') }}</option>
              <option value="FUNERAL">{{ eventTypeLabel('FUNERAL') }}</option>
              <option value="IT">{{ eventTypeLabel('IT') }}</option>
              <option value="MUSIC">{{ eventTypeLabel('MUSIC') }}</option>
              <option value="OTHER">{{ eventTypeLabel('OTHER') }}</option>
            </select>

            <select class="toolbar-control toolbar-select" [formControl]="priorityFilter" (change)="applyFilters()" [attr.aria-label]="language.t('common.priority')">
              <option value="">{{ language.t('common.all') }}</option>
              <option value="LOW">{{ priorityLabel('LOW') }}</option>
              <option value="MEDIUM_LOW">{{ priorityLabel('MEDIUM_LOW') }}</option>
              <option value="MEDIUM">{{ priorityLabel('MEDIUM') }}</option>
              <option value="HIGH_MEDIUM">{{ priorityLabel('HIGH_MEDIUM') }}</option>
              <option value="HIGH">{{ priorityLabel('HIGH') }}</option>
            </select>

            <button class="toolbar-button toolbar-icon-button search-button" type="button" [attr.aria-label]="language.t('common.search')" [title]="language.t('common.search')" (click)="load()">
              <mat-icon>search</mat-icon>
            </button>
            <button #exportMenuTrigger="matMenuTrigger" class="toolbar-button toolbar-secondary-button" type="button" [matMenuTriggerFor]="exportMenu">
              <mat-icon>download</mat-icon>
              {{ language.t('common.export') }}
            </button>
            <mat-menu #exportMenu="matMenu" panelClass="event-context-menu">
              <div class="context-menu-list" (click)="$event.stopPropagation()">
                <button class="context-menu-action" type="button" (click)="exportRows()">
                  <mat-icon>table_view</mat-icon>
                  <span>CSV</span>
                </button>
                <button class="context-menu-action" type="button" (click)="enableMultiExport()">
                  <mat-icon>checklist</mat-icon>
                  <span>Export multiplu</span>
                </button>
              </div>
            </mat-menu>
            @if (multiExportMode()) {
              <button class="toolbar-button toolbar-secondary-button" type="button" [disabled]="selectedEvents().length === 0" (click)="exportSelectedCalendarEvents()">
                <mat-icon>calendar_month</mat-icon>
                {{ language.t('common.download') }}
              </button>
              <button class="toolbar-button toolbar-icon-button" type="button" aria-label="Anulează export multiplu" title="Anulează export multiplu" (click)="cancelMultiExport()">
                <mat-icon>close</mat-icon>
              </button>
            }
              <button class="toolbar-button toolbar-primary-button" type="button" [disabled]="!auth.isAdmin()" (click)="openCreateDialog()">
              <mat-icon>event_available</mat-icon>
              {{ language.t('common.add') }}
            </button>
          </div>
        </div>
        <div class="surface-content table-surface-content">

          @if (events().length > 0) {
            <div class="table-wrap">
                <table class="data-table" mat-table matSort [dataSource]="dataSource">
                  <ng-container matColumnDef="select">
                    <th class="select-column" mat-header-cell *matHeaderCellDef>
                      <mat-checkbox
                        aria-label="Selectează toate evenimentele"
                        [checked]="allFilteredEventsSelected()"
                        [indeterminate]="someFilteredEventsSelected()"
                        (change)="toggleAllFilteredEvents($event.checked)" />
                    </th>
                    <td mat-cell *matCellDef="let event">
                      <mat-checkbox
                        aria-label="Selectează evenimentul"
                        [checked]="isSelected(event)"
                        (click)="$event.stopPropagation()"
                        (change)="toggleEventSelection(event, $event.checked)" />
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="index">
                    <th class="number-column" mat-header-cell *matHeaderCellDef>#</th>
                    <td class="number-column" mat-cell *matCellDef="let event; let rowIndex = index">{{ rowNumber(rowIndex) }}.</td>
                  </ng-container>

                  <ng-container matColumnDef="eventName">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.t('common.name') }}</th>
                  <td mat-cell *matCellDef="let event">
                    <span class="primary-text">{{ eventTableName(event) }}</span>
                  </td>
                </ng-container>

                  <ng-container matColumnDef="openDate">
                    <th class="date-column" mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.t('common.period') }}</th>
                  <td mat-cell *matCellDef="let event">{{ formatEventDateTime(event) }}</td>
                </ng-container>

                  <ng-container matColumnDef="responsibleNames">
                    <th class="owner-column" mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.t('common.responsible') }}</th>
                  <td mat-cell *matCellDef="let event">{{ responsibleNames(event) || '-' }}</td>
                </ng-container>

                  <ng-container matColumnDef="eventType">
                    <th class="type-column" mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.t('common.type') }}</th>
                  <td mat-cell *matCellDef="let event">
                    <span class="badge event-type-badge event-type-initial {{ eventTypeClass(event.eventType) }}" [title]="eventTypeLabel(event.eventType)">
                      {{ eventTypeInitial(event.eventType) }}
                    </span>
                  </td>
                </ng-container>

                  <ng-container matColumnDef="status">
                    <th class="status-column" mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.t('common.status') }}</th>
                  <td mat-cell *matCellDef="let event">
                    <select
                      class="status-cell-select {{ eventStatusClass(event.status) }}"
                      [value]="event.status"
                      [disabled]="!auth.isAdmin()"
                      [attr.aria-label]="'Schimbă statusul pentru ' + event.eventName"
                      (click)="$event.stopPropagation()"
                      (change)="changeStatus(event, $any($event.target).value)">
                      @for (status of eventStatuses; track status) {
                        <option [value]="status">{{ eventStatusLabel(status).toLowerCase() }}</option>
                      }
                    </select>
                  </td>
                </ng-container>

                  <ng-container matColumnDef="priority">
                    <th class="priority-column" mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.t('common.priority') }}</th>
                  <td mat-cell *matCellDef="let event">
                    @if (priorityDisplayMode() === 'stars') {
                      <span
                        class="priority-stars"
                        [class.priority-level-1]="priorityLevel(event.priority) === 1"
                        [class.priority-level-2]="priorityLevel(event.priority) === 2"
                        [class.priority-level-3]="priorityLevel(event.priority) === 3"
                        [class.priority-level-4]="priorityLevel(event.priority) === 4"
                        [class.priority-level-5]="priorityLevel(event.priority) === 5"
                        [attr.aria-label]="priorityLabel(event.priority)">
                        @for (star of priorityStars(event.priority); track $index) {
                          <span [class.priority-star-empty]="!star">{{ star ? '★' : '☆' }}</span>
                        }
                      </span>
                    } @else {
                      <span class="badge priority-badge {{ priorityClass(event.priority) }}">{{ priorityLabel(event.priority) }}</span>
                    }
                  </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let event">
                    <div class="table-actions">
                      <button class="table-icon-button" type="button" aria-label="Vezi" (click)="openViewDialog(event)">
                        <mat-icon>visibility</mat-icon>
                      </button>
                      <button class="table-icon-button" type="button" aria-label="Export calendar" title="Export calendar" (click)="exportEvent(event)">
                        <mat-icon>calendar_month</mat-icon>
                      </button>
                      <button class="table-icon-button" type="button" aria-label="Editează" [disabled]="!auth.isAdmin()" (click)="openEditDialog(event)">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button class="table-icon-button danger-table-action" type="button" aria-label="Șterge" [disabled]="!auth.isAdmin()" (click)="delete(event)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="visibleColumns()"></tr>
                <tr class="event-row" mat-row *matRowDef="let row; columns: visibleColumns();"></tr>
                <tr class="mat-row" *matNoDataRow>
                  <td class="mat-cell muted" [attr.colspan]="visibleColumns().length">{{ language.t('common.noResults') }}</td>
                </tr>
              </table>
              <mat-paginator [pageSize]="tablePageSize()" [pageSizeOptions]="tablePageSizeOptions()" showFirstLastButtons />
            </div>
            <div class="mobile-event-list" aria-label="Evenimente">
              @for (event of mobileEventRows(); track event.id) {
                <article class="mobile-event-card">
                  <div class="mobile-event-main">
                    <div>
                      <h2 class="mobile-event-title">{{ event.eventName }}</h2>
                      <div class="mobile-event-meta">
                        <span class="badge event-type-badge {{ eventTypeClass(event.eventType) }}">{{ eventTypeLabel(event.eventType) }}</span>
                        <span class="badge priority-badge {{ priorityClass(event.priority) }}">{{ priorityLabel(event.priority) }}</span>
                      </div>
                    </div>
                    <div class="mobile-event-actions">
                      <button class="table-icon-button" type="button" aria-label="Vezi" (click)="openViewDialog(event)">
                        <mat-icon>visibility</mat-icon>
                      </button>
                      <button class="table-icon-button" type="button" aria-label="Editează" [disabled]="!auth.isAdmin()" (click)="openEditDialog(event)">
                        <mat-icon>edit</mat-icon>
                      </button>
                    </div>
                  </div>
                  <div class="mobile-event-details">
                    <div class="mobile-event-detail">
                      <mat-icon>event</mat-icon>
                      <span>{{ formatEventDateTime(event) }}</span>
                    </div>
                    <div class="mobile-event-detail">
                      <mat-icon>person</mat-icon>
                      <span>{{ responsibleNames(event) || 'Responsabil necompletat' }}</span>
                    </div>
                    <div class="mobile-event-detail">
                      <mat-icon>flag</mat-icon>
                      <select
                        class="status-cell-select {{ eventStatusClass(event.status) }}"
                        [value]="event.status"
                        [disabled]="!auth.isAdmin()"
                        [attr.aria-label]="'Schimbă statusul pentru ' + event.eventName"
                        (change)="changeStatus(event, $any($event.target).value)">
                        @for (status of eventStatuses; track status) {
                          <option [value]="status">{{ eventStatusLabel(status).toLowerCase() }}</option>
                        }
                      </select>
                    </div>
                    <div class="mobile-event-actions">
                      <button class="table-icon-button" type="button" aria-label="Export calendar" title="Export calendar" (click)="exportEvent(event)">
                        <mat-icon>calendar_month</mat-icon>
                      </button>
                      <button class="table-icon-button danger-table-action" type="button" aria-label="Șterge" [disabled]="!auth.isAdmin()" (click)="delete(event)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </div>
                </article>
              }
              @if (mobileEventRows().length === 0) {
                <div class="empty-state">
                  <mat-icon>search_off</mat-icon>
              <span>{{ language.t('common.noResults') }}</span>
                </div>
              }
            </div>
          } @else {
            <div class="empty-state">
              <mat-icon>event_available</mat-icon>
              <span>{{ language.t('common.noData') }}</span>
            </div>
          }
        </div>
      </section>
    </main>
  `
})
export class EventsComponent implements OnInit {
  private paginator?: MatPaginator;

  @ViewChild(MatPaginator) set matPaginator(paginator: MatPaginator | undefined) {
    this.paginator = paginator;
    this.dataSource.paginator = paginator || null;
  }

  @ViewChild(MatSort) set matSort(sort: MatSort | undefined) {
    this.dataSource.sort = sort || null;
  }

  @ViewChild('exportMenuTrigger') private exportMenuTrigger?: MatMenuTrigger;

  private fb = inject(FormBuilder);
  private eventsService = inject(EventsService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  private themeService = inject(AppearanceThemeService);
  private tablePreferences = inject(TablePreferencesService);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);
  language = inject(LanguageService);
  tablePageSize = this.tablePreferences.pageSize;
  tablePageSizeOptions = this.tablePreferences.pageSizeOptions;

  columns = ['index', 'eventName', 'openDate', 'responsibleNames', 'eventType', 'status', 'priority', 'actions'];
  multiExportColumns = ['select', ...this.columns];
  eventStatuses: EventStatus[] = ['PLANNED', 'ACTIVE', 'DONE', 'CANCELED'];
  events = signal<EventItem[]>([]);
  selectedEventIds = signal<Set<number>>(new Set());
  multiExportMode = signal(false);
  dataSource = new MatTableDataSource<EventItem>([]);
  query = this.fb.nonNullable.control('');
  statusFilter = this.fb.nonNullable.control<EventStatus | ''>('');
  typeFilter = this.fb.nonNullable.control<EventType | ''>('');
  priorityFilter = this.fb.nonNullable.control<Priority | ''>('');
  priorityDisplayMode = computed(() => this.themeService.theme().tablePriorityDisplay === 'stars' ? 'stars' : 'label');

  filteredEvents(): EventItem[] {
    return this.dataSource.filteredData;
  }

  mobileEventRows(): EventItem[] {
    const rows = [...this.dataSource.filteredData];
    return this.dataSource.sort ? this.dataSource.sortData(rows, this.dataSource.sort) : rows;
  }

  selectedEvents(): EventItem[] {
    const selectedIds = this.selectedEventIds();
    return this.events().filter((event) => selectedIds.has(event.id));
  }

  visibleColumns(): string[] {
    return this.multiExportMode() ? this.multiExportColumns : this.columns;
  }

  rowNumber(index: number): number {
    const pageIndex = this.paginator?.pageIndex || 0;
    const pageSize = this.paginator?.pageSize || this.dataSource.filteredData.length || 10;
    return pageIndex * pageSize + index + 1;
  }

  ngOnInit(): void {
    this.dataSource.sortingDataAccessor = (event, column) => {
      if (column === 'status') {
        return eventTableStatusLabel(event.status);
      }
      if (column === 'priority') {
        return priorityLabel(event.priority);
      }
      if (column === 'eventType') {
        return eventTypeLabel(event.eventType);
      }
      if (column === 'responsibleNames') {
        return responsibleNames(event);
      }
      return String(event[column as keyof EventItem] || '');
    };
    const params = this.route.snapshot.queryParamMap;
    this.query.setValue(params.get('q') || '');
    this.statusFilter.setValue((params.get('status') as EventStatus | null) || '');
    this.typeFilter.setValue((params.get('type') as EventType | null) || '');
    this.load();
  }

  applyFilters(resetPage = true): void {
    const status = this.statusFilter.value;
    const type = this.typeFilter.value;
    const priority = this.priorityFilter.value;

    this.dataSource.data = this.events()
      .filter((event) => !status || event.status === status)
      .filter((event) => !type || event.eventType === type)
      .filter((event) => !priority || event.priority === priority)
      .sort(compareEventsByDateAndTime);
    if (resetPage) {
      this.paginator?.firstPage();
    }
    this.syncSelectionWithEvents();
  }

  load(): void {
    this.eventsService.list(this.query.value).subscribe({
      next: (events) => {
        this.events.set(events);
        this.applyFilters(false);
      },
      error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-au putut încărca evenimentele.'))
    });
  }

  openCreateDialog(): void {
    this.openEventDialog();
  }

  openViewDialog(event: EventItem): void {
    this.dialog.open(EventDetailDialogComponent, {
      width: '680px',
      maxWidth: 'calc(100vw - 32px)',
      data: event
    });
  }

  openEditDialog(event: EventItem): void {
    this.openEventDialog(event);
  }

  changeStatus(event: EventItem, status: EventStatus): void {
    if (event.status === status || !this.eventStatuses.includes(status)) {
      return;
    }

    const request: EventRequest = {
      eventName: event.eventName,
      about: event.publicAbout || event.about || null,
      publicAbout: event.publicAbout || event.about || null,
      privateAbout: event.privateAbout || null,
      aboutPrivate: false,
      openDate: event.openDate || null,
      endDate: event.endDate || null,
      eventTime: event.eventTime || null,
      status,
      eventType: event.eventType,
      priority: event.priority,
      recurrenceType: event.recurrenceType,
      groupId: event.groupId || null,
      implementedById: event.implementedById || null,
      contactedPersonId: event.contactedPersonId || null,
      contactedPersonIds: event.contactedPersonIds || (event.contactedPersonId ? [event.contactedPersonId] : []),
      responsibleIds: event.responsibleIds || []
    };

    this.eventsService.update(event.id, request).subscribe({
      next: (updated) => {
        this.events.set(this.events().map((item) => item.id === updated.id ? updated : item));
        this.applyFilters(false);
        this.toast.success('Statusul evenimentului a fost actualizat.');
      },
      error: (error) => {
        this.toast.error(apiErrorMessage(error, 'Nu s-a putut actualiza statusul.'));
        this.load();
      }
    });
  }

  exportRows(): void {
    this.exportMenuTrigger?.closeMenu();
    exportCsv('evenimente.csv', this.dataSource.filteredData, [
      { header: 'Nume', value: (event) => event.eventName },
      { header: 'Data inceput', value: (event) => event.openDate },
      { header: 'Ora', value: (event) => formatEventTime(event.eventTime) },
      { header: 'Data final', value: (event) => event.endDate },
      { header: 'Status', value: (event) => eventStatusLabel(event.status) },
      { header: 'Tip', value: (event) => eventTypeLabel(event.eventType) },
      { header: 'Prioritate', value: (event) => priorityLabel(event.priority) },
      { header: 'Grup', value: (event) => event.groupName },
      { header: 'Responsabil', value: (event) => responsibleNames(event) },
      { header: 'Descriere', value: (event) => event.about }
    ]);
  }

  exportEvent(event: EventItem): void {
    exportEventIcs(event);
  }

  exportSelectedCalendarEvents(): void {
    const selectedEvents = this.selectedEvents().sort(compareEventsByDateAndTime);
    if (!selectedEvents.length) {
      return;
    }
    exportEventsIcs(selectedEvents, 'evenimente-selectate');
  }

  enableMultiExport(): void {
    this.exportMenuTrigger?.closeMenu();
    this.multiExportMode.set(true);
  }

  cancelMultiExport(): void {
    this.multiExportMode.set(false);
    this.selectedEventIds.set(new Set());
  }

  isSelected(event: EventItem): boolean {
    return this.selectedEventIds().has(event.id);
  }

  toggleEventSelection(event: EventItem, checked: boolean): void {
    this.selectedEventIds.update((selected) => {
      const next = new Set(selected);
      if (checked) {
        next.add(event.id);
      } else {
        next.delete(event.id);
      }
      return next;
    });
  }

  allFilteredEventsSelected(): boolean {
    const filtered = this.filteredEvents();
    return filtered.length > 0 && filtered.every((event) => this.selectedEventIds().has(event.id));
  }

  someFilteredEventsSelected(): boolean {
    const filtered = this.filteredEvents();
    const selectedCount = filtered.filter((event) => this.selectedEventIds().has(event.id)).length;
    return selectedCount > 0 && selectedCount < filtered.length;
  }

  toggleAllFilteredEvents(checked: boolean): void {
    const filtered = this.filteredEvents();
    this.selectedEventIds.update((selected) => {
      const next = new Set(selected);
      filtered.forEach((event) => {
        if (checked) {
          next.add(event.id);
        } else {
          next.delete(event.id);
        }
      });
      return next;
    });
  }

  delete(event: EventItem): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        title: 'Șterge evenimentul',
        message: `Sigur vrei să ștergi ${event.eventName}?`,
        confirmLabel: 'Șterge'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.eventsService.delete(event.id).subscribe({
        next: () => {
          this.toast.success('Evenimentul a fost șters.');
          this.load();
        },
        error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-a putut șterge evenimentul.'))
      });
    });
  }

  eventStatusLabel = eventStatusLabel;
  eventTableStatusLabel = eventTableStatusLabel;
  eventStatusClass = eventStatusClass;
  eventTypeLabel = eventTypeLabel;
  eventTypeInitial(type: EventType): string {
    return eventTypeLabel(type).trim().charAt(0).toUpperCase();
  }
  eventTypeClass = eventTypeClass;
  priorityLabel = priorityLabel;
  priorityClass = priorityClass;
  priorityLevel = priorityLevel;
  priorityStars = priorityStars;
  responsibleNames = responsibleNames;
  formatEventDateTime = formatEventDateTime;
  eventTableName = eventTableName;

  private openEventDialog(event?: EventItem): void {
    const dialogRef = this.dialog.open(EventFormDialogComponent, {
      width: '920px',
      maxWidth: 'calc(100vw - 32px)',
      data: { event: event || null }
    });

    dialogRef.afterClosed().subscribe((request: EventRequest | undefined) => {
      if (!request) {
        return;
      }

      const save$ = event
        ? this.eventsService.update(event.id, request)
        : this.eventsService.create(request);

      save$.subscribe({
        next: () => {
          this.toast.success(event ? 'Evenimentul a fost actualizat.' : 'Evenimentul a fost adăugat.');
          this.load();
        },
        error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-a putut salva evenimentul.'))
      });
    });
  }

  private syncSelectionWithEvents(): void {
    const validIds = new Set(this.events().map((event) => event.id));
    this.selectedEventIds.update((selected) => {
      const next = new Set([...selected].filter((id) => validIds.has(id)));
      return next.size === selected.size ? selected : next;
    });
  }
}

function eventTableStatusLabel(status: EventStatus): string {
  return status === 'DONE' ? '' : eventStatusLabel(status);
}

function eventStatusClass(status: EventStatus): string {
  const classes: Record<EventStatus, string> = {
    PLANNED: 'event-status-planned',
    ACTIVE: 'event-status-active',
    DONE: 'event-status-done',
    CANCELED: 'event-status-canceled'
  };
  return classes[status];
}

function eventTypeClass(type: EventType): string {
  const classes: Record<EventType, string> = {
    OTHER: 'event-type-other',
    SERVICE: 'event-type-service',
    MEETING: 'event-type-meeting',
    EVENT: 'event-type-event',
    STUDY: 'event-type-study',
    ACT_DE_CULT: 'event-type-act-de-cult',
    EVANGELISM: 'event-type-evangelism',
    FELLOWSHIP: 'event-type-fellowship',
    FUNERAL: 'event-type-funeral',
    IT: 'event-type-it',
    MUSIC: 'event-type-music',
    ADMINISTRATION: 'event-type-administration',
    MAINTENANCE: 'event-type-maintenance',
    SOCIAL_MEDIA_PUBLISHING: 'event-type-social-media-publishing',
    RENOVATION: 'event-type-renovation'
  };
  return classes[type];
}

function priorityStars(priority: Priority): boolean[] {
  const count = priorityLevel(priority);
  return Array.from({ length: 5 }, (_, index) => index < count);
}

function priorityLevel(priority: Priority): number {
  const values: Record<Priority, number> = {
    LOW: 1,
    MEDIUM_LOW: 2,
    MEDIUM: 3,
    HIGH_MEDIUM: 4,
    HIGH: 5
  };
  return values[priority] ?? 1;
}

function priorityClass(priority: Priority): string {
  const classes: Record<Priority, string> = {
    LOW: 'priority-low',
    MEDIUM_LOW: 'priority-medium-low',
    MEDIUM: 'priority-medium',
    HIGH_MEDIUM: 'priority-high-medium',
    HIGH: 'priority-high'
  };
  return classes[priority];
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

function formatEventDateTime(event: EventItem): string {
  const date = event.openDate || '-';
  const time = formatEventTime(event.eventTime);
  return time ? `${date} · ${time}` : date;
}

function eventTableName(event: EventItem): string {
  return event.eventName.replace(/[·•-]\s*\d{1,2}\.\d{1,2}\.\d{4}\s*$/, '').trim();
}

function formatEventTime(time?: string | null): string {
  return time ? time.slice(0, 5) : '';
}

function responsibleNames(event: EventItem): string {
  if (event.responsibleNames?.length) {
    return event.responsibleNames.join(', ');
  }
  return event.implementedByName || '';
}
