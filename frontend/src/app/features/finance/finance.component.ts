import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { apiErrorMessage } from '../../shared/api-error-message';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { exportCsv } from '../../shared/csv-export';
import { exportStyledPdf } from '../../shared/excel-export';
import { PageMenuActionsService } from '../../shared/page-menu-actions.service';
import { PageNavComponent } from '../../shared/page-nav.component';
import { TablePreferencesService } from '../../shared/table-preferences.service';
import { ToastService } from '../../shared/toast.service';
import { FinanceService } from './finance.service';
import { FinanceSummary, FinancialTransaction, TransactionRequest, TransactionType } from './finance.model';
import { TransactionFormDialogComponent } from './transaction-form-dialog.component';

type FinanceTableRow = TransactionTableRow | MonthBalanceTableRow;

interface TransactionTableRow {
  kind: 'transaction';
  transaction: FinancialTransaction;
}

interface MonthBalanceTableRow {
  kind: 'monthBalance';
  monthKey: string;
  monthLabel: string;
  income: number;
  expenses: number;
  balance: number;
}

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MatPaginatorModule,
    MatTableModule,
    PageNavComponent
  ],
  styles: [`
    .finance-toolbar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      flex: 1 1 auto;
      min-width: 0;
      width: 100%;
    }

    .finance-toolbar .toolbar-input {
      width: min(280px, 100%);
      flex: 1 1 220px;
    }

    .summary-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }

    .summary-card {
      display: grid;
      gap: 4px;
      min-height: 72px;
      box-sizing: border-box;
      padding: 14px 16px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
    }

    .summary-label {
      color: var(--app-muted);
      font-size: 12px;
      font-weight: 650;
    }

    .summary-value {
      color: var(--app-text);
      font-size: 20px;
      font-weight: 750;
      line-height: 1.15;
    }

    .summary-card.balance .summary-value {
      color: #047857;
    }

    .summary-card.income .summary-value {
      color: var(--app-primary-strong);
    }

    .summary-card.expense .summary-value {
      color: var(--app-danger);
    }

    .amount-column {
      width: 150px;
      text-align: right !important;
    }

    .date-column {
      width: 130px;
    }

    .type-column {
      width: 130px;
    }

    .amount-cell {
      font-weight: 700;
      text-align: right;
      white-space: nowrap;
    }

    .amount-cell.income {
      color: #047857;
    }

    .amount-cell.expense {
      color: var(--app-danger);
    }

    .description-cell {
      max-width: 360px;
      color: var(--app-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .month-balance-row td,
    .month-balance-cell {
      border-top: 1px solid #dbe4ef;
      border-bottom: 1px solid #dbe4ef !important;
      background: #f8fafc !important;
    }

    .month-balance-content {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 18px;
      min-height: 38px;
      color: var(--app-muted);
      font-size: 13px;
      font-weight: 650;
    }

    .month-balance-label {
      color: var(--app-text);
    }

    .month-balance-amount {
      color: var(--app-primary-strong);
      font-size: 14px;
      font-weight: 750;
      white-space: nowrap;
    }

    .month-balance-amount.negative {
      color: var(--app-danger);
    }

    .mobile-finance-list {
      display: none;
    }

    .mobile-transaction-card {
      display: grid;
      gap: 12px;
      padding: 13px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface);
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
    }

    .mobile-transaction-main {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: start;
    }

    .mobile-transaction-title {
      overflow: hidden;
      margin: 0;
      color: var(--app-text);
      font-size: 16px;
      font-weight: 800;
      line-height: 1.25;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mobile-transaction-meta {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 6px;
    }

    .mobile-transaction-amount {
      font-size: 15px;
      font-weight: 800;
      white-space: nowrap;
    }

    .mobile-transaction-amount.income {
      color: #047857;
    }

    .mobile-transaction-amount.expense {
      color: var(--app-danger);
    }

    .mobile-transaction-details {
      display: grid;
      gap: 7px;
      min-width: 0;
    }

    .mobile-transaction-detail {
      display: grid;
      grid-template-columns: 22px minmax(0, 1fr);
      gap: 8px;
      align-items: center;
      min-width: 0;
      color: var(--app-muted);
      font-size: 13px;
      font-weight: 650;
    }

    .mobile-transaction-detail mat-icon {
      width: 18px;
      height: 18px;
      color: var(--app-primary-strong);
      font-size: 18px;
      line-height: 18px;
    }

    .mobile-transaction-detail span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mobile-transaction-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .mobile-transaction-actions .table-icon-button {
      width: 38px;
      min-width: 38px;
      height: 38px;
    }

    @media (max-width: 900px) {
      .summary-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 760px) {
      .page-header {
        align-items: stretch;
        gap: 10px;
      }

      .page-header-actions {
        justify-content: flex-start;
      }

      .finance-toolbar {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 40px;
        gap: 7px;
      }

      .finance-toolbar .toolbar-input {
        min-height: 38px;
        padding: 0 10px;
        font-size: 14px;
      }

      .finance-toolbar .toolbar-icon-button {
        width: 40px;
        min-width: 40px;
        min-height: 38px;
        grid-column: 2;
        grid-row: 1;
      }

      .finance-toolbar .toolbar-primary-button {
        grid-column: 1 / -1;
        min-height: 38px;
        width: auto;
        justify-self: start;
      }

      .summary-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 12px;
      }

      .summary-card {
        min-height: 64px;
        padding: 11px;
      }

      .summary-value {
        font-size: 16px;
      }

      .table-wrap {
        display: none;
      }

      .mobile-finance-list {
        display: grid;
        gap: 10px;
      }
    }
  `],
  template: `
    <main class="page">
      <header class="page-header">
        <div class="page-header-main">
          <h1 class="page-title page-title-offset">{{ language.t('page.finance') }}</h1>
          <p class="page-subtitle" aria-hidden="true">&nbsp;</p>
        </div>
        <div class="page-header-actions">
          <app-page-nav />
        </div>
      </header>

      <section class="summary-row" [attr.aria-label]="language.t('page.finance')">
        <div class="summary-card balance">
          <span class="summary-label">{{ language.t('finance.currentBalance') }}</span>
          <span class="summary-value">{{ summary().currentBalance | currency:'RON':'symbol-narrow':'1.2-2':currencyLocale() }}</span>
        </div>
        <div class="summary-card income">
          <span class="summary-label">{{ language.t('finance.income') }}</span>
          <span class="summary-value">{{ summary().totalIncome | currency:'RON':'symbol-narrow':'1.2-2':currencyLocale() }}</span>
        </div>
        <div class="summary-card expense">
          <span class="summary-label">{{ language.t('finance.expenses') }}</span>
          <span class="summary-value">{{ summary().totalExpenses | currency:'RON':'symbol-narrow':'1.2-2':currencyLocale() }}</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">{{ language.t('finance.transactions') }}</span>
          <span class="summary-value">{{ summary().transactionCount }}</span>
        </div>
      </section>

      <section class="surface table-surface">
        <div class="surface-header table-surface-header">
          <div class="finance-toolbar">
            <input
              class="toolbar-control toolbar-input"
              type="search"
              [placeholder]="language.t('common.search')"
              [formControl]="query"
              (keyup.enter)="load()">

            <button class="toolbar-button toolbar-icon-button" type="button" [attr.aria-label]="language.t('common.search')" [title]="language.t('common.search')" (click)="load()">
              <mat-icon>search</mat-icon>
            </button>
            <button class="toolbar-button toolbar-primary-button" type="button" [disabled]="!auth.isAdmin()" (click)="openCreateDialog()">
              <mat-icon>add</mat-icon>
              {{ language.t('common.add') }}
            </button>
          </div>
        </div>
        <div class="surface-content table-surface-content">
          @if (transactions().length > 0) {
            <div class="table-wrap">
              <table class="data-table" mat-table [dataSource]="dataSource">
                <ng-container matColumnDef="index">
                  <th class="number-column" mat-header-cell *matHeaderCellDef>#</th>
                  <td class="number-column" mat-cell *matCellDef="let row">{{ rowNumber(row.transaction) }}.</td>
                </ng-container>

                <ng-container matColumnDef="transactionDate">
                  <th class="date-column" mat-header-cell *matHeaderCellDef>{{ language.t('common.date') }}</th>
                  <td mat-cell *matCellDef="let row">{{ row.transaction.transactionDate | date:'dd.MM.yyyy' }}</td>
                </ng-container>

                <ng-container matColumnDef="type">
                  <th class="type-column" mat-header-cell *matHeaderCellDef>{{ language.t('common.type') }}</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="badge" [class.info]="row.transaction.type === 'INCOME'" [class.warning]="row.transaction.type === 'EXPENSE'">
                      {{ transactionTypeLabel(row.transaction.type) }}
                    </span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>{{ language.t('common.name') }}</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="primary-text">{{ row.transaction.name }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="description">
                  <th mat-header-cell *matHeaderCellDef>{{ language.t('common.description') }}</th>
                  <td class="description-cell" mat-cell *matCellDef="let row">{{ row.transaction.description || '-' }}</td>
                </ng-container>

                <ng-container matColumnDef="amount">
                  <th class="amount-column" mat-header-cell *matHeaderCellDef>{{ language.t('common.amount') }}</th>
                  <td class="amount-cell" [class.income]="row.transaction.type === 'INCOME'" [class.expense]="row.transaction.type === 'EXPENSE'" mat-cell *matCellDef="let row">
                    @if (signedAmount(row.transaction) === null) {
                      {{ language.t('finance.privateAmount') }}
                    } @else {
                      {{ signedAmount(row.transaction) | currency:'RON':'symbol-narrow':'1.2-2':currencyLocale() }}
                    }
                  </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let row">
                    <div class="table-actions">
                      <button
                        class="table-icon-button"
                        type="button"
                        [attr.aria-label]="language.t('common.edit')"
                        [title]="amountLocked(row.transaction) ? privateAmountTooltip() : language.t('common.edit')"
                        [disabled]="!auth.isAdmin() || amountLocked(row.transaction)"
                        (click)="openEditDialog(row.transaction)">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button class="table-icon-button danger-table-action" type="button" [attr.aria-label]="language.t('common.delete')" [disabled]="!auth.isAdmin()" (click)="delete(row.transaction)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="monthBalance">
                  <td class="month-balance-cell" mat-cell *matCellDef="let row" [attr.colspan]="columns.length">
                    <div class="month-balance-content">
                      <span class="month-balance-label">{{ language.t('finance.balance') }} {{ row.monthLabel }}</span>
                      <span>{{ language.t('finance.income') }}: {{ row.income | currency:'RON':'symbol-narrow':'1.2-2':currencyLocale() }}</span>
                      <span>{{ language.t('finance.expenses') }}: {{ row.expenses | currency:'RON':'symbol-narrow':'1.2-2':currencyLocale() }}</span>
                      <span class="month-balance-amount" [class.negative]="row.balance < 0">
                        {{ row.balance | currency:'RON':'symbol-narrow':'1.2-2':currencyLocale() }}
                      </span>
                    </div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="columns"></tr>
                <tr mat-row *matRowDef="let row; columns: columns; when: isTransactionRow;"></tr>
                <tr class="month-balance-row" mat-row *matRowDef="let row; columns: monthBalanceColumns; when: isMonthBalanceRow;"></tr>
                <tr class="mat-row" *matNoDataRow>
                  <td class="mat-cell muted" [attr.colspan]="columns.length">{{ language.t('common.noResults') }}</td>
                </tr>
              </table>
              <mat-paginator [pageSize]="tablePageSize()" [pageSizeOptions]="tablePageSizeOptions()" showFirstLastButtons />
            </div>
            <div class="mobile-finance-list" [attr.aria-label]="language.t('finance.transactions')">
              @for (transaction of mobileTransactionRows(); track transaction.id) {
                <article class="mobile-transaction-card">
                  <div class="mobile-transaction-main">
                    <div>
                      <h2 class="mobile-transaction-title">{{ transaction.name }}</h2>
                      <div class="mobile-transaction-meta">
                        <span class="badge" [class.info]="transaction.type === 'INCOME'" [class.warning]="transaction.type === 'EXPENSE'">
                          {{ transactionTypeLabel(transaction.type) }}
                        </span>
                        <span class="badge">{{ formatDate(transaction.transactionDate) }}</span>
                      </div>
                    </div>
                    <span
                      class="mobile-transaction-amount"
                      [class.income]="transaction.type === 'INCOME'"
                      [class.expense]="transaction.type === 'EXPENSE'">
                      @if (signedAmount(transaction) === null) {
                        {{ language.t('finance.privateAmount') }}
                      } @else {
                        {{ signedAmount(transaction) | currency:'RON':'symbol-narrow':'1.2-2':currencyLocale() }}
                      }
                    </span>
                  </div>
                  <div class="mobile-transaction-details">
                    <div class="mobile-transaction-detail">
                      <mat-icon>notes</mat-icon>
                      <span>{{ transaction.description || language.t('finance.noDescription') }}</span>
                    </div>
                    <div class="mobile-transaction-actions">
                      <button
                        class="table-icon-button"
                        type="button"
                        [attr.aria-label]="language.t('common.edit')"
                        [title]="amountLocked(transaction) ? privateAmountTooltip() : language.t('common.edit')"
                        [disabled]="!auth.isAdmin() || amountLocked(transaction)"
                        (click)="openEditDialog(transaction)">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button class="table-icon-button danger-table-action" type="button" [attr.aria-label]="language.t('common.delete')" [disabled]="!auth.isAdmin()" (click)="delete(transaction)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </div>
                </article>
              }
              @if (mobileTransactionRows().length === 0) {
                <div class="empty-state">
                  <mat-icon>search_off</mat-icon>
                  <span>{{ language.t('common.noResults') }}</span>
                </div>
              }
            </div>
          } @else {
            <div class="empty-state">
              <mat-icon>payments</mat-icon>
              <span>{{ language.t('finance.noTransactions') }}</span>
            </div>
          }
        </div>
      </section>
    </main>
  `
})
export class FinanceComponent implements OnInit, OnDestroy {
  private paginator?: MatPaginator;

  @ViewChild(MatPaginator) set matPaginator(paginator: MatPaginator | undefined) {
    this.paginator = paginator;
    this.dataSource.paginator = paginator || null;
  }

  private fb = inject(FormBuilder);
  private financeService = inject(FinanceService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  private pageMenuActions = inject(PageMenuActionsService);
  private tablePreferences = inject(TablePreferencesService);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);
  language = inject(LanguageService);
  tablePageSize = this.tablePreferences.pageSize;
  tablePageSizeOptions = this.tablePreferences.pageSizeOptions;

  columns = ['index', 'transactionDate', 'type', 'name', 'description', 'amount', 'actions'];
  monthBalanceColumns = ['monthBalance'];
  query = this.fb.nonNullable.control('');
  monthFilter = '';
  transactions = signal<FinancialTransaction[]>([]);
  summary = signal<FinanceSummary>({
    currentBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    transactionCount: 0
  });
  dataSource = new MatTableDataSource<FinanceTableRow>([]);

  ngOnInit(): void {
    this.pageMenuActions.setActions([
      {
        id: 'finance-export-csv',
        label: 'Export CSV',
        icon: 'download',
        run: () => this.exportRows()
      },
      {
        id: 'finance-export-pdf',
        label: 'Export PDF',
        icon: 'picture_as_pdf',
        run: () => this.exportPdf()
      }
    ]);
    const params = this.route.snapshot.queryParamMap;
    this.query.setValue(params.get('q') || '');
    this.monthFilter = params.get('month') || '';
    this.load();
  }

  ngOnDestroy(): void {
    this.pageMenuActions.clear();
  }

  load(): void {
    this.financeService.overview(this.query.value).subscribe({
      next: (overview) => {
        const transactions = this.monthFilter
          ? overview.transactions.filter((transaction) => transaction.transactionDate.startsWith(this.monthFilter))
          : overview.transactions;
        this.summary.set(this.summaryFor(transactions));
        this.transactions.set(transactions);
        this.dataSource.data = this.withMonthBalances(transactions);
        this.paginator?.firstPage();
      },
      error: (error) => this.toast.error(apiErrorMessage(error, this.language.t('finance.noTransactions')))
    });
  }

  openCreateDialog(): void {
    this.openTransactionDialog();
  }

  openEditDialog(transaction: FinancialTransaction): void {
    if (this.amountLocked(transaction)) {
      this.toast.info(this.privateAmountTooltip());
      return;
    }
    this.openTransactionDialog(transaction);
  }

  rowNumber(transaction: FinancialTransaction): number {
    return this.transactions().findIndex((item) => item.id === transaction.id) + 1;
  }

  mobileTransactionRows(): FinancialTransaction[] {
    return this.transactions();
  }

  exportRows(): void {
    exportCsv('finante.csv', this.transactions(), [
      { header: this.language.t('common.date'), value: (transaction) => transaction.transactionDate },
      { header: this.language.t('common.type'), value: (transaction) => this.transactionTypeLabel(transaction.type) },
      { header: this.language.t('common.name'), value: (transaction) => transaction.name },
      { header: this.language.t('common.description'), value: (transaction) => transaction.description },
      { header: this.language.t('common.amount'), value: (transaction) => this.signedAmount(transaction)?.toFixed(2) || this.language.t('finance.privateAmount') }
    ]);
  }

  exportPdf(): void {
    exportStyledPdf({
      filename: 'finante.pdf',
      title: this.language.t('page.finance'),
      subtitle: this.summarySubtitle(),
      rows: this.transactions(),
      columns: [
        { header: this.language.t('common.date'), value: (transaction) => this.formatDate(transaction.transactionDate) },
        { header: this.language.t('common.type'), value: (transaction) => this.transactionTypeLabel(transaction.type) },
        { header: this.language.t('common.name'), value: (transaction) => transaction.name },
        { header: this.language.t('common.description'), value: (transaction) => transaction.description },
        { header: this.language.t('common.amount'), value: (transaction) => this.formatOptionalMoney(this.signedAmount(transaction)) }
      ]
    });
  }

  delete(transaction: FinancialTransaction): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        title: `${this.language.t('common.delete')} ${this.language.t('finance.transaction')}`,
        message: this.language.language() === 'en'
          ? `Are you sure you want to delete ${transaction.name}?`
          : `Sigur vrei să ștergi ${transaction.name}?`,
        confirmLabel: this.language.t('common.delete')
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.financeService.delete(transaction.id).subscribe({
        next: () => {
          this.toast.success(this.language.language() === 'en' ? 'Transaction deleted.' : 'Tranzacția a fost ștearsă.');
          this.load();
        },
        error: (error) => this.toast.error(apiErrorMessage(error, this.language.language() === 'en' ? 'The transaction could not be deleted.' : 'Nu s-a putut șterge tranzacția.'))
      });
    });
  }

  signedAmount(transaction: FinancialTransaction): number | null {
    if (transaction.amount === null) {
      return null;
    }
    return transaction.type === 'EXPENSE' ? -transaction.amount : transaction.amount;
  }

  amountLocked(transaction: FinancialTransaction): boolean {
    return transaction.amountPrivate === true && transaction.amountVisible === false;
  }

  transactionTypeLabel(type: TransactionType): string {
    return type === 'INCOME'
      ? (this.language.language() === 'en' ? 'income' : 'venit')
      : (this.language.language() === 'en' ? 'expense' : 'cheltuială');
  }

  currencyLocale(): string {
    return this.language.language() === 'en' ? 'en-US' : 'ro-RO';
  }

  privateAmountTooltip(): string {
    return this.language.language() === 'en'
      ? 'A private amount can only be edited by the user who added it.'
      : 'Suma privată poate fi editată doar de utilizatorul care a adăugat-o.';
  }

  isTransactionRow = (_: number, row: FinanceTableRow): row is TransactionTableRow => row.kind === 'transaction';

  isMonthBalanceRow = (_: number, row: FinanceTableRow): row is MonthBalanceTableRow => row.kind === 'monthBalance';

  private withMonthBalances(transactions: FinancialTransaction[]): FinanceTableRow[] {
    const rows: FinanceTableRow[] = [];
    let currentMonth: MonthBalanceTableRow | null = null;

    transactions.forEach((transaction, index) => {
      const monthKey = transaction.transactionDate.slice(0, 7);
      if (!currentMonth || currentMonth.monthKey !== monthKey) {
        currentMonth = {
          kind: 'monthBalance',
          monthKey,
          monthLabel: this.monthLabel(transaction.transactionDate),
          income: 0,
          expenses: 0,
          balance: 0
        };
      }

      if (transaction.amount === null) {
        rows.push({ kind: 'transaction', transaction });
        return;
      }

      if (transaction.type === 'INCOME') {
        currentMonth.income += transaction.amount;
      } else {
        currentMonth.expenses += transaction.amount;
      }
      currentMonth.balance = currentMonth.income - currentMonth.expenses;
      rows.push({ kind: 'transaction', transaction });

      const next = transactions[index + 1];
      if (!next || next.transactionDate.slice(0, 7) !== monthKey) {
        rows.push(currentMonth);
        currentMonth = null;
      }
    });

    return rows;
  }

  private summaryFor(transactions: FinancialTransaction[]): FinanceSummary {
    const totalIncome = transactions
      .filter((transaction) => transaction.type === 'INCOME')
      .reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
    const totalExpenses = transactions
      .filter((transaction) => transaction.type === 'EXPENSE')
      .reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
    return {
      currentBalance: totalIncome - totalExpenses,
      totalIncome,
      totalExpenses,
      transactionCount: transactions.length
    };
  }

  private monthLabel(date: string): string {
    const [year, month] = date.split('-').map(Number);
    const monthDate = new Date(year, month - 1, 1);
    return new Intl.DateTimeFormat(this.currencyLocale(), { month: 'long', year: 'numeric' }).format(monthDate);
  }

  private summarySubtitle(): string {
    const summary = this.summary();
    return [
      `${this.language.t('finance.currentBalance')}: ${this.formatMoney(summary.currentBalance)}`,
      `${this.language.t('finance.income')}: ${this.formatMoney(summary.totalIncome)}`,
      `${this.language.t('finance.expenses')}: ${this.formatMoney(summary.totalExpenses)}`
    ].join(' | ');
  }

  formatDate(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    return new Intl.DateTimeFormat(this.currencyLocale(), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(year, month - 1, day));
  }

  private formatMoney(value: number): string {
    return new Intl.NumberFormat(this.currencyLocale(), {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  private formatOptionalMoney(value: number | null): string {
    return value === null ? this.language.t('finance.privateAmount') : this.formatMoney(value);
  }

  private openTransactionDialog(transaction?: FinancialTransaction): void {
    const dialogRef = this.dialog.open(TransactionFormDialogComponent, {
      width: '540px',
      maxWidth: 'calc(100vw - 32px)',
      data: { transaction: transaction || null }
    });

    dialogRef.afterClosed().subscribe((request: TransactionRequest | undefined) => {
      if (!request) {
        return;
      }

      const save$ = transaction
        ? this.financeService.update(transaction.id, request)
        : this.financeService.create(request);

      save$.subscribe({
        next: () => {
          this.toast.success(transaction
            ? (this.language.language() === 'en' ? 'Transaction updated.' : 'Tranzacția a fost actualizată.')
            : (this.language.language() === 'en' ? 'Transaction added.' : 'Tranzacția a fost adăugată.'));
          this.load();
        },
        error: (error) => this.toast.error(apiErrorMessage(error, this.language.language() === 'en' ? 'The transaction could not be saved.' : 'Nu s-a putut salva tranzacția.'))
      });
    });
  }
}
