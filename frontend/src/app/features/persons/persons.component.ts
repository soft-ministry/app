import { Component, HostListener, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Observable, Subscription, debounceTime, distinctUntilChanged, forkJoin, of, switchMap } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { ChurchSettingsService } from '../../core/church-settings.service';
import { AppearanceThemeService } from '../../core/theme/appearance-theme.service';
import { apiErrorMessage } from '../../shared/api-error-message';
import { memberTypeLabel } from '../../shared/display-labels';
import { exportStyledExcel, exportStyledPdf } from '../../shared/excel-export';
import { PageMenuActionsService } from '../../shared/page-menu-actions.service';
import { normalizeSearchText } from '../../shared/search-normalization';
import { TableColumnPreferencesService } from '../../shared/table-column-preferences.service';
import { TablePreferencesService } from '../../shared/table-preferences.service';
import { Group } from '../groups/group.model';
import { GroupsService } from '../groups/groups.service';
import { PersonDetailDialogComponent } from './person-detail-dialog.component';
import { Person } from './person.model';
import { PersonFormDialogComponent, PersonFormDialogResult } from './person-form-dialog.component';
import { PersonsService } from './persons.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { ToastService } from '../../shared/toast.service';
import { PageNavComponent } from '../../shared/page-nav.component';
import { FamiliesService } from '../families/families.service';
import { Family, FamilyMember, FamilyRole } from '../families/family.model';

@Component({
  selector: 'app-persons',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCheckboxModule,
    MatDialogModule,
    MatIconModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    PageNavComponent
  ],
  styles: [`
    .persons-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: space-between;
      flex: 1 1 auto;
      flex-wrap: nowrap;
      min-width: 0;
      width: 100%;
    }

    .toolbar-search-group,
    .toolbar-action-group {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .toolbar-search-group {
      justify-content: flex-start;
      flex: 1 1 auto;
    }

    .toolbar-action-group {
      justify-content: flex-end;
      flex: 0 0 auto;
    }

    .persons-toolbar .toolbar-input {
      width: min(529px, 100%);
      flex: 0 1 529px;
    }

    .persons-toolbar .type-filter,
    .persons-toolbar .status-filter {
      width: 150px;
      flex: 0 0 150px;
    }

    .persons-toolbar button {
      flex: 0 0 auto;
    }

    .persons-toolbar .search-button {
      width: 40px;
      min-width: 40px;
      padding: 0;
    }

    .persons-toolbar .add-person-button {
      width: 40px;
      min-width: 40px;
      border-radius: 25px;
      padding: 0;
    }

    .mobile-header-add-button {
      display: none;
    }

    .column-toggle {
      min-width: 0;
      color: var(--app-text);
      font-size: 14px;
      font-weight: 600;
    }

    .column-option-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 2px;
      align-items: center;
      min-height: 34px;
      padding: 0 4px 0 8px;
      border-radius: 6px;
    }

    .column-option-row:hover {
      background: #f8fafc;
    }

    .column-order-button {
      display: inline-grid !important;
      place-items: center;
      width: 28px;
      min-height: 28px !important;
      padding: 0 !important;
    }

    .column-order-button:disabled {
      cursor: default;
      opacity: 0.35;
    }

    .name-order-row {
      display: grid;
      gap: 6px;
      padding: 4px 8px 6px;
    }

    .name-order-row label {
      color: var(--app-muted);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .name-order-select {
      width: 100%;
      min-height: 34px;
      border: 1px solid var(--app-border);
      border-radius: 6px;
      background: #ffffff;
      color: var(--app-text);
      font: inherit;
      font-size: 13px;
      font-weight: 650;
      padding: 0 8px;
    }

    .table-column-context-menu {
      position: fixed;
      z-index: 1000;
      display: grid;
      min-width: 220px;
      padding: 6px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 18px 44px rgba(15, 23, 42, 0.16);
    }

    .table-column-context-menu button {
      display: flex;
      align-items: center;
      gap: 9px;
      min-height: 36px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--app-text);
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      font-weight: 650;
      padding: 0 10px;
      text-align: left;
    }

    .table-column-context-menu button:hover,
    .table-column-context-menu button:focus-visible {
      background: var(--app-primary-soft);
      color: var(--app-primary-strong);
      outline: none;
    }

    .table-column-context-menu mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
      line-height: 18px;
    }

    .table-column-context-title {
      display: flex;
      align-items: center;
      gap: 9px;
      min-height: 36px;
      border-radius: 6px;
      color: var(--app-text);
      font-size: 13px;
      font-weight: 700;
      padding: 0 10px;
    }

    .table-column-context-title mat-icon {
      color: var(--app-primary-strong);
    }

    .table-column-context-separator {
      height: 1px;
      margin: 4px 2px;
      background: var(--app-border);
    }

    .table-column-context-options {
      display: grid;
      gap: 1px;
      max-height: min(360px, calc(100vh - 120px));
      overflow-y: auto;
      padding: 2px 0;
    }

    .toolbar-count {
      color: var(--app-muted);
      font-size: 13px;
      white-space: nowrap;
    }

    .toolbar-count strong {
      color: var(--app-text);
      font-weight: 700;
    }

    .table-surface-header {
      justify-content: flex-end;
    }

    .type-column {
      width: 150px;
    }

    .person-type-cell {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-width: 0;
    }

    .inactive-person-row td {
      background: #f8fafc;
      color: #94a3b8;
    }

    .inactive-person-row .person-group-chip,
    .inactive-person-row .person-group-more {
      border-color: #e2e8f0;
      background: #f8fafc;
      color: #94a3b8;
    }

    .inactive-person-row .table-icon-button {
      color: #94a3b8;
    }

    .name-column {
      min-width: 264px;
    }

    .groups-column {
      min-width: 180px;
    }

    .role-column,
    .phone-column {
      min-width: 132px;
    }

    .person-groups {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
    }

    .person-group-chip,
    .person-group-more {
      display: inline-flex;
      align-items: center;
      max-width: 130px;
      min-height: 20px;
      border: 1px solid color-mix(in srgb, var(--table-border-color, #d7d7d7) 80%, transparent);
      border-radius: 999px;
      background: color-mix(in srgb, var(--table-header-bg, #f4f1eb) 72%, #fff);
      color: var(--table-body-color, #4b5563);
      font-size: 0.76rem;
      line-height: 1;
      overflow: hidden;
      padding: 0 7px;
      text-overflow: ellipsis;
    }

    .person-group-more {
      flex: 0 0 auto;
      color: var(--color-primary, #5b4636);
      font-weight: 700;
    }

    .mobile-person-list {
      display: none;
    }

    .mobile-person-row {
      display: grid;
      grid-template-columns: 32px minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      min-height: 62px;
      padding: 10px 11px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface);
      box-shadow: 0 5px 14px rgba(15, 23, 42, 0.04);
    }

    .mobile-person-index {
      color: var(--app-muted);
      font-size: 14px;
      font-weight: 750;
      font-variant-numeric: tabular-nums;
      text-align: right;
    }

    .mobile-person-name {
      overflow: hidden;
      margin: 0;
      color: var(--app-text);
      font-size: 17px;
      font-weight: 800;
      line-height: 1.25;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mobile-person-phone {
      overflow: hidden;
      color: var(--app-muted);
      font-size: 15px;
      font-weight: 650;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mobile-person-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .mobile-person-actions .table-icon-button {
      width: 38px;
      min-width: 38px;
      height: 38px;
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

      .persons-toolbar {
        align-items: stretch;
        flex-direction: column;
        gap: 10px;
        width: 100%;
      }

      .toolbar-search-group {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 48px;
        gap: 9px;
      }

      .toolbar-action-group {
        display: none;
      }

      .persons-toolbar .toolbar-input {
        min-height: 48px;
        padding: 0 14px;
        font-size: 16px;
      }

      .persons-toolbar .type-filter,
      .persons-toolbar .status-filter {
        min-height: 46px;
        padding: 0 14px;
        font-size: 16px;
        width: min(260px, 100%);
        justify-self: start;
      }

      .persons-toolbar .search-button {
        width: 48px;
        min-width: 48px;
        min-height: 48px;
        grid-column: 2;
        grid-row: 1;
      }

      .toolbar-count {
        grid-column: 1 / -1;
        font-size: 12px;
        text-align: center;
      }

      .persons-toolbar .type-filter {
        grid-column: 1 / -1;
      }

      .persons-toolbar .status-filter {
        grid-column: 1 / -1;
      }

      .persons-toolbar .add-person-button {
        width: 48px;
        min-width: 48px;
        min-height: 48px;
        justify-self: end;
      }

      .mobile-header-add-button {
        order: 1;
        display: inline-grid;
        place-items: center;
        flex: 0 0 auto;
        width: 2.85rem;
        min-width: 2.85rem;
        height: 2.85rem;
        min-height: 2.85rem;
        padding: 0;
        border-radius: 999px !important;
      }

      .mobile-header-add-button mat-icon {
        width: 24px;
        height: 24px;
        font-size: 24px;
        line-height: 24px;
      }

      .table-wrap {
        display: none;
      }

      .mobile-person-list {
        display: grid;
        gap: 10px;
      }
    }

  `],
  template: `
    <main class="page">
      <header class="page-header">
        <div class="page-header-main">
          <h1 class="page-title page-title-offset">{{ language.t('page.persons') }}</h1>
          <p class="page-subtitle" aria-hidden="true">&nbsp;</p>
        </div>
        <div class="page-header-actions">
          <app-page-nav>
            <button
              pageNavAfterChurch
              class="toolbar-button toolbar-primary-button mobile-header-add-button"
              type="button"
              [attr.aria-label]="language.t('common.add') + ' person'"
              [title]="language.t('common.add') + ' person'"
              [disabled]="!auth.isAdmin()"
              (click)="openCreateDialog()">
              <mat-icon>person_add</mat-icon>
            </button>
          </app-page-nav>
        </div>
      </header>

      <section class="surface table-surface">
        <div class="surface-header table-surface-header">
          <div class="persons-toolbar">
            <div class="toolbar-search-group">
              <input
                class="toolbar-control toolbar-input"
                type="search"
                [placeholder]="language.t('common.search')"
                [formControl]="query"
                (keyup.enter)="applyFilter()">
              <button class="toolbar-button toolbar-icon-button search-button" type="button" [attr.aria-label]="language.t('common.search')" [title]="language.t('common.search')" (click)="applyFilter()">
                <mat-icon>search</mat-icon>
              </button>
              <select class="toolbar-control type-filter" [formControl]="memberTypeFilter" [attr.aria-label]="language.t('common.type')" (change)="applyFilter()">
                @for (option of memberTypeFilterOptions; track option.value) {
                  @if (option.separator) {
                    <option disabled>────────────</option>
                  }
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
              <select class="toolbar-control status-filter" [formControl]="activeFilter" [attr.aria-label]="language.t('common.status')" (change)="applyFilter()">
                <option value="ALL">{{ language.language() === 'en' ? 'All' : 'Toți' }}</option>
                <option value="ACTIVE">{{ language.language() === 'en' ? 'Active' : 'Activi' }}</option>
                <option value="INACTIVE">{{ language.language() === 'en' ? 'Inactive' : 'Inactivi' }}</option>
                <option disabled>────────────</option>
                <option value="DECEASED">{{ language.language() === 'en' ? 'Deceased' : 'Decedați' }}</option>
                <option value="TRANSFERRED">{{ language.language() === 'en' ? 'Transferred' : 'Transferați' }}</option>
                <option value="WITHDRAWN">{{ language.language() === 'en' ? 'Withdrawn' : 'Retrași' }}</option>
              </select>
              <span class="toolbar-count">
                <strong>{{ dataSource.filteredData.length }}</strong>
                {{ language.language() === 'en' ? 'in list' : 'în listă' }}
              </span>
            </div>
            <div class="toolbar-action-group">
              <button
                class="toolbar-button toolbar-primary-button add-person-button"
                type="button"
                [attr.aria-label]="language.t('common.add') + ' person'"
                [title]="language.t('common.add') + ' person'"
                [disabled]="!auth.isAdmin()"
                (click)="openCreateDialog()">
                <mat-icon>person_add</mat-icon>
              </button>
            </div>
          </div>
        </div>
        <div class="surface-content table-surface-content">

          @if (persons().length > 0) {
            <div class="table-wrap">
                <table class="data-table" mat-table matSort [dataSource]="dataSource">
                  <ng-container matColumnDef="index">
                    <th class="number-column" mat-header-cell *matHeaderCellDef>#</th>
                    <td class="number-column" mat-cell *matCellDef="let person; let rowIndex = index">{{ rowNumber(rowIndex) }}.</td>
                  </ng-container>

                <ng-container matColumnDef="fullName">
                    <th class="name-column" mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.t('common.name') }}</th>
                  <td class="name-column" mat-cell *matCellDef="let person">
                    <span class="primary-text">{{ tableDisplayName(person) }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="memberType">
                    <th class="type-column" mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.t('common.type') }}</th>
                  <td mat-cell *matCellDef="let person">
                    <span class="person-type-cell">
                      <span>{{ personTypeStatusLabel(person) }}</span>
                    </span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="active">
                    <th class="type-column" mat-header-cell *matHeaderCellDef mat-sort-header>{{ language.t('common.status') }}</th>
                  <td mat-cell *matCellDef="let person">
                    <span class="badge" [class.warning]="!isActivePerson(person)">{{ personStatusLabel(person) }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="groups">
                  <th class="groups-column" mat-header-cell *matHeaderCellDef>Grupuri</th>
                  <td mat-cell *matCellDef="let person">
                    <div class="person-groups">
                      @for (group of visibleGroups(person); track group.id) {
                        <span class="person-group-chip" [title]="group.name">{{ group.name }}</span>
                      }
                      @if (hiddenGroupsCount(person) > 0) {
                        <span class="person-group-more" [title]="allGroupNames(person)">+{{ hiddenGroupsCount(person) }}</span>
                      }
                      @if (groupsFor(person).length === 0) {
                        <span>-</span>
                      }
                    </div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="churchRole">
                  <th class="role-column" mat-header-cell *matHeaderCellDef mat-sort-header>Rol</th>
                  <td mat-cell *matCellDef="let person">{{ person.churchRole || '-' }}</td>
                </ng-container>

                <ng-container matColumnDef="position">
                  <th class="role-column" mat-header-cell *matHeaderCellDef mat-sort-header>Poziție</th>
                  <td mat-cell *matCellDef="let person">{{ person.position || '-' }}</td>
                </ng-container>

                  <ng-container matColumnDef="phone">
                  <th class="phone-column" mat-header-cell *matHeaderCellDef mat-sort-header>Telefon</th>
                  <td mat-cell *matCellDef="let person">{{ person.phone || '-' }}</td>
                </ng-container>

                <ng-container matColumnDef="email">
                  <th class="phone-column" mat-header-cell *matHeaderCellDef mat-sort-header>Email</th>
                  <td mat-cell *matCellDef="let person">{{ person.email || '-' }}</td>
                </ng-container>

                <ng-container matColumnDef="address">
                  <th class="groups-column" mat-header-cell *matHeaderCellDef mat-sort-header>Adresă</th>
                  <td mat-cell *matCellDef="let person">{{ person.address || '-' }}</td>
                </ng-container>

                <ng-container matColumnDef="birthDate">
                  <th class="phone-column" mat-header-cell *matHeaderCellDef mat-sort-header>Data nașterii</th>
                  <td mat-cell *matCellDef="let person">{{ formatDate(person.birthDate) || '-' }}</td>
                </ng-container>

                <ng-container matColumnDef="age">
                  <th class="phone-column" mat-header-cell *matHeaderCellDef mat-sort-header>Vârstă</th>
                  <td mat-cell *matCellDef="let person">{{ ageLabel(person) || '-' }}</td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let person">
                    <div class="table-actions">
                      <button class="table-icon-button" type="button" aria-label="Vezi" (click)="openViewDialog(person)">
                        <mat-icon>visibility</mat-icon>
                      </button>
                      <button class="table-icon-button" type="button" aria-label="Editează" [disabled]="!auth.isAdmin()" (click)="openEditDialog(person)">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button class="table-icon-button" type="button" aria-label="Șterge" [disabled]="!auth.isAdmin()" (click)="delete(person)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="visibleColumns()" (contextmenu)="openColumnsContextMenu($event)"></tr>
                <tr mat-row *matRowDef="let row; columns: visibleColumns();" [class.inactive-person-row]="personStatus(row) === 'INACTIVE'"></tr>
                <tr class="mat-row" *matNoDataRow>
                  <td class="mat-cell muted" [attr.colspan]="visibleColumns().length">{{ language.t('common.noResults') }}</td>
                </tr>
              </table>
              <mat-paginator [pageSize]="tablePageSize()" [pageSizeOptions]="tablePageSizeOptions()" showFirstLastButtons />
            </div>
            <div class="mobile-person-list" aria-label="Persoane">
              @for (person of mobilePersonRows(); track person.id; let rowIndex = $index) {
                <article class="mobile-person-row" [class.inactive-person-row]="personStatus(person) === 'INACTIVE'">
                  <span class="mobile-person-index">{{ rowIndex + 1 }}.</span>
                  <div>
                    <h2 class="mobile-person-name">{{ mobilePersonName(person) }}</h2>
                    <div class="mobile-person-phone">{{ person.phone || 'Telefon necompletat' }}</div>
                  </div>
                  <div class="mobile-person-actions">
                    @if (person.phone) {
                      <a class="table-icon-button" [href]="phoneHref(person.phone)" aria-label="Apelează">
                        <mat-icon>call</mat-icon>
                      </a>
                    }
                    <button class="table-icon-button" type="button" aria-label="Vezi" (click)="openViewDialog(person)">
                      <mat-icon>visibility</mat-icon>
                    </button>
                    <button class="table-icon-button" type="button" aria-label="Editează" [disabled]="!auth.isAdmin()" (click)="openEditDialog(person)">
                      <mat-icon>edit</mat-icon>
                    </button>
                  </div>
                </article>
              }
              @if (mobilePersonRows().length === 0) {
                <div class="empty-state">
                  <mat-icon>search_off</mat-icon>
                <span>{{ language.t('common.noResults') }}</span>
                </div>
              }
            </div>
          } @else {
            <div class="empty-state">
              <mat-icon>person_add</mat-icon>
              <span>Nu există persoane în listă.</span>
            </div>
          }
        </div>
      </section>
      @if (columnsContextMenuOpen()) {
        <div
          class="table-column-context-menu"
          role="menu"
          [style.left.px]="columnsContextMenuPosition().x"
          [style.top.px]="columnsContextMenuPosition().y"
          (click)="$event.stopPropagation()"
          (contextmenu)="$event.preventDefault()">
          <div class="table-column-context-title" role="presentation">
            <mat-icon>view_column</mat-icon>
            Modifică coloane
          </div>
          <span class="table-column-context-separator" aria-hidden="true"></span>
          <div class="name-order-row">
            <label for="person-name-order">Ordine nume</label>
            <select
              id="person-name-order"
              class="name-order-select"
              [value]="nameDisplayOrder()"
              (change)="setNameDisplayOrder($any($event.target).value)">
              <option value="lastFirst">Nume Prenume</option>
              <option value="firstLast">Prenume Nume</option>
            </select>
          </div>
          <span class="table-column-context-separator" aria-hidden="true"></span>
          <div class="table-column-context-options">
            @for (column of orderedColumnOptions(); track column.key) {
              <div class="column-option-row">
                <mat-checkbox
                  class="column-toggle"
                  role="menuitemcheckbox"
                  [checked]="isColumnVisible(column.key)"
                  [disabled]="column.required"
                  (change)="toggleColumn(column.key, $event.checked)">
                  {{ column.label }}
                </mat-checkbox>
                <button
                  class="column-order-button"
                  type="button"
                  aria-label="Mută coloana mai sus"
                  [disabled]="!canMoveColumn(column.key, -1)"
                  (click)="moveColumn(column.key, -1)">
                  <mat-icon>keyboard_arrow_up</mat-icon>
                </button>
                <button
                  class="column-order-button"
                  type="button"
                  aria-label="Mută coloana mai jos"
                  [disabled]="!canMoveColumn(column.key, 1)"
                  (click)="moveColumn(column.key, 1)">
                  <mat-icon>keyboard_arrow_down</mat-icon>
                </button>
              </div>
            }
          </div>
        </div>
      }
    </main>
  `
})
export class PersonsComponent implements OnInit, OnDestroy {
  private paginator?: MatPaginator;
  private querySearchSubscription?: Subscription;
  private readonly nameDisplayOrderStorageKey = 'modern-ministry.persons.nameDisplayOrder';

  @ViewChild(MatPaginator) set matPaginator(paginator: MatPaginator | undefined) {
    this.paginator = paginator;
    this.dataSource.paginator = paginator || null;
  }

  @ViewChild(MatSort) set matSort(sort: MatSort | undefined) {
    this.dataSource.sort = sort || null;
  }

  private fb = inject(FormBuilder);
  private personsService = inject(PersonsService);
  private groupsService = inject(GroupsService);
  private familiesService = inject(FamiliesService);
  private churchSettingsService = inject(ChurchSettingsService);
  private themeService = inject(AppearanceThemeService);
  private toast = inject(ToastService);
  private dialog = inject(MatDialog);
  private pageMenuActions = inject(PageMenuActionsService);
  private tablePreferences = inject(TablePreferencesService);
  private tableColumnPreferences = inject(TableColumnPreferencesService);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);
  language = inject(LanguageService);
  tablePageSize = this.tablePreferences.pageSize;
  tablePageSizeOptions = this.tablePreferences.pageSizeOptions;

  private readonly columnStorageKey = 'modern-ministry.persons.columns';
  private readonly tablePreferenceId = 'persons';
  personColumnOptions: PersonColumnOption[] = [
    { key: 'index', label: 'Nr.', required: true },
    { key: 'fullName', label: 'Nume', required: true },
    { key: 'memberType', label: 'Tip' },
    { key: 'groups', label: 'Grupuri' },
    { key: 'churchRole', label: 'Rol' },
    { key: 'position', label: 'Poziție' },
    { key: 'phone', label: 'Telefon' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Adresă' },
    { key: 'birthDate', label: 'Data nașterii' },
    { key: 'age', label: 'Vârstă' }
  ];
  defaultColumns: PersonColumnKey[] = ['index', 'fullName', 'memberType', 'groups', 'churchRole', 'phone'];
  columns = signal<PersonColumnKey[]>(this.loadStoredColumns());
  nameDisplayOrder = signal<PersonNameDisplayOrder>(this.loadNameDisplayOrder());
  columnsContextMenuOpen = signal(false);
  columnsContextMenuPosition = signal({ x: 0, y: 0 });
  persons = signal<Person[]>([]);
  families = signal<Family[]>([]);
  groupsByPersonId = signal<Record<number, Group[]>>({});
  dataSource = new MatTableDataSource<Person>([]);
  query = this.fb.nonNullable.control('');
  memberTypeFilter = this.fb.nonNullable.control<PersonMemberTypeFilter>('MEMBERS_AND_CHILDREN');
  activeFilter = this.fb.nonNullable.control<PersonActiveFilter>('ALL');
  groupFilter: PersonGroupFilter = 'ALL';
  contactFilter: PersonContactFilter = 'ALL';
  memberTypeFilterOptions: PersonMemberTypeFilterOption[] = [
    { value: 'MEMBERS_AND_CHILDREN', label: this.language.language() === 'en' ? 'Members + children' : 'Membri + copii' },
    { value: 'MEMBER', label: this.language.language() === 'en' ? 'Members' : 'Membri' },
    { value: 'CHILD', label: this.language.language() === 'en' ? 'Children' : 'Copii' },
    { value: 'ACTIVE_PERSONS', label: this.language.language() === 'en' ? 'Active members' : 'Membri Activi', separator: true },
    { value: 'INACTIVE_PERSONS', label: this.language.language() === 'en' ? 'Inactive members' : 'Membri Inactivi' },
    { value: 'ALL_VISITORS', label: this.language.language() === 'en' ? 'Regular + occasional visitors' : 'Vizitatori constanți + ocazionali', separator: true },
    { value: 'VISITOR', label: this.language.language() === 'en' ? 'Regular visitors' : 'Constanți' },
    { value: 'OCCASIONAL_VISITOR', label: this.language.language() === 'en' ? 'Occasional visitors' : 'Ocazionali' }
  ];

  ngOnInit(): void {
    this.pageMenuActions.setActions([
      {
        id: 'persons-export-excel',
        label: 'Export Excel',
        icon: 'table_view',
        run: () => this.exportRows('excel')
      },
      {
        id: 'persons-export-pdf',
        label: 'Export PDF',
        icon: 'picture_as_pdf',
        run: () => this.exportRows('pdf')
      }
    ]);
    this.loadBackendColumns();
    this.dataSource.sortingDataAccessor = (person, column) => {
      if (column === 'fullName') {
        return this.displayName(person);
      }
      if (column === 'memberType') {
        return this.personTypeStatusLabel(person);
      }
      if (column === 'groups') {
        return this.groupsFor(person).map((group) => group.name).join(' ');
      }
      if (column === 'age') {
        return this.ageYears(person) ?? '';
      }
      if (column === 'active') {
        return this.personStatusLabel(person);
      }
      return String(person[column as keyof Person] || '');
    };
    this.dataSource.filterPredicate = (person, filter) => {
      const criteria = this.parseFilterCriteria(filter);
      if (!this.matchesPersonFilter(person, criteria.memberType)) {
        return false;
      }
      if (!this.matchesActiveFilter(person, criteria.active)) {
        return false;
      }
      if (!this.matchesGroupFilter(person, criteria.group)) {
        return false;
      }
      if (!this.matchesContactFilter(person, criteria.contact)) {
        return false;
      }
      const searchable = [
        person.fullName,
        memberTypeLabel(person.memberType),
        this.isActivePerson(person) ? 'activ' : 'inactiv',
        person.phone,
        person.email,
        person.churchRole,
        person.position,
        person.address,
        this.ageYears(person),
        this.groupAssignmentLabel(person),
        this.allGroupNames(person)
      ].join(' ');
      const normalizedSearchable = normalizeSearchText(searchable, criteria.ignoreDiacritics);
      return normalizedSearchable.includes(criteria.query);
    };
    this.query.setValue(this.route.snapshot.queryParamMap.get('q') || '');
    const routeMemberType = this.route.snapshot.queryParamMap.get('memberType') as PersonMemberTypeFilter | null;
    if (routeMemberType && this.memberTypeFilterOptions.some((option) => option.value === routeMemberType)) {
      this.memberTypeFilter.setValue(routeMemberType);
    }
    const routeActive = this.route.snapshot.queryParamMap.get('active');
    if (routeActive === 'true') {
      this.activeFilter.setValue('ACTIVE');
    }
    if (routeActive === 'false') {
      this.activeFilter.setValue('INACTIVE');
    }
    const routeGroup = this.route.snapshot.queryParamMap.get('group');
    if (routeGroup === 'none' || routeGroup === 'assigned') {
      this.groupFilter = routeGroup;
    }
    const routeContact = this.route.snapshot.queryParamMap.get('contact');
    if (routeContact === 'incomplete' || routeContact === 'complete') {
      this.contactFilter = routeContact;
    }
    this.querySearchSubscription = this.query.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe((value) => {
        const length = value.trim().length;
        if (length === 0 || length > 2) {
          this.applyFilter();
        }
      });
    this.load();
  }

  ngOnDestroy(): void {
    this.querySearchSubscription?.unsubscribe();
    this.pageMenuActions.clear();
  }

  @HostListener('document:click')
  closeColumnsContextMenu(): void {
    this.columnsContextMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  closeColumnsContextMenuOnEscape(): void {
    this.columnsContextMenuOpen.set(false);
  }

  openColumnsContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.columnsContextMenuPosition.set(this.contextMenuPosition(event));
    this.columnsContextMenuOpen.set(true);
  }

  load(): void {
    forkJoin({
      people: this.personsService.list(),
      groups: this.groupsService.list(),
      families: this.familiesService.list()
    }).subscribe({
      next: ({ people, groups, families }) => {
        this.persons.set(people);
        this.families.set(families);
        this.groupsByPersonId.set(this.mapGroupsByPerson(groups));
        this.dataSource.data = people;
        this.applyFilter();
      },
      error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-au putut încărca persoanele.'))
    });
  }

  applyFilter(): void {
    const ignoreDiacritics = this.themeService.current().searchIgnoreDiacritics === 'true';
    this.dataSource.filter = JSON.stringify({
      query: normalizeSearchText(this.query.value, ignoreDiacritics),
      memberType: this.memberTypeFilter.value,
      active: this.activeFilter.value,
      group: this.groupFilter,
      contact: this.contactFilter,
      ignoreDiacritics
    });
    this.paginator?.firstPage();
  }

  private parseFilterCriteria(filter: string): PersonFilterCriteria {
    try {
      const parsed = JSON.parse(filter) as Partial<PersonFilterCriteria>;
      return {
        query: parsed.query || '',
        memberType: parsed.memberType || 'ALL_MEMBERS',
        active: parsed.active || 'ALL',
        group: parsed.group || 'ALL',
        contact: parsed.contact || 'ALL',
        ignoreDiacritics: parsed.ignoreDiacritics ?? true
      };
    } catch {
      return { query: filter, memberType: 'ALL_MEMBERS', active: 'ALL', group: 'ALL', contact: 'ALL', ignoreDiacritics: true };
    }
  }

  private matchesPersonFilter(person: Person, filter: PersonMemberTypeFilter): boolean {
    if (filter === 'WIDOWED') {
      return this.isWidowed(person.id);
    }
    if (filter === 'ACTIVE_PERSONS') {
      return this.personStatus(person) === 'ACTIVE';
    }
    if (filter === 'INACTIVE_PERSONS') {
      return this.personStatus(person) === 'INACTIVE';
    }
    return this.matchesMemberTypeFilter(person.memberType, filter);
  }

  private matchesMemberTypeFilter(type: Person['memberType'], filter: PersonMemberTypeFilter): boolean {
    const memberTypes: Person['memberType'][] = ['MEMBER', 'CHILD', 'ADHERENT'];
    const visitorTypes: Person['memberType'][] = ['VISITOR', 'OCCASIONAL_VISITOR'];
    if (filter === 'MEMBERS_AND_CHILDREN') {
      return type === 'MEMBER' || type === 'CHILD';
    }
    if (filter === 'ALL_MEMBERS') {
      return memberTypes.includes(type);
    }
    if (filter === 'ALL_VISITORS') {
      return visitorTypes.includes(type);
    }
    return type === filter;
  }

  private matchesActiveFilter(person: Person, filter: PersonActiveFilter): boolean {
    const status = this.personStatus(person);
    if (filter === 'ALL') {
      return status === 'ACTIVE' || status === 'INACTIVE';
    }
    return status === filter;
  }

  private matchesGroupFilter(person: Person, filter: PersonGroupFilter): boolean {
    if (filter === 'none') {
      return this.groupsFor(person).length === 0;
    }
    if (filter === 'assigned') {
      return this.groupsFor(person).length > 0;
    }
    return true;
  }

  private matchesContactFilter(person: Person, filter: PersonContactFilter): boolean {
    if (filter === 'complete') {
      return this.hasCompleteContact(person);
    }
    if (filter === 'incomplete') {
      return !this.hasCompleteContact(person);
    }
    return true;
  }

  private hasCompleteContact(person: Person): boolean {
    return this.hasText(person.firstName)
      && this.hasText(person.lastName)
      && this.hasText(person.birthDate)
      && this.hasText(person.phone);
  }

  private hasText(value?: string | null): boolean {
    return value !== null && value !== undefined && value.trim().length > 0;
  }

  isActivePerson(person: Person): boolean {
    return person.active === true;
  }

  personStatusLabel(person: Person): string {
    const labels = this.language.language() === 'en' ? {
      ACTIVE: 'active',
      INACTIVE: 'inactive',
      DECEASED: 'deceased',
      TRANSFERRED: 'transferred',
      WITHDRAWN: 'withdrawn'
    } : {
      ACTIVE: 'activ',
      INACTIVE: 'inactiv',
      DECEASED: 'decedat',
      TRANSFERRED: 'transferat',
      WITHDRAWN: 'retras'
    };
    return {
      ...labels
    }[this.personStatus(person)];
  }

  personTypeStatusLabel(person: Person): string {
    const status = this.personStatus(person);
    if (status === 'WITHDRAWN') {
      return 'membri-retrași';
    }
    const type = memberTypeLabel(person.memberType).toLowerCase();
    if (status === 'ACTIVE' || status === 'INACTIVE') {
      return type;
    }
    return `${type}-${this.personStatusLabel(person)}`;
  }

  personTypeStatusExportLabel(person: Person): string {
    const label = this.personTypeStatusLabel(person);
    return this.personStatus(person) === 'INACTIVE'
      ? `${label} (${this.language.language() === 'en' ? 'inactive' : 'inactiv'})`
      : label;
  }

  personStatus(person: Person): Person['status'] {
    return person.status || (person.active ? 'ACTIVE' : 'INACTIVE');
  }

  private isWidowed(personId: number): boolean {
    return this.families().some((family) => family.members.some((member) => member.personId === personId && member.role === 'WIDOWED'));
  }

  openCreateDialog(): void {
    this.openPersonDialog();
  }

  openEditDialog(person: Person): void {
    this.openPersonDialog(person);
  }

  openViewDialog(person: Person): void {
    this.dialog.open(PersonDetailDialogComponent, {
      width: '680px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        person,
        people: this.persons(),
        groups: this.groupsFor(person),
        families: this.families()
      }
    });
  }

  exportRows(format: 'excel' | 'pdf' = 'excel'): void {
    const exportColumns = this.personColumnOptions
      .filter((column) => this.columns().includes(column.key))
      .map((column) => this.excelColumn(column.key));
    const churchSettings = this.churchSettingsService.settings();
    const options = {
      filename: 'persoane.xls',
      title: 'Lista membrilor bisericii:',
      churchName: churchSettings.name,
      churchAddress: churchSettings.address,
      rows: this.sortedFilteredRows(),
      columns: exportColumns
    };
    if (format === 'pdf') {
      exportStyledPdf({ ...options, filename: 'persoane.pdf' });
      return;
    }
    exportStyledExcel(options);
  }

  delete(person: Person): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        title: 'Șterge persoana',
        message: `Sigur vrei să ștergi persoana ${person.fullName} ?`,
        confirmLabel: 'Șterge'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.personsService.delete(person.id).subscribe({
        next: () => {
          this.toast.success('Persoana a fost ștearsă.');
          this.load();
        },
        error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-a putut șterge persoana.'))
      });
    });
  }

  private openPersonDialog(person?: Person): void {
    const dialogRef = this.dialog.open(PersonFormDialogComponent, {
      width: '560px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        person: person || null,
        widowed: person ? this.isWidowed(person.id) : false
      }
    });

    dialogRef.afterClosed().subscribe((request: PersonFormDialogResult | undefined) => {
      if (!request) {
        return;
      }

      const { widowed, statusPhotoFile, ...personRequest } = request;
      const save$ = person
        ? this.personsService.update(person.id, personRequest)
        : this.personsService.create(personRequest);

      save$.pipe(
        switchMap((saved) => statusPhotoFile ? this.personsService.uploadStatusPhoto(saved.id, statusPhotoFile) : of(saved)),
        switchMap((saved) => this.saveWidowedRole(saved, widowed).pipe(
          switchMap((family) => {
            if (family) {
              this.upsertFamily(family);
            }
            return of(null);
          })
        ))
      ).subscribe({
        next: () => {
          this.toast.success(person ? 'Persoana a fost actualizată.' : 'Persoana a fost adăugată.');
          this.load();
        },
        error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-a putut salva persoana.'))
      });
    });
  }

  memberTypeLabel = memberTypeLabel;

  tableDisplayName(person: Person): string {
    return this.displayName(person);
  }

  visibleColumns(): string[] {
    return ['index', ...this.columns().filter((column) => column !== 'index'), 'actions'];
  }

  isColumnVisible(column: PersonColumnKey): boolean {
    if (column === 'index') {
      return true;
    }
    return this.columns().includes(column);
  }

  orderedColumnOptions(): PersonColumnOption[] {
    const orderedKeys = [
      ...this.columns(),
      ...this.personColumnOptions.map((option) => option.key).filter((key) => !this.columns().includes(key))
    ];
    return orderedKeys
      .map((key) => this.personColumnOptions.find((option) => option.key === key))
      .filter((option): option is PersonColumnOption => !!option);
  }

  toggleColumn(column: PersonColumnKey, visible: boolean): void {
    if (column === 'index' || column === 'fullName') {
      return;
    }
    this.columns.update((columns) => {
      const next = visible
        ? [...columns.filter((item) => item !== column), column]
        : columns.filter((item) => item !== column);
      const ordered = this.normalizeColumns(next);
      this.storeColumns(ordered);
      this.saveBackendColumns(ordered);
      return ordered;
    });
  }

  canMoveColumn(column: PersonColumnKey, direction: -1 | 1): boolean {
    if (column === 'index' || !this.columns().includes(column)) {
      return false;
    }
    const movableColumns = this.columns().filter((item): item is Exclude<PersonColumnKey, 'index'> => item !== 'index');
    const index = movableColumns.indexOf(column);
    const target = index + direction;
    return index >= 0 && target >= 0 && target < movableColumns.length;
  }

  moveColumn(column: PersonColumnKey, direction: -1 | 1): void {
    if (!this.canMoveColumn(column, direction)) {
      return;
    }
    if (column === 'index') {
      return;
    }
    const current = [...this.columns()];
    const movableColumns = current.filter((item): item is Exclude<PersonColumnKey, 'index'> => item !== 'index');
    const fromIndex = movableColumns.indexOf(column);
    const toIndex = fromIndex + direction;
    [movableColumns[fromIndex], movableColumns[toIndex]] = [movableColumns[toIndex], movableColumns[fromIndex]];
    const ordered: PersonColumnKey[] = ['index', ...movableColumns];
    this.columns.set(ordered);
    this.storeColumns(ordered);
    this.saveBackendColumns(ordered);
  }

  rowNumber(index: number): number {
    const pageIndex = this.paginator?.pageIndex || 0;
    const pageSize = this.paginator?.pageSize || this.dataSource.filteredData.length || 10;
    return pageIndex * pageSize + index + 1;
  }

  groupsFor(person: Person): Group[] {
    return this.groupsByPersonId()[person.id] || [];
  }

  visibleGroups(person: Person): Group[] {
    return this.groupsFor(person).slice(0, 2);
  }

  hiddenGroupsCount(person: Person): number {
    return Math.max(this.groupsFor(person).length - 2, 0);
  }

  allGroupNames(person: Person): string {
    return this.groupsFor(person).map((group) => group.name).join(', ');
  }

  mobilePersonRows(): Person[] {
    return this.sortedFilteredRows();
  }

  mobilePersonName(person: Person): string {
    return this.displayName(person);
  }

  setNameDisplayOrder(value: string): void {
    const order: PersonNameDisplayOrder = value === 'firstLast' ? 'firstLast' : 'lastFirst';
    this.nameDisplayOrder.set(order);
    localStorage.setItem(this.nameDisplayOrderStorageKey, order);
    this.dataSource.data = [...this.dataSource.data];
  }

  phoneHref(phone: string): string {
    return `tel:${phone.replace(/[^\d+]/g, '')}`;
  }

  private displayName(person: Person): string {
    const parts = this.nameDisplayOrder() === 'firstLast'
      ? [person.firstName, person.lastName]
      : [person.lastName, person.firstName];
    return parts.filter(Boolean).join(' ').trim() || person.fullName;
  }

  private loadNameDisplayOrder(): PersonNameDisplayOrder {
    return localStorage.getItem(this.nameDisplayOrderStorageKey) === 'firstLast' ? 'firstLast' : 'lastFirst';
  }

  private loadStoredColumns(): PersonColumnKey[] {
    const allowed = new Set(this.personColumnOptions.map((column) => column.key));
    try {
      const raw = localStorage.getItem(this.columnStorageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) {
        const columns = parsed.filter((value): value is PersonColumnKey => allowed.has(value));
        if (columns.includes('fullName')) {
          const storedColumns = this.personColumnOptions
            .map((option) => option.key)
            .filter((key) => columns.includes(key));
          const nextColumns: PersonColumnKey[] = storedColumns.includes('index') ? storedColumns : ['index', ...storedColumns];
          if (this.isPreviousDefaultColumns(nextColumns)) {
            this.storeColumns(this.defaultColumns);
            return this.defaultColumns;
          }
          return nextColumns;
        }
      }
    } catch {
      localStorage.removeItem(this.columnStorageKey);
    }
    return this.defaultColumns;
  }

  private storeColumns(columns: PersonColumnKey[]): void {
    localStorage.setItem(this.columnStorageKey, JSON.stringify(columns));
  }

  private loadBackendColumns(): void {
    this.tableColumnPreferences.columns(this.tablePreferenceId).subscribe({
      next: (preference) => {
        const columns = this.normalizeColumns(preference.columns);
        if (columns.length > 0) {
          this.columns.set(columns);
          this.storeColumns(columns);
          return;
        }
        this.saveBackendColumns(this.columns());
      },
      error: () => {
        this.saveBackendColumns(this.columns());
      }
    });
  }

  private saveBackendColumns(columns: PersonColumnKey[]): void {
    this.tableColumnPreferences.saveColumns(this.tablePreferenceId, columns).subscribe({
      next: (preference) => {
        const normalized = this.normalizeColumns(preference.columns);
        if (normalized.length > 0) {
          this.columns.set(normalized);
          this.storeColumns(normalized);
        }
      },
      error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-au putut salva preferințele tabelului.'))
    });
  }

  private normalizeColumns(values: string[]): PersonColumnKey[] {
    const allowed = new Set(this.personColumnOptions.map((column) => column.key));
    const columns = values.filter((value): value is PersonColumnKey => allowed.has(value as PersonColumnKey));
    if (!columns.includes('fullName')) {
      return [];
    }
    const uniqueColumns = [...new Set(columns)];
    return ['index', ...uniqueColumns.filter((column) => column !== 'index')];
  }

  private isPreviousDefaultColumns(columns: PersonColumnKey[]): boolean {
    const previousDefault: PersonColumnKey[] = ['index', 'fullName', 'memberType', 'active', 'groups', 'churchRole', 'phone', 'age'];
    return columns.length === previousDefault.length && columns.every((column, index) => column === previousDefault[index]);
  }

  private upsertFamily(updated: Family): void {
    const exists = this.families().some((family) => family.id === updated.id);
    this.families.set(exists
      ? this.families().map((family) => family.id === updated.id ? updated : family)
      : [...this.families(), updated]);
  }

  private saveWidowedRole(person: Person, widowed: boolean): Observable<Family | null> {
    const widowedMemberships = this.familyMemberships(person.id)
      .filter((item) => item.member.role === 'WIDOWED');

    if (!widowed) {
      return this.clearWidowedRole(widowedMemberships);
    }

    const current = widowedMemberships[0] || this.familyMemberships(person.id)[0];
    if (current?.member.role === 'WIDOWED') {
      return of(null);
    }
    if (current) {
      return this.updateFamilyMemberRole(current.family, current.member, 'WIDOWED');
    }
    return this.familiesService.create({ name: this.familyNameForPerson(person) }).pipe(
      switchMap((family) => this.familiesService.addMember(family.id, {
        personId: person.id,
        role: 'WIDOWED',
        primaryMember: true
      }))
    );
  }

  private clearWidowedRole(items: Array<{ family: Family; member: FamilyMember }>): Observable<Family | null> {
    if (items.length === 0) {
      return of(null);
    }
    const [item, ...rest] = items;
    return this.updateFamilyMemberRole(item.family, item.member, 'OTHER').pipe(
      switchMap(() => this.clearWidowedRole(rest))
    );
  }

  private updateFamilyMemberRole(family: Family, member: FamilyMember, role: FamilyRole): Observable<Family> {
    return this.familiesService.updateMember(family.id, member.id, {
      personId: member.personId,
      role,
      primaryMember: member.primaryMember
    });
  }

  private familyMemberships(personId: number): Array<{ family: Family; member: FamilyMember }> {
    return this.families().flatMap((family) =>
      family.members
        .filter((member) => member.personId === personId)
        .map((member) => ({ family, member })));
  }

  private familyNameForPerson(person: Person): string {
    return person.lastName ? `Familia ${person.lastName}` : `Familia ${person.fullName}`;
  }

  private contextMenuPosition(event: MouseEvent): { x: number; y: number } {
    const menuWidth = 232;
    const menuHeight = 460;
    const margin = 8;
    return {
      x: Math.min(event.clientX, window.innerWidth - menuWidth - margin),
      y: Math.min(event.clientY, window.innerHeight - menuHeight - margin)
    };
  }

  private excelColumn(column: PersonColumnKey) {
    const columns = {
      index: { header: 'Nr.', value: (_person: Person, index: number) => index + 1 },
      fullName: { header: 'Nume', value: (person: Person) => this.displayName(person) },
      memberType: { header: 'Tip', value: (person: Person) => this.personTypeStatusExportLabel(person) },
      active: { header: 'Status', value: (person: Person) => this.personStatusLabel(person) },
      groups: { header: 'Grupuri', value: (person: Person) => this.allGroupNames(person) || this.groupAssignmentLabel(person) },
      churchRole: { header: 'Rol', value: (person: Person) => person.churchRole },
      position: { header: 'Poziție', value: (person: Person) => person.position },
      phone: { header: 'Telefon', value: (person: Person) => person.phone },
      email: { header: 'Email', value: (person: Person) => person.email },
      address: { header: 'Adresă', value: (person: Person) => person.address },
      birthDate: { header: 'Data nașterii', value: (person: Person) => this.formatDate(person.birthDate) },
      age: { header: 'Vârstă', value: (person: Person) => this.ageLabel(person) }
    };
    return columns[column];
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '';
    }
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) {
      return value;
    }
    const monthName = [
      'ianuarie',
      'februarie',
      'martie',
      'aprilie',
      'mai',
      'iunie',
      'iulie',
      'august',
      'septembrie',
      'octombrie',
      'noiembrie',
      'decembrie'
    ][Number(month) - 1];
    if (!monthName) {
      return value;
    }
    return `${day} ${monthName}, ${year}`;
  }

  ageYears(person: Person): number | null {
    if (!person.birthDate) {
      return null;
    }
    const referenceDate = this.ageReferenceDate(person);
    if (!referenceDate) {
      return null;
    }
    const [year, month, day] = person.birthDate.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }
    let age = referenceDate.getFullYear() - year;
    const currentMonth = referenceDate.getMonth() + 1;
    const currentDay = referenceDate.getDate();
    if (currentMonth < month || (currentMonth === month && currentDay < day)) {
      age -= 1;
    }
    return age >= 0 ? age : null;
  }

  ageLabel(person: Person): string {
    const age = this.ageYears(person);
    return age === null ? '' : `${age} ani`;
  }

  private ageReferenceDate(person: Person): Date | null {
    const status = this.personStatus(person);
    if (status === 'DECEASED' || status === 'TRANSFERRED' || status === 'WITHDRAWN') {
      return this.parseLocalDate(person.statusChangedDate);
    }
    return new Date();
  }

  private parseLocalDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }
    return new Date(year, month - 1, day);
  }

  private sortedFilteredRows(): Person[] {
    const rows = [...this.dataSource.filteredData];
    return this.dataSource.sort ? this.dataSource.sortData(rows, this.dataSource.sort) : rows;
  }

  private mapGroupsByPerson(groups: Group[]): Record<number, Group[]> {
    return groups.reduce<Record<number, Group[]>>((acc, group) => {
      group.memberIds.forEach((personId: number) => {
        acc[personId] = [...(acc[personId] || []), group];
      });
      return acc;
    }, {});
  }

  groupAssignmentLabel(person: Person): string {
    return this.groupsFor(person).length > 0 ? 'în grup' : '-';
  }
}

type PersonColumnKey = 'index' | 'fullName' | 'memberType' | 'active' | 'groups' | 'churchRole' | 'position' | 'phone' | 'email' | 'address' | 'birthDate' | 'age';
type PersonNameDisplayOrder = 'lastFirst' | 'firstLast';
type PersonMemberTypeFilter = Person['memberType'] | 'ALL_MEMBERS' | 'MEMBERS_AND_CHILDREN' | 'ALL_VISITORS' | 'WIDOWED' | 'ACTIVE_PERSONS' | 'INACTIVE_PERSONS';
type PersonActiveFilter = 'ALL' | Person['status'];
type PersonGroupFilter = 'ALL' | 'none' | 'assigned';
type PersonContactFilter = 'ALL' | 'incomplete' | 'complete';

interface PersonMemberTypeFilterOption {
  value: PersonMemberTypeFilter;
  label: string;
  separator?: boolean;
}

interface PersonFilterCriteria {
  query: string;
  memberType: PersonMemberTypeFilter;
  active: PersonActiveFilter;
  group: PersonGroupFilter;
  contact: PersonContactFilter;
  ignoreDiacritics: boolean;
}

interface PersonColumnOption {
  key: PersonColumnKey;
  label: string;
  required?: boolean;
}
