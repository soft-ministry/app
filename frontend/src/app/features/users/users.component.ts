import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { AppearanceThemeService } from '../../core/theme/appearance-theme.service';
import { LanguageService } from '../../core/language.service';
import { apiErrorMessage } from '../../shared/api-error-message';
import { exportCsv } from '../../shared/csv-export';
import { normalizeSearchText } from '../../shared/search-normalization';
import { ToastService } from '../../shared/toast.service';
import { UserAccount, UserAccountRequest, UserRole } from './user-account.model';
import { UserFormDialogComponent } from './user-form-dialog.component';
import { UsersService } from './users.service';
import { PageNavComponent } from '../../shared/page-nav.component';
import { TablePreferencesService } from '../../shared/table-preferences.service';

@Component({
  selector: 'app-users',
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
    .users-toolbar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      flex: 1 1 auto;
      flex-wrap: nowrap;
      min-width: 0;
      width: 100%;
    }

    .users-toolbar .toolbar-input {
      width: min(340px, 100%);
      flex: 1 1 240px;
    }

    .users-toolbar button {
      flex: 0 0 auto;
    }

    .users-toolbar .search-button {
      width: 40px;
      min-width: 40px;
      padding: 0;
    }

    .table-surface-header {
      justify-content: flex-end;
    }

    .role-column,
    .status-column {
      width: 150px;
    }

    @media (max-width: 720px) {
      .users-toolbar {
        align-items: stretch;
        flex-direction: column;
      }

      .users-toolbar .toolbar-input,
      .users-toolbar button {
        width: 100%;
      }

      .users-toolbar .search-button {
        width: 100%;
      }
    }
  `],
  template: `
    <main class="page">
      <header class="page-header">
        <div class="page-header-main">
          <h1 class="page-title page-title-offset">{{ language.language() === 'en' ? 'Users' : 'Utilizatori' }}</h1>
          <p class="page-subtitle" aria-hidden="true">&nbsp;</p>
        </div>
        <div class="page-header-actions">
          <app-page-nav />
        </div>
      </header>

      <section class="surface table-surface">
        <div class="surface-header table-surface-header">
          <div class="users-toolbar">
            <input
              class="toolbar-control toolbar-input"
              type="search"
              [placeholder]="language.t('common.search')"
              [formControl]="query"
              (keyup.enter)="applyFilter()">
            <button class="toolbar-button toolbar-icon-button search-button" type="button" [attr.aria-label]="language.t('common.search')" [title]="language.t('common.search')" (click)="applyFilter()">
              <mat-icon>search</mat-icon>
            </button>
            <button class="toolbar-button toolbar-secondary-button" type="button" (click)="exportRows()">
              <mat-icon>download</mat-icon>
              {{ text('Export', 'Export') }}
            </button>
            <button class="toolbar-button toolbar-primary-button" type="button" (click)="openCreateDialog()">
              <mat-icon>person_add</mat-icon>
              {{ text('Adaugă', 'Add') }}
            </button>
          </div>
        </div>
        <div class="surface-content table-surface-content">
          @if (dataSource.filteredData.length > 0) {
            <div class="table-wrap">
              <table class="data-table" mat-table matSort [dataSource]="dataSource">
                <ng-container matColumnDef="index">
                  <th class="number-column" mat-header-cell *matHeaderCellDef>#</th>
                  <td class="number-column" mat-cell *matCellDef="let user; let rowIndex = index">{{ rowNumber(rowIndex) }}.</td>
                </ng-container>

                <ng-container matColumnDef="username">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.language() === 'en' ? 'User' : 'Utilizator' }}</th>
                  <td mat-cell *matCellDef="let user">
                    <span class="primary-text">{{ user.username }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="role">
                  <th class="role-column" mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.language() === 'en' ? 'Role' : 'Rol' }}</th>
                  <td mat-cell *matCellDef="let user">
                    <span class="badge info">{{ roleLabel(user.role) }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="enabled">
                  <th class="status-column" mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.t('common.status') }}</th>
                  <td mat-cell *matCellDef="let user">
                    <span class="badge" [class.warning]="!user.enabled">{{ user.enabled ? text('activ', 'active') : text('inactiv', 'inactive') }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let user">
                    <div class="table-actions">
                      <button class="table-icon-button" type="button" [attr.aria-label]="text('Editează', 'Edit')" (click)="openEditDialog(user)">
                        <mat-icon>edit</mat-icon>
                      </button>
                    </div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="columns"></tr>
                <tr mat-row *matRowDef="let row; columns: columns;"></tr>
              </table>
              <mat-paginator [pageSize]="tablePageSize()" [pageSizeOptions]="tablePageSizeOptions()" showFirstLastButtons />
            </div>
          } @else {
            <div class="empty-state">
              <mat-icon>manage_accounts</mat-icon>
              <span>{{ text('Nu există utilizatori în listă.', 'There are no users in the list.') }}</span>
            </div>
          }
        </div>
      </section>
    </main>
  `
})
export class UsersComponent implements OnInit {
  language = inject(LanguageService);
  private paginator?: MatPaginator;

  @ViewChild(MatPaginator) set matPaginator(paginator: MatPaginator | undefined) {
    this.paginator = paginator;
    this.dataSource.paginator = paginator || null;
  }

  @ViewChild(MatSort) set matSort(sort: MatSort | undefined) {
    this.dataSource.sort = sort || null;
  }

  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  private tablePreferences = inject(TablePreferencesService);
  private themeService = inject(AppearanceThemeService);
  tablePageSize = this.tablePreferences.pageSize;
  tablePageSizeOptions = this.tablePreferences.pageSizeOptions;

  columns = ['index', 'username', 'role', 'enabled', 'actions'];
  users = signal<UserAccount[]>([]);
  dataSource = new MatTableDataSource<UserAccount>([]);
  query = this.fb.nonNullable.control('');

  text(ro: string, en: string): string {
    return this.language.language() === 'en' ? en : ro;
  }

  ngOnInit(): void {
    this.dataSource.sortingDataAccessor = (user, column) => {
      if (column === 'role') {
        return this.roleLabel(user.role);
      }
      return String(user[column as keyof UserAccount] || '');
    };
    this.dataSource.filterPredicate = (user, filter) => {
      const ignoreDiacritics = this.themeService.current().searchIgnoreDiacritics === 'true';
      const searchable = [
        user.username,
        this.roleLabel(user.role),
        user.enabled ? this.text('activ', 'active') : this.text('inactiv', 'inactive')
      ].join(' ');
      return normalizeSearchText(searchable, ignoreDiacritics).includes(filter);
    };
    this.load();
  }

  rowNumber(index: number): number {
    const pageIndex = this.paginator?.pageIndex || 0;
    const pageSize = this.paginator?.pageSize || this.dataSource.filteredData.length || 10;
    return pageIndex * pageSize + index + 1;
  }

  load(): void {
    this.usersService.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.dataSource.data = users;
        this.applyFilter(false);
      },
      error: (error) => this.toast.error(apiErrorMessage(error, this.text('Nu s-au putut încărca utilizatorii.', 'Users could not be loaded.')))
    });
  }

  applyFilter(resetPage = true): void {
    const ignoreDiacritics = this.themeService.current().searchIgnoreDiacritics === 'true';
    this.dataSource.filter = normalizeSearchText(this.query.value, ignoreDiacritics);
    if (resetPage) {
      this.paginator?.firstPage();
    }
  }

  activeUsers(): number {
    return this.users().filter((user) => user.enabled).length;
  }

  openCreateDialog(): void {
    this.openUserDialog();
  }

  openEditDialog(user: UserAccount): void {
    this.openUserDialog(user);
  }

  exportRows(): void {
    exportCsv(this.language.language() === 'en' ? 'users.csv' : 'utilizatori.csv', this.dataSource.filteredData, [
      { header: this.text('Utilizator', 'User'), value: (user) => user.username },
      { header: this.text('Rol', 'Role'), value: (user) => this.roleLabel(user.role) },
      { header: this.text('Status', 'Status'), value: (user) => user.enabled ? this.text('activ', 'active') : this.text('inactiv', 'inactive') }
    ]);
  }

  roleLabel(role: UserRole): string {
    return role === 'ADMIN' ? this.text('administrator', 'administrator') : this.text('utilizator', 'user');
  }

  private openUserDialog(user?: UserAccount): void {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: '520px',
      maxWidth: 'calc(100vw - 32px)',
      data: { user: user || null }
    });

    dialogRef.afterClosed().subscribe((request: UserAccountRequest | undefined) => {
      if (!request) {
        return;
      }
      const save$ = user
        ? this.usersService.update(user.id, request)
        : this.usersService.create(request);
      save$.subscribe({
        next: () => {
          this.toast.success(user
            ? this.text('Utilizatorul a fost actualizat.', 'User was updated.')
            : this.text('Utilizatorul a fost adăugat.', 'User was added.'));
          this.load();
        },
        error: (error) => this.toast.error(apiErrorMessage(error, this.text('Nu s-a putut salva utilizatorul.', 'User could not be saved.')))
      });
    });
  }
}
