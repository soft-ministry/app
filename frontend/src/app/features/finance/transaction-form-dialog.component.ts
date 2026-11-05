import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { LanguageService } from '../../core/language.service';
import { FinancialTransaction, TransactionRequest } from './finance.model';

export interface TransactionFormDialogData {
  transaction?: FinancialTransaction | null;
}

@Component({
  selector: 'app-transaction-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule
  ],
  styles: [`
    .dialog-form {
      display: grid;
      gap: 12px;
      width: min(480px, 100%);
      max-width: 100%;
      box-sizing: border-box;
      padding-top: 8px;
    }

    mat-dialog-content,
    mat-form-field {
      max-width: 100%;
      box-sizing: border-box;
    }
  `],
  template: `
    <h2 mat-dialog-title>{{ data.transaction ? language.t('common.edit') + ' ' + language.t('finance.transaction') : language.t('finance.newTransaction') }}</h2>
    <mat-dialog-content>
      <form class="dialog-form" [formGroup]="form" id="transaction-form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>{{ language.t('common.type') }}</mat-label>
          <mat-select formControlName="type">
            <mat-option value="INCOME">{{ language.language() === 'en' ? 'Income' : 'Venit' }}</mat-option>
            <mat-option value="EXPENSE">{{ language.language() === 'en' ? 'Expense' : 'Cheltuială' }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ language.t('common.name') }}</mat-label>
          <input matInput formControlName="name">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ language.t('common.description') }}</mat-label>
          <input matInput formControlName="description">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ language.t('common.amount') }} (RON)</mat-label>
          <input matInput type="number" min="0.01" step="0.01" formControlName="amount">
        </mat-form-field>

        <mat-checkbox formControlName="amountPrivate">{{ language.t('finance.amountPrivate') }}</mat-checkbox>

        <mat-form-field appearance="outline">
          <mat-label>{{ language.t('common.date') }}</mat-label>
          <input matInput type="date" formControlName="transactionDate">
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="toolbar-button toolbar-secondary-button" type="button" mat-dialog-close>{{ language.t('common.cancel') }}</button>
      <button class="toolbar-button toolbar-primary-button" type="submit" form="transaction-form" [disabled]="form.invalid">
        <mat-icon>{{ data.transaction ? 'save' : 'add' }}</mat-icon>
        {{ data.transaction ? language.t('common.save') : language.t('common.add') }}
      </button>
    </mat-dialog-actions>
  `
})
export class TransactionFormDialogComponent {
  private fb = inject(FormBuilder);
  language = inject(LanguageService);
  data = inject<TransactionFormDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject<MatDialogRef<TransactionFormDialogComponent, TransactionRequest>>(MatDialogRef);

  form = this.fb.nonNullable.group({
    type: [this.data.transaction?.type || 'EXPENSE' as FinancialTransaction['type'], Validators.required],
    name: [this.data.transaction?.name || '', Validators.required],
    description: [this.data.transaction?.description || ''],
    amount: [this.data.transaction?.amount || 0, [Validators.required, Validators.min(0.01)]],
    amountPrivate: [!!this.data.transaction?.amountPrivate],
    transactionDate: [this.data.transaction?.transactionDate || this.today()]
  });

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    this.dialogRef.close({
      ...value,
      description: value.description || null,
      amountPrivate: value.amountPrivate
    });
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
