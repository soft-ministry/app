import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';

import { apiErrorMessage } from '../../shared/api-error-message';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { exportCsv } from '../../shared/csv-export';
import { exportStyledPdf } from '../../shared/excel-export';
import { PageMenuActionsService } from '../../shared/page-menu-actions.service';
import { PageNavComponent } from '../../shared/page-nav.component';
import { normalizeSearchText } from '../../shared/search-normalization';
import { ToastService } from '../../shared/toast.service';
import { AppearanceThemeService } from '../../core/theme/appearance-theme.service';
import { LanguageService } from '../../core/language.service';
import { ChurchSettingsService } from '../../core/church-settings.service';
import { GroupsService } from '../groups/groups.service';
import { Group } from '../groups/group.model';
import { AttendanceSession, AttendanceSummary } from './attendance.model';
import { AttendanceEditorDialogComponent } from './attendance-editor-dialog.component';
import { AttendanceService } from './attendance.service';

type AttendanceSessionFilter = 'ALL' | AttendanceSession;
type AttendanceResultFilter = 'ALL' | 'WITH_PRESENT' | 'WITHOUT_PRESENT' | 'WITH_ABSENT';
type AttendanceSortColumn = 'attendanceDate' | 'session' | 'presentCount' | 'absentCount' | 'totalCount' | 'recordedBy';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [DatePipe, FormsModule, MatIconModule, PageNavComponent],
  styles: [`
    .attendance-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      min-width: 0;
      flex-wrap: wrap;
    }

    .attendance-toolbar .toolbar-search-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1 1 auto;
      min-width: 0;
    }

    .attendance-toolbar .toolbar-input {
      width: min(529px, 100%);
      flex: 0 1 529px;
    }

    .attendance-toolbar .session-filter,
    .attendance-toolbar .result-filter {
      width: 150px;
      flex: 0 0 150px;
    }

    .attendance-toolbar .search-button {
      flex: 0 0 40px;
      width: 40px;
      min-width: 40px;
    }

    .attendance-actions-column {
      width: 76px;
      min-width: 76px;
    }

    .sortable-header {
      padding: 0;
    }

    .sort-button {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      width: 100%;
      min-height: 38px;
      border: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      font: inherit;
      font-weight: inherit;
      padding: 0.58rem 0.7rem;
      text-align: left;
    }

    .sort-button:hover,
    .sort-button:focus-visible {
      color: var(--app-primary-strong);
      outline: none;
    }

    .sort-button mat-icon {
      width: 16px;
      height: 16px;
      color: var(--app-muted);
      font-size: 16px;
      line-height: 16px;
    }

    .sort-button.active mat-icon {
      color: var(--app-primary-strong);
    }

    @media (max-width: 760px) {
      .attendance-toolbar {
        width: 100%;
      }

      .attendance-toolbar .toolbar-search-group {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 40px;
        gap: 7px;
        width: 100%;
      }

      .attendance-toolbar .toolbar-input {
        min-height: 38px;
        padding: 0 10px;
        font-size: 14px;
      }

      .attendance-toolbar .search-button {
        width: 40px;
        min-width: 40px;
        min-height: 38px;
        grid-column: 2;
        grid-row: 1;
      }

      .attendance-toolbar .session-filter,
      .attendance-toolbar .result-filter {
        grid-column: 1 / -1;
        width: min(220px, 100%);
        min-height: 36px;
        justify-self: start;
      }

      .attendance-toolbar > .toolbar-button {
        width: auto;
        justify-self: start;
      }
    }
  `],
  template: `
    <main class="page">
      <header class="page-header">
        <div class="page-header-main">
          <h1 class="page-title page-title-offset">{{ language.t('page.attendance') }}</h1>
          <p class="page-subtitle" aria-hidden="true">&nbsp;</p>
        </div>
        <div class="page-header-actions">
          <app-page-nav />
        </div>
      </header>

      <section class="surface table-surface">
        <div class="surface-header table-surface-header">
          <div class="attendance-toolbar">
            <div class="toolbar-search-group">
              <input
                class="toolbar-control toolbar-input"
                type="search"
                [placeholder]="language.t('common.search')"
                [ngModel]="query()"
                (ngModelChange)="query.set($event)">
              <button class="toolbar-button toolbar-icon-button search-button" type="button" [attr.aria-label]="language.t('common.search')" [title]="language.t('common.search')">
                <mat-icon>search</mat-icon>
              </button>
              <select class="toolbar-control session-filter" [ngModel]="sessionFilter()" (ngModelChange)="sessionFilter.set($event)" [attr.aria-label]="text('Filtrează după program', 'Filter by service')">
                @for (option of sessionFilterOptions; track option.value) {
                  <option [ngValue]="option.value">{{ option.label }}</option>
                }
              </select>
              <select class="toolbar-control result-filter" [ngModel]="resultFilter()" (ngModelChange)="resultFilter.set($event)" [attr.aria-label]="text('Filtrează după rezultate', 'Filter by results')">
                @for (option of resultFilterOptions; track option.value) {
                  <option [ngValue]="option.value">{{ option.label }}</option>
                }
              </select>
              <span class="toolbar-count">
                <strong>{{ filteredSessions().length }}</strong>
                {{ text('în listă', 'in list') }}
              </span>
            </div>
            <button class="toolbar-button toolbar-primary-button" type="button" (click)="startNewAttendance()">
              <mat-icon>add</mat-icon>
              {{ text('Adaugă prezență', 'Add attendance') }}
            </button>
          </div>
        </div>
        <div class="surface-content table-surface-content">
          @if (sessions().length > 0) {
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th class="number-column">#</th>
                    <th class="sortable-header">
                      <button class="sort-button" type="button" [class.active]="sortColumn() === 'attendanceDate'" (click)="sortBy('attendanceDate')">
                        {{ text('Ziua', 'Date') }}
                        <mat-icon>{{ sortIcon('attendanceDate') }}</mat-icon>
                      </button>
                    </th>
                    <th class="sortable-header">
                      <button class="sort-button" type="button" [class.active]="sortColumn() === 'session'" (click)="sortBy('session')">
                        {{ text('Program', 'Service') }}
                        <mat-icon>{{ sortIcon('session') }}</mat-icon>
                      </button>
                    </th>
                    <th class="sortable-header">
                      <button class="sort-button" type="button" [class.active]="sortColumn() === 'presentCount'" (click)="sortBy('presentCount')">
                        {{ text('Prezenți', 'Present') }}
                        <mat-icon>{{ sortIcon('presentCount') }}</mat-icon>
                      </button>
                    </th>
                    <th class="sortable-header">
                      <button class="sort-button" type="button" [class.active]="sortColumn() === 'absentCount'" (click)="sortBy('absentCount')">
                        {{ text('Absenți', 'Absent') }}
                        <mat-icon>{{ sortIcon('absentCount') }}</mat-icon>
                      </button>
                    </th>
                    <th class="sortable-header">
                      <button class="sort-button" type="button" [class.active]="sortColumn() === 'totalCount'" (click)="sortBy('totalCount')">
                        {{ text('Total', 'Total') }}
                        <mat-icon>{{ sortIcon('totalCount') }}</mat-icon>
                      </button>
                    </th>
                    <th class="sortable-header">
                      <button class="sort-button" type="button" [class.active]="sortColumn() === 'recordedBy'" (click)="sortBy('recordedBy')">
                        {{ text('Completat de', 'Recorded by') }}
                        <mat-icon>{{ sortIcon('recordedBy') }}</mat-icon>
                      </button>
                    </th>
                    <th class="attendance-actions-column">{{ language.t('common.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of filteredSessions(); track item.attendanceDate + item.session; let index = $index) {
                    <tr>
                      <td class="number-column">{{ index + 1 }}.</td>
                      <td>{{ item.attendanceDate | date:'dd.MM.yyyy' }}</td>
                      <td>{{ sessionLabel(item.session) }}</td>
                      <td>{{ item.presentCount }}</td>
                      <td>{{ item.absentCount }}</td>
                      <td>{{ item.totalCount }}</td>
                      <td>{{ item.recordedBy || '-' }}</td>
                      <td class="attendance-actions-column">
                        <div class="table-actions">
                          <button class="table-icon-button" type="button" [title]="text('Vezi', 'View')" [attr.aria-label]="text('Vezi', 'View')" (click)="openSession(item)">
                            <mat-icon>visibility</mat-icon>
                          </button>
                          <button class="table-icon-button" type="button" [title]="text('Editează', 'Edit')" [attr.aria-label]="text('Editează', 'Edit')" (click)="editSession(item)">
                            <mat-icon>edit</mat-icon>
                          </button>
                          <button class="table-icon-button danger-table-action" type="button" [title]="text('Șterge', 'Delete')" [attr.aria-label]="text('Șterge', 'Delete')" (click)="deleteSession(item)">
                            <mat-icon>delete</mat-icon>
                          </button>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td class="muted" colspan="8">{{ language.t('common.noResults') }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="empty-state">
              <mat-icon>how_to_reg</mat-icon>
              <span>{{ text('Nu există încă prezențe înregistrate.', 'No attendance records yet.') }}</span>
            </div>
          }
        </div>
      </section>

    </main>
  `
})
export class AttendanceComponent implements OnInit, OnDestroy {
  private attendanceService = inject(AttendanceService);
  private groupsService = inject(GroupsService);
  private churchSettingsService = inject(ChurchSettingsService);
  private themeService = inject(AppearanceThemeService);
  private toast = inject(ToastService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private pageMenuActions = inject(PageMenuActionsService);
  private route = inject(ActivatedRoute);
  language = inject(LanguageService);

  text(ro: string, en: string): string {
    return this.language.language() === 'en' ? en : ro;
  }

  groups = signal<Group[]>([]);
  sessions = signal<AttendanceSummary[]>([]);
  query = signal('');
  sessionFilter = signal<AttendanceSessionFilter>('ALL');
  resultFilter = signal<AttendanceResultFilter>('ALL');
  sortColumn = signal<AttendanceSortColumn>('attendanceDate');
  sortDirection = signal<SortDirection>('desc');
  sessionFilterOptions: Array<{ value: AttendanceSessionFilter; label: string }> = [
    { value: 'ALL', label: this.text('Toate programele', 'All services') },
    { value: 'MORNING', label: this.text('Dimineața', 'Morning') },
    { value: 'EVENING', label: this.text('Seara', 'Evening') },
    { value: 'DEFAULT', label: this.text('Implicit', 'Default') }
  ];
  resultFilterOptions: Array<{ value: AttendanceResultFilter; label: string }> = [
    { value: 'ALL', label: this.text('Toate rezultatele', 'All results') },
    { value: 'WITH_PRESENT', label: this.text('Cu prezenți', 'With present') },
    { value: 'WITHOUT_PRESENT', label: this.text('Fără prezenți', 'Without present') },
    { value: 'WITH_ABSENT', label: this.text('Cu absenți', 'With absent') }
  ];
  filteredSessions = computed(() => {
    const ignoreDiacritics = this.themeService.theme().searchIgnoreDiacritics === 'true';
    const normalized = normalizeSearchText(this.query(), ignoreDiacritics);
    const rows = this.sessions().filter((item) => {
      if (this.sessionFilter() !== 'ALL' && item.session !== this.sessionFilter()) {
        return false;
      }
      if (!this.matchesResultFilter(item)) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      return attendanceSearchText(item, this.formatDate(item.attendanceDate), this.sessionLabel(item.session), ignoreDiacritics)
        .includes(normalized);
    });
    return this.sortSessions(rows);
  });

  ngOnInit(): void {
    if (!this.churchSettingsService.settings().attendanceEnabled) {
      void this.router.navigate(['/dashboard']);
      return;
    }
    this.pageMenuActions.setActions([
      {
        id: 'attendance-export-csv',
        label: 'Export CSV',
        icon: 'download',
        run: () => this.exportRows('csv')
      },
      {
        id: 'attendance-export-pdf',
        label: 'Export PDF',
        icon: 'picture_as_pdf',
        run: () => this.exportRows('pdf')
      }
    ]);
    this.query.set(this.route.snapshot.queryParamMap.get('q') || '');
    this.groupsService.list().subscribe((groups) => this.groups.set(groups));
    this.loadSessions();
  }

  ngOnDestroy(): void {
    this.pageMenuActions.clear();
  }

  startNewAttendance(): void {
    this.openEditor('create', todayIso(), 'MORNING');
  }

  openSession(item: AttendanceSummary): void {
    this.openEditor('view', item.attendanceDate, item.session);
  }

  editSession(item: AttendanceSummary): void {
    this.openEditor('edit', item.attendanceDate, item.session);
  }

  deleteSession(item: AttendanceSummary): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        title: this.text('Șterge prezența', 'Delete attendance'),
        message: this.text(`Sigur vrei să ștergi prezența din ${item.attendanceDate}?`, `Are you sure you want to delete attendance for ${item.attendanceDate}?`),
        confirmLabel: this.text('Șterge', 'Delete'),
        cancelLabel: this.text('Anulează', 'Cancel')
      }
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.attendanceService.delete(item.attendanceDate, item.session).subscribe({
        next: () => {
          this.loadSessions();
          this.toast.success(this.text('Prezența a fost ștearsă.', 'Attendance was deleted.'));
        },
        error: (error) => this.toast.error(apiErrorMessage(error, this.text('Nu s-a putut șterge prezența.', 'Attendance could not be deleted.')))
      });
    });
  }

  loadSessions(): void {
    this.attendanceService.sessions().subscribe({
      next: (sessions) => this.sessions.set(sessions),
      error: (error) => this.toast.error(apiErrorMessage(error, this.text('Nu s-au putut încărca sesiunile de prezență.', 'Attendance sessions could not be loaded.')))
    });
  }

  sessionLabel(session: AttendanceSession): string {
    return session === 'MORNING'
      ? this.text('dimineața', 'morning')
      : session === 'EVENING'
        ? this.text('seara', 'evening')
        : this.text('implicit', 'default');
  }

  sortBy(column: AttendanceSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
      return;
    }
    this.sortColumn.set(column);
    this.sortDirection.set(column === 'attendanceDate' ? 'desc' : 'asc');
  }

  sortIcon(column: AttendanceSortColumn): string {
    if (this.sortColumn() !== column) {
      return 'unfold_more';
    }
    return this.sortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  exportRows(format: 'csv' | 'pdf'): void {
    const rows = this.filteredSessions();
    const columns = [
      { header: this.text('Ziua', 'Date'), value: (item: AttendanceSummary) => this.formatDate(item.attendanceDate) },
      { header: this.text('Program', 'Service'), value: (item: AttendanceSummary) => this.sessionLabel(item.session) },
      { header: this.text('Prezenți', 'Present'), value: (item: AttendanceSummary) => item.presentCount },
      { header: this.text('Absenți', 'Absent'), value: (item: AttendanceSummary) => item.absentCount },
      { header: this.text('Total', 'Total'), value: (item: AttendanceSummary) => item.totalCount },
      { header: this.text('Completat de', 'Recorded by'), value: (item: AttendanceSummary) => item.recordedBy }
    ];
    if (format === 'pdf') {
      exportStyledPdf({
        filename: this.language.language() === 'en' ? 'attendance.pdf' : 'prezenta.pdf',
        title: this.text('Prezență', 'Attendance'),
        rows,
        columns
      });
      return;
    }
    exportCsv(this.language.language() === 'en' ? 'attendance.csv' : 'prezenta.csv', rows, columns);
  }

  private openEditor(mode: 'create' | 'view' | 'edit', attendanceDate: string, session: AttendanceSession): void {
    const dialogRef = this.dialog.open(AttendanceEditorDialogComponent, {
      width: '1040px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        mode,
        attendanceDate,
        session,
        groups: this.groups()
      }
    });

    dialogRef.afterClosed().subscribe((changed) => {
      if (changed) {
        this.loadSessions();
      }
    });
  }

  private formatDate(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    return new Intl.DateTimeFormat('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(year, month - 1, day));
  }

  private matchesResultFilter(item: AttendanceSummary): boolean {
    if (this.resultFilter() === 'WITH_PRESENT') {
      return item.presentCount > 0;
    }
    if (this.resultFilter() === 'WITHOUT_PRESENT') {
      return item.presentCount === 0;
    }
    if (this.resultFilter() === 'WITH_ABSENT') {
      return item.absentCount > 0;
    }
    return true;
  }

  private sortSessions(rows: AttendanceSummary[]): AttendanceSummary[] {
    const column = this.sortColumn();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    return [...rows].sort((left, right) => this.compareSortValue(left, right, column) * direction);
  }

  private compareSortValue(left: AttendanceSummary, right: AttendanceSummary, column: AttendanceSortColumn): number {
    if (column === 'attendanceDate') {
      return left.attendanceDate.localeCompare(right.attendanceDate);
    }
    if (column === 'session') {
      return this.sessionLabel(left.session).localeCompare(this.sessionLabel(right.session), 'ro');
    }
    if (column === 'recordedBy') {
      return String(left.recordedBy || '').localeCompare(String(right.recordedBy || ''), 'ro');
    }
    return Number(left[column]) - Number(right[column]);
  }
}

function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function attendanceSearchText(item: AttendanceSummary, dateLabel: string, sessionLabel: string, ignoreDiacritics: boolean): string {
  return normalizeSearchText([
    item.attendanceDate,
    dateLabel,
    sessionLabel,
    item.presentCount,
    item.absentCount,
    item.totalCount,
    item.recordedBy
  ].join(' '), ignoreDiacritics);
}
