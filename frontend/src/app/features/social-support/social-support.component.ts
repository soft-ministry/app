import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { apiErrorMessage } from '../../shared/api-error-message';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { PageNavComponent } from '../../shared/page-nav.component';
import {
  socialNeedTypeLabel,
  socialSupportPriorityLabel,
  socialSupportStatusLabel
} from '../../shared/display-labels';
import { TablePreferencesService } from '../../shared/table-preferences.service';
import { ToastService } from '../../shared/toast.service';
import { Person } from '../persons/person.model';
import { PersonsService } from '../persons/persons.service';
import { SocialSupportDetailDialogComponent } from './social-support-detail-dialog.component';
import { SocialSupportFormDialogComponent } from './social-support-form-dialog.component';
import {
  SocialNeedType,
  SocialSupportCase,
  SocialSupportCaseRequest,
  SocialSupportPriority,
  SocialSupportStatus
} from './social-support.model';
import { SocialSupportService } from './social-support.service';

@Component({
  selector: 'app-social-support',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    PageNavComponent
  ],
  styles: [`
    .support-toolbar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      flex: 1 1 auto;
      flex-wrap: nowrap;
      min-width: 0;
      width: 100%;
    }

    .support-toolbar .toolbar-input {
      width: min(280px, 100%);
      flex: 1 1 220px;
    }

    .support-toolbar .toolbar-select {
      width: 160px;
      flex: 0 0 160px;
    }

    .support-toolbar .search-button {
      width: 40px;
      min-width: 40px;
      padding: 0;
    }

    .table-surface-header {
      justify-content: flex-end;
    }

    .summary-cell {
      max-width: 340px;
      white-space: normal;
    }

    .amount-column,
    .date-column {
      width: 132px;
    }

    .status-column,
    .type-column,
    .priority-column {
      width: 150px;
    }

    .person-column {
      width: 300px;
      min-width: 260px;
    }

    .mobile-support-list {
      display: none;
    }

    .mobile-support-card {
      display: grid;
      gap: 12px;
      padding: 13px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface);
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
    }

    .mobile-support-main {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: start;
    }

    .mobile-support-title {
      overflow: hidden;
      margin: 0;
      color: var(--app-text);
      font-size: 16px;
      font-weight: 800;
      line-height: 1.25;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mobile-support-meta {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 6px;
    }

    .mobile-support-details {
      display: grid;
      gap: 7px;
      min-width: 0;
    }

    .mobile-support-detail {
      display: grid;
      grid-template-columns: 22px minmax(0, 1fr);
      gap: 8px;
      align-items: center;
      min-width: 0;
      color: var(--app-muted);
      font-size: 13px;
      font-weight: 650;
    }

    .mobile-support-detail mat-icon {
      width: 18px;
      height: 18px;
      color: var(--app-primary-strong);
      font-size: 18px;
      line-height: 18px;
    }

    .mobile-support-detail span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mobile-support-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .mobile-support-actions .table-icon-button {
      width: 38px;
      min-width: 38px;
      height: 38px;
    }

    @media (max-width: 900px) {
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

      .support-toolbar {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 40px;
        gap: 7px;
      }

      .support-toolbar .toolbar-input {
        min-height: 38px;
        padding: 0 10px;
        font-size: 14px;
      }

      .support-toolbar .toolbar-select {
        grid-column: 1 / -1;
        min-height: 36px;
        padding: 0 9px;
        font-size: 13px;
        width: min(220px, 100%);
        justify-self: start;
      }

      .support-toolbar .search-button {
        width: 40px;
        min-width: 40px;
        min-height: 38px;
        grid-column: 2;
        grid-row: 1;
      }

      .support-toolbar .toolbar-primary-button {
        grid-column: 1 / -1;
        min-height: 38px;
        width: auto;
        justify-self: start;
      }

      .table-wrap {
        display: none;
      }

      .mobile-support-list {
        display: grid;
        gap: 10px;
      }
    }
  `],
  template: `
    <main class="page">
      <header class="page-header">
        <div class="page-header-main">
          <h1 class="page-title page-title-offset">{{ language.t('page.social') }}</h1>
          <p class="page-subtitle" aria-hidden="true">&nbsp;</p>
        </div>
        <div class="page-header-actions">
          <app-page-nav />
        </div>
      </header>

      <section class="surface table-surface">
        <div class="surface-header table-surface-header">
          <div class="support-toolbar">
            <input
              class="toolbar-control toolbar-input"
              type="search"
              [placeholder]="language.t('common.search')"
              [formControl]="query"
              (keyup.enter)="load()">

            <select class="toolbar-control toolbar-select" [formControl]="needTypeFilter" (change)="applyFilters()" [attr.aria-label]="language.language() === 'en' ? 'Need type' : 'Tip nevoie'">
              <option value="">{{ language.language() === 'en' ? 'All types' : 'Toate tipurile' }}</option>
              <option value="FINANCIAL">{{ needTypeLabel('FINANCIAL') }}</option>
              <option value="SOCIAL">{{ needTypeLabel('SOCIAL') }}</option>
              <option value="FOOD">{{ needTypeLabel('FOOD') }}</option>
              <option value="MEDICAL">{{ needTypeLabel('MEDICAL') }}</option>
              <option value="HOUSING">{{ needTypeLabel('HOUSING') }}</option>
              <option value="COUNSELING">{{ needTypeLabel('COUNSELING') }}</option>
              <option value="OTHER">{{ needTypeLabel('OTHER') }}</option>
            </select>

            <select class="toolbar-control toolbar-select" [formControl]="statusFilter" (change)="applyFilters()" [attr.aria-label]="language.t('common.status')">
              <option value="">{{ language.language() === 'en' ? 'All statuses' : 'Toate statusurile' }}</option>
              <option value="UNDER_OBSERVATION">{{ statusLabel('UNDER_OBSERVATION') }}</option>
              <option value="ACTIVE_NEED">{{ statusLabel('ACTIVE_NEED') }}</option>
              <option value="SUPPORTED">{{ statusLabel('SUPPORTED') }}</option>
              <option value="RESOLVED">{{ statusLabel('RESOLVED') }}</option>
              <option value="CLOSED">{{ statusLabel('CLOSED') }}</option>
            </select>

            <button class="toolbar-button toolbar-icon-button search-button" type="button" [attr.aria-label]="language.t('common.search')" [title]="language.t('common.search')" (click)="load()">
              <mat-icon>search</mat-icon>
            </button>
            <button class="toolbar-button toolbar-primary-button" type="button" [disabled]="!auth.isAdmin()" (click)="openCreateDialog()">
              <mat-icon>volunteer_activism</mat-icon>
              {{ language.t('common.add') }}
            </button>
          </div>
        </div>

        <div class="surface-content table-surface-content">
          @if (cases().length > 0) {
            <div class="table-wrap">
              <table class="data-table" mat-table matSort [dataSource]="dataSource">
                <ng-container matColumnDef="index">
                  <th class="number-column" mat-header-cell *matHeaderCellDef>#</th>
                  <td class="number-column" mat-cell *matCellDef="let item; let rowIndex = index">{{ rowNumber(rowIndex) }}.</td>
                </ng-container>

                <ng-container matColumnDef="personName">
                  <th class="person-column" mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.language() === 'en' ? 'Person' : 'Persoană' }}</th>
                  <td mat-cell *matCellDef="let item">
                    <span class="primary-text">{{ item.personName }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="needType">
                  <th class="type-column" mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.language() === 'en' ? 'Need' : 'Nevoie' }}</th>
                  <td mat-cell *matCellDef="let item">{{ needTypeLabel(item.needType) }}</td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th class="status-column" mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.t('common.status') }}</th>
                  <td mat-cell *matCellDef="let item">
                    <span class="badge info">{{ statusLabel(item.status) }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="priority">
                  <th class="priority-column" mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.t('common.priority') }}</th>
                  <td mat-cell *matCellDef="let item">{{ priorityLabel(item.priority) }}</td>
                </ng-container>

                <ng-container matColumnDef="assignedToName">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.t('common.responsible') }}</th>
                  <td mat-cell *matCellDef="let item">{{ item.assignedToName || '-' }}</td>
                </ng-container>

                <ng-container matColumnDef="nextReviewDate">
                  <th class="date-column" mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.language() === 'en' ? 'Review' : 'Review' }}</th>
                  <td mat-cell *matCellDef="let item">{{ formatDate(item.nextReviewDate) || '-' }}</td>
                </ng-container>

                <ng-container matColumnDef="approvedAmount">
                  <th class="amount-column" mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.language() === 'en' ? 'Approved amount' : 'Sumă aprobată' }}</th>
                  <td mat-cell *matCellDef="let item">{{ formatAmount(item.approvedAmount) || '-' }}</td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let item">
                    <div class="table-actions">
                      <button class="table-icon-button" type="button" aria-label="Vezi" (click)="openViewDialog(item)">
                        <mat-icon>visibility</mat-icon>
                      </button>
                      <button class="table-icon-button" type="button" aria-label="Editează" [disabled]="!auth.isAdmin()" (click)="openEditDialog(item)">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button class="table-icon-button" type="button" aria-label="Șterge" [disabled]="!auth.isAdmin()" (click)="delete(item)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="columns"></tr>
                <tr mat-row *matRowDef="let row; columns: columns;"></tr>
                <tr class="mat-row" *matNoDataRow>
                  <td class="mat-cell muted" [attr.colspan]="columns.length">{{ language.t('common.noResults') }}</td>
                </tr>
              </table>
              <mat-paginator [pageSize]="tablePageSize()" [pageSizeOptions]="tablePageSizeOptions()" showFirstLastButtons />
            </div>
            <div class="mobile-support-list" aria-label="Cazuri de sprijin social">
              @for (item of mobileSupportRows(); track item.id) {
                <article class="mobile-support-card">
                  <div class="mobile-support-main">
                    <div>
                      <h2 class="mobile-support-title">{{ item.personName }}</h2>
                      <div class="mobile-support-meta">
                        <span class="badge info">{{ statusLabel(item.status) }}</span>
                        <span class="badge">{{ needTypeLabel(item.needType) }}</span>
                      </div>
                    </div>
                    <div class="mobile-support-actions">
                      <button class="table-icon-button" type="button" aria-label="Vezi" (click)="openViewDialog(item)">
                        <mat-icon>visibility</mat-icon>
                      </button>
                      <button class="table-icon-button" type="button" aria-label="Editează" [disabled]="!auth.isAdmin()" (click)="openEditDialog(item)">
                        <mat-icon>edit</mat-icon>
                      </button>
                    </div>
                  </div>
                  <div class="mobile-support-details">
                    <div class="mobile-support-detail">
                      <mat-icon>priority_high</mat-icon>
                      <span>{{ priorityLabel(item.priority) }}</span>
                    </div>
                    <div class="mobile-support-detail">
                      <mat-icon>person</mat-icon>
                      <span>{{ item.assignedToName || 'Responsabil necompletat' }}</span>
                    </div>
                    <div class="mobile-support-detail">
                      <mat-icon>event</mat-icon>
                      <span>{{ formatDate(item.nextReviewDate) || 'Review neprogramat' }}</span>
                    </div>
                    <div class="mobile-support-detail">
                      <mat-icon>payments</mat-icon>
                      <span>{{ formatAmount(item.approvedAmount) || 'Sumă neaprobată' }}</span>
                    </div>
                  </div>
                </article>
              }
              @if (mobileSupportRows().length === 0) {
                <div class="empty-state">
                  <mat-icon>search_off</mat-icon>
                  <span>{{ language.t('common.noResults') }}</span>
                </div>
              }
            </div>
          } @else {
            <div class="empty-state">
              <mat-icon>volunteer_activism</mat-icon>
              <span>{{ language.language() === 'en' ? 'There are no social support cases.' : 'Nu există cazuri de sprijin social.' }}</span>
            </div>
          }
        </div>
      </section>
    </main>
  `
})
export class SocialSupportComponent implements OnInit {
  private paginator?: MatPaginator;

  @ViewChild(MatPaginator) set matPaginator(paginator: MatPaginator | undefined) {
    this.paginator = paginator;
    this.dataSource.paginator = paginator || null;
  }

  @ViewChild(MatSort) set matSort(sort: MatSort | undefined) {
    this.dataSource.sort = sort || null;
  }

  private fb = inject(FormBuilder);
  private supportService = inject(SocialSupportService);
  private personsService = inject(PersonsService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  private tablePreferences = inject(TablePreferencesService);
  auth = inject(AuthService);
  language = inject(LanguageService);
  tablePageSize = this.tablePreferences.pageSize;
  tablePageSizeOptions = this.tablePreferences.pageSizeOptions;

  columns = ['index', 'personName', 'needType', 'status', 'priority', 'assignedToName', 'nextReviewDate', 'approvedAmount', 'actions'];
  cases = signal<SocialSupportCase[]>([]);
  persons = signal<Person[]>([]);
  dataSource = new MatTableDataSource<SocialSupportCase>([]);
  query = this.fb.nonNullable.control('');
  needTypeFilter = this.fb.nonNullable.control<SocialNeedType | ''>('');
  statusFilter = this.fb.nonNullable.control<SocialSupportStatus | ''>('');

  ngOnInit(): void {
    this.dataSource.sortingDataAccessor = (item, column) => {
      if (column === 'needType') {
        return socialNeedTypeLabel(item.needType);
      }
      if (column === 'status') {
        return socialSupportStatusLabel(item.status);
      }
      if (column === 'priority') {
        return priorityOrder(item.priority);
      }
      return String(item[column as keyof SocialSupportCase] || '');
    };
    this.load();
  }

  rowNumber(index: number): number {
    const pageIndex = this.paginator?.pageIndex || 0;
    const pageSize = this.paginator?.pageSize || this.dataSource.filteredData.length || 10;
    return pageIndex * pageSize + index + 1;
  }

  mobileSupportRows(): SocialSupportCase[] {
    const rows = [...this.dataSource.filteredData];
    return this.dataSource.sort ? this.dataSource.sortData(rows, this.dataSource.sort) : rows;
  }

  load(): void {
    this.loadPersons();
    this.supportService.list(this.query.value).subscribe({
      next: (cases) => {
        this.cases.set(cases);
        this.applyFilters(false);
      },
      error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-au putut încărca cazurile de sprijin.'))
    });
  }

  applyFilters(resetPage = true): void {
    const needType = this.needTypeFilter.value;
    const status = this.statusFilter.value;
    this.dataSource.data = this.cases().filter((item) =>
      (!needType || item.needType === needType)
      && (!status || item.status === status));
    if (resetPage) {
      this.paginator?.firstPage();
    }
  }

  openCreateDialog(): void {
    this.openSupportDialog();
  }

  openEditDialog(item: SocialSupportCase): void {
    this.openSupportDialog(item);
  }

  openViewDialog(item: SocialSupportCase): void {
    this.dialog.open(SocialSupportDetailDialogComponent, {
      width: '620px',
      maxWidth: 'calc(100vw - 32px)',
      data: item
    });
  }

  delete(item: SocialSupportCase): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        title: 'Șterge cazul de sprijin',
        message: `Sigur vrei să ștergi cazul pentru ${item.personName}?`,
        confirmLabel: 'Șterge'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.supportService.delete(item.id).subscribe({
        next: () => {
          this.toast.success('Cazul de sprijin a fost șters.');
          this.load();
        },
        error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-a putut șterge cazul de sprijin.'))
      });
    });
  }

  needTypeLabel = socialNeedTypeLabel;
  statusLabel = socialSupportStatusLabel;
  priorityLabel = socialSupportPriorityLabel;

  formatDate(value?: string | null): string {
    if (!value) {
      return '';
    }
    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}.${month}.${year}` : value;
  }

  formatAmount(value?: number | null): string {
    if (value === null || value === undefined) {
      return '';
    }
    return new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 }).format(value);
  }

  private openSupportDialog(item?: SocialSupportCase): void {
    this.personsService.list().subscribe({
      next: (persons) => {
        this.persons.set(persons);
        this.openSupportDialogWithPersons(item);
      },
      error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-au putut încărca persoanele.'))
    });
  }

  private loadPersons(): void {
    this.personsService.list().subscribe({
      next: (persons) => this.persons.set(persons),
      error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-au putut încărca persoanele.'))
    });
  }

  private openSupportDialogWithPersons(item?: SocialSupportCase): void {
    const dialogRef = this.dialog.open(SocialSupportFormDialogComponent, {
      width: '780px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        case: item || null,
        persons: this.persons()
      }
    });

    dialogRef.afterClosed().subscribe((request: SocialSupportCaseRequest | undefined) => {
      if (!request) {
        return;
      }

      const save$ = item
        ? this.supportService.update(item.id, request)
        : this.supportService.create(request);

      save$.subscribe({
        next: () => {
          this.toast.success(item ? 'Cazul de sprijin a fost actualizat.' : 'Cazul de sprijin a fost adăugat.');
          this.load();
        },
        error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-a putut salva cazul de sprijin.'))
      });
    });
  }
}

function priorityOrder(priority: SocialSupportPriority): number {
  const order: Record<SocialSupportPriority, number> = {
    URGENT: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3
  };
  return order[priority];
}
