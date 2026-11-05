import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { apiErrorMessage } from '../../shared/api-error-message';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { exportCsv } from '../../shared/csv-export';
import { groupTypeLabel } from '../../shared/display-labels';
import { ToastService } from '../../shared/toast.service';
import { GroupDetailDialogComponent } from './group-detail-dialog.component';
import { GroupFormDialogComponent } from './group-form-dialog.component';
import { Group, GroupRequest, GroupType } from './group.model';
import { GroupsService } from './groups.service';
import { PageNavComponent } from '../../shared/page-nav.component';
import { TablePreferencesService } from '../../shared/table-preferences.service';
import { Person } from '../persons/person.model';
import { PersonsService } from '../persons/persons.service';

@Component({
  selector: 'app-groups',
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
    .groups-toolbar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      flex: 1 1 auto;
      flex-wrap: nowrap;
      min-width: 0;
      width: 100%;
    }

    .groups-toolbar .toolbar-select {
      width: 150px;
    }

    .groups-toolbar .toolbar-input {
      width: min(280px, 100%);
      flex: 1 1 220px;
    }

    .groups-toolbar button {
      flex: 0 0 auto;
    }

    .groups-toolbar .search-button {
      width: 40px;
      min-width: 40px;
      padding: 0;
    }

    .table-surface-header {
      justify-content: flex-end;
    }

    .members-column {
      width: 110px;
    }

    .whatsapp-column {
      width: 122px;
    }

    .whatsapp-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      width: fit-content;
      color: #047857;
      font-size: 13px;
      font-weight: 750;
      text-decoration: none;
      white-space: nowrap;
    }

    .whatsapp-link:hover {
      color: #065f46;
      text-decoration: underline;
    }

    .whatsapp-link mat-icon {
      width: 17px;
      height: 17px;
      font-size: 17px;
      line-height: 17px;
    }

    .type-column {
      width: 150px;
    }

    .group-row {
      cursor: default;
    }

    .group-row:hover {
      background: #ffffff;
    }

    .mobile-group-list {
      display: none;
    }

    .mobile-group-card {
      display: grid;
      gap: 12px;
      padding: 13px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface);
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
    }

    .mobile-group-main {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: start;
    }

    .mobile-group-title {
      overflow: hidden;
      margin: 0;
      color: var(--app-text);
      font-size: 16px;
      font-weight: 800;
      line-height: 1.25;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mobile-group-meta {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 6px;
    }

    .mobile-group-details {
      display: grid;
      gap: 7px;
      min-width: 0;
    }

    .mobile-group-detail {
      display: grid;
      grid-template-columns: 22px minmax(0, 1fr);
      gap: 8px;
      align-items: center;
      min-width: 0;
      color: var(--app-muted);
      font-size: 13px;
      font-weight: 650;
    }

    .mobile-group-detail mat-icon {
      width: 18px;
      height: 18px;
      color: var(--app-primary-strong);
      font-size: 18px;
      line-height: 18px;
    }

    .mobile-group-detail span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mobile-group-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .mobile-group-actions .table-icon-button {
      width: 38px;
      min-width: 38px;
      height: 38px;
    }

    @media (max-width: 760px) {
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

      .groups-toolbar {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 40px;
        gap: 7px;
        width: 100%;
      }

      .groups-toolbar .toolbar-input {
        min-height: 38px;
        padding: 0 10px;
        font-size: 14px;
      }

      .groups-toolbar .toolbar-select {
        grid-column: 1 / -1;
        min-height: 36px;
        padding: 0 9px;
        font-size: 13px;
        width: min(220px, 100%);
        justify-self: start;
      }

      .groups-toolbar .search-button {
        width: 40px;
        min-width: 40px;
        min-height: 38px;
        grid-column: 2;
        grid-row: 1;
      }

      .groups-toolbar .toolbar-secondary-button,
      .groups-toolbar .toolbar-primary-button {
        min-height: 38px;
        width: auto;
        justify-self: start;
      }

      .table-wrap {
        display: none;
      }

      .mobile-group-list {
        display: grid;
        gap: 10px;
      }
    }
  `],
  template: `
    <main class="page">
      <header class="page-header">
        <div class="page-header-main">
          <h1 class="page-title page-title-offset">{{ language.t('page.groups') }}</h1>
          <p class="page-subtitle" aria-hidden="true">&nbsp;</p>
        </div>
        <div class="page-header-actions">
          <app-page-nav />
        </div>
      </header>

      <section class="surface table-surface">
        <div class="surface-header table-surface-header">
          <div class="groups-toolbar">
            <input
              class="toolbar-control toolbar-input"
              type="search"
              [placeholder]="language.t('common.search')"
              [formControl]="query"
              (keyup.enter)="load()">

            <select class="toolbar-control toolbar-select" [formControl]="typeFilter" (change)="applyFilters()" [attr.aria-label]="language.t('common.type')">
              <option value="">{{ language.t('common.all') }}</option>
              <option value="SMALL_GROUP">{{ groupTypeLabel('SMALL_GROUP') }}</option>
              <option value="MINISTRY">{{ groupTypeLabel('MINISTRY') }}</option>
              <option value="TEAM">{{ groupTypeLabel('TEAM') }}</option>
              <option value="CLASS">{{ groupTypeLabel('CLASS') }}</option>
              <option value="OTHER">{{ groupTypeLabel('OTHER') }}</option>
            </select>

            <button class="toolbar-button toolbar-icon-button search-button" type="button" [attr.aria-label]="language.t('common.search')" [title]="language.t('common.search')" (click)="load()">
              <mat-icon>search</mat-icon>
            </button>
            <button class="toolbar-button toolbar-secondary-button" type="button" (click)="exportRows()">
              <mat-icon>download</mat-icon>
              {{ language.t('common.export') }}
            </button>
            <button class="toolbar-button toolbar-primary-button" type="button" [disabled]="!auth.isAdmin()" (click)="openCreateDialog()">
              <mat-icon>group_add</mat-icon>
              {{ language.t('common.add') }}
            </button>
          </div>
        </div>
        <div class="surface-content table-surface-content">

          @if (groups().length > 0) {
            <div class="table-wrap">
                <table class="data-table" mat-table matSort [dataSource]="dataSource">
                  <ng-container matColumnDef="index">
                    <th class="number-column" mat-header-cell *matHeaderCellDef>#</th>
                    <td class="number-column" mat-cell *matCellDef="let group; let rowIndex = index">{{ rowNumber(rowIndex) }}.</td>
                  </ng-container>

                  <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.t('common.name') }}</th>
                  <td mat-cell *matCellDef="let group">
                    <span class="primary-text">{{ group.name }}</span>
                  </td>
                </ng-container>

                  <ng-container matColumnDef="type">
                  <th class="type-column" mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.t('common.type') }}</th>
                  <td mat-cell *matCellDef="let group">
                    <span class="badge info">{{ groupTypeLabel(group.type) }}</span>
                  </td>
                </ng-container>

                  <ng-container matColumnDef="members">
                  <th class="members-column" mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.language() === 'en' ? 'Members' : 'Membri' }}</th>
                  <td mat-cell *matCellDef="let group">{{ group.memberCount }}</td>
                </ng-container>

                <ng-container matColumnDef="leader">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.language() === 'en' ? 'Leader' : 'Lider' }}</th>
                  <td mat-cell *matCellDef="let group">{{ group.leaderName || '-' }}</td>
                </ng-container>

                <ng-container matColumnDef="whatsappLink">
                  <th class="whatsapp-column" mat-header-cell *matHeaderCellDef>WhatsApp</th>
                  <td mat-cell *matCellDef="let group">
                    @if (group.whatsappLink) {
                      <a class="whatsapp-link" [href]="group.whatsappLink" target="_blank" rel="noopener noreferrer">
                        <mat-icon>open_in_new</mat-icon>
                        {{ language.language() === 'en' ? 'Open' : 'Deschide' }}
                      </a>
                    } @else {
                      <span class="muted">-</span>
                    }
                  </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let group">
                    <div class="table-actions">
                      <button class="table-icon-button" type="button" aria-label="Vezi" (click)="openViewDialog(group)">
                        <mat-icon>visibility</mat-icon>
                      </button>
                      <button class="table-icon-button" type="button" aria-label="Editează" [disabled]="!auth.isAdmin()" (click)="openEditDialog(group)">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button class="table-icon-button" type="button" aria-label="Șterge" [disabled]="!auth.isAdmin()" (click)="delete(group)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="columns"></tr>
                <tr class="group-row" mat-row *matRowDef="let row; columns: columns;"></tr>
                <tr class="mat-row" *matNoDataRow>
                  <td class="mat-cell muted" [attr.colspan]="columns.length">{{ language.t('common.noResults') }}</td>
                </tr>
              </table>
              <mat-paginator [pageSize]="tablePageSize()" [pageSizeOptions]="tablePageSizeOptions()" showFirstLastButtons />
            </div>
            <div class="mobile-group-list" aria-label="Grupuri">
              @for (group of mobileGroupRows(); track group.id) {
                <article class="mobile-group-card">
                  <div class="mobile-group-main">
                    <div>
                      <h2 class="mobile-group-title">{{ group.name }}</h2>
                      <div class="mobile-group-meta">
                        <span class="badge info">{{ groupTypeLabel(group.type) }}</span>
                        <span class="badge">{{ group.memberCount }} {{ language.language() === 'en' ? 'members' : 'membri' }}</span>
                      </div>
                    </div>
                    <div class="mobile-group-actions">
                      <button class="table-icon-button" type="button" aria-label="Vezi" (click)="openViewDialog(group)">
                        <mat-icon>visibility</mat-icon>
                      </button>
                      <button class="table-icon-button" type="button" aria-label="Editează" [disabled]="!auth.isAdmin()" (click)="openEditDialog(group)">
                        <mat-icon>edit</mat-icon>
                      </button>
                    </div>
                  </div>
                  <div class="mobile-group-details">
                    <div class="mobile-group-detail">
                      <mat-icon>person</mat-icon>
                      <span>{{ group.leaderName || 'Lider necompletat' }}</span>
                    </div>
                    <div class="mobile-group-detail">
                      <mat-icon>notes</mat-icon>
                      <span>{{ group.description || 'Fără descriere' }}</span>
                    </div>
                    <div class="mobile-group-detail">
                      <mat-icon>chat</mat-icon>
                      @if (group.whatsappLink) {
                        <a class="whatsapp-link" [href]="group.whatsappLink" target="_blank" rel="noopener noreferrer">Deschide grupul WhatsApp</a>
                      } @else {
                        <span>Link WhatsApp necompletat</span>
                      }
                    </div>
                  </div>
                </article>
              }
              @if (mobileGroupRows().length === 0) {
                <div class="empty-state">
                  <mat-icon>search_off</mat-icon>
                  <span>{{ language.t('common.noResults') }}</span>
                </div>
              }
            </div>
          } @else {
            <div class="empty-state">
              <mat-icon>diversity_3</mat-icon>
              <span>{{ language.language() === 'en' ? 'There are no groups in the list.' : 'Nu există grupuri în listă.' }}</span>
            </div>
          }
        </div>
      </section>
    </main>
  `
})
export class GroupsComponent implements OnInit {
  private paginator?: MatPaginator;

  @ViewChild(MatPaginator) set matPaginator(paginator: MatPaginator | undefined) {
    this.paginator = paginator;
    this.dataSource.paginator = paginator || null;
  }

  @ViewChild(MatSort) set matSort(sort: MatSort | undefined) {
    this.dataSource.sort = sort || null;
  }

  private fb = inject(FormBuilder);
  private groupsService = inject(GroupsService);
  private personsService = inject(PersonsService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  private tablePreferences = inject(TablePreferencesService);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);
  language = inject(LanguageService);
  tablePageSize = this.tablePreferences.pageSize;
  tablePageSizeOptions = this.tablePreferences.pageSizeOptions;

  columns = ['index', 'name', 'type', 'members', 'leader', 'whatsappLink', 'actions'];
  groups = signal<Group[]>([]);
  persons = signal<Person[]>([]);
  dataSource = new MatTableDataSource<Group>([]);
  query = this.fb.nonNullable.control('');
  typeFilter = this.fb.nonNullable.control<GroupType | ''>('');

  ngOnInit(): void {
    this.dataSource.sortingDataAccessor = (group, column) => {
      if (column === 'type') {
        return groupTypeLabel(group.type);
      }
      if (column === 'members') {
        return group.memberCount;
      }
      return String(group[column as keyof Group] || '');
    };
    const params = this.route.snapshot.queryParamMap;
    this.query.setValue(params.get('q') || '');
    this.typeFilter.setValue((params.get('type') as GroupType | null) || '');
    this.load();
  }

  filteredGroups(): Group[] {
    return this.dataSource.filteredData;
  }

  mobileGroupRows(): Group[] {
    const rows = [...this.dataSource.filteredData];
    return this.dataSource.sort ? this.dataSource.sortData(rows, this.dataSource.sort) : rows;
  }

  rowNumber(index: number): number {
    const pageIndex = this.paginator?.pageIndex || 0;
    const pageSize = this.paginator?.pageSize || this.dataSource.filteredData.length || 10;
    return pageIndex * pageSize + index + 1;
  }

  applyFilters(resetPage = true): void {
    const type = this.typeFilter.value;
    this.dataSource.data = this.groups()
      .filter((group) => !type || group.type === type)
      .sort((left, right) => `${left.type}${left.name}`.localeCompare(`${right.type}${right.name}`));
    if (resetPage) {
      this.paginator?.firstPage();
    }
  }

  load(): void {
    forkJoin({
      groups: this.groupsService.list(this.query.value),
      persons: this.personsService.list()
    }).subscribe({
      next: ({ groups, persons }) => {
        this.groups.set(groups);
        this.persons.set(persons);
        this.applyFilters(false);
      },
      error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-au putut încărca grupurile.'))
    });
  }

  openCreateDialog(): void {
    this.openGroupDialog();
  }

  openViewDialog(group: Group): void {
    this.dialog.open(GroupDetailDialogComponent, {
      width: '540px',
      maxWidth: 'calc(100vw - 32px)',
      data: group
    });
  }

  openEditDialog(group: Group): void {
    this.openGroupDialog(group);
  }

  exportRows(): void {
    exportCsv('grupuri.csv', this.dataSource.filteredData, [
      { header: 'Nume', value: (group) => group.name },
      { header: 'Tip', value: (group) => groupTypeLabel(group.type) },
      { header: 'Lider', value: (group) => group.leaderName },
      { header: 'Membri', value: (group) => group.memberCount },
      { header: 'WhatsApp', value: (group) => group.whatsappLink },
      { header: 'Descriere', value: (group) => group.description }
    ]);
  }

  delete(group: Group): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        title: 'Șterge grupul',
        message: `Sigur vrei să ștergi ${group.name}?`,
        confirmLabel: 'Șterge'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.groupsService.delete(group.id).subscribe({
        next: () => {
          this.toast.success('Grupul a fost șters.');
          this.load();
        },
        error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-a putut șterge grupul.'))
      });
    });
  }

  groupTypeLabel = groupTypeLabel;

  private openGroupDialog(group?: Group): void {
    const dialogRef = this.dialog.open(GroupFormDialogComponent, {
      width: '540px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        group: group || null,
        persons: this.persons()
      }
    });

    dialogRef.afterClosed().subscribe((request: GroupRequest | undefined) => {
      if (!request) {
        return;
      }

      const save$ = group
        ? this.groupsService.update(group.id, request)
        : this.groupsService.create(request);

      save$.subscribe({
        next: () => {
          this.toast.success(group ? 'Grupul a fost actualizat.' : 'Grupul a fost adăugat.');
          this.load();
        },
        error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-a putut salva grupul.'))
      });
    });
  }
}
