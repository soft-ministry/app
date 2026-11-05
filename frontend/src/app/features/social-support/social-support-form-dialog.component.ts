import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Person } from '../persons/person.model';
import {
  SocialNeedType,
  SocialSupportCase,
  SocialSupportCaseRequest,
  SocialSupportPriority,
  SocialSupportStatus
} from './social-support.model';

export interface SocialSupportFormDialogData {
  case?: SocialSupportCase | null;
  persons: Person[];
}

@Component({
  selector: 'app-social-support-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule
  ],
  styles: [`
    .dialog-form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      width: min(720px, 100%);
      max-width: 100%;
      box-sizing: border-box;
      padding-top: 8px;
    }

    .wide {
      grid-column: 1 / -1;
    }

    mat-dialog-content,
    mat-form-field {
      max-width: 100%;
      box-sizing: border-box;
    }

    @media (max-width: 640px) {
      .dialog-form {
        grid-template-columns: 1fr;
      }
    }
  `],
  template: `
    <h2 mat-dialog-title>{{ data.case ? 'Editează cazul de sprijin' : 'Caz de sprijin nou' }}</h2>
    <mat-dialog-content>
      <form class="dialog-form" [formGroup]="form" id="social-support-form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>Persoană</mat-label>
          <mat-select formControlName="personId">
            @if (personOptions().length === 0) {
              <mat-option disabled>Nu există persoane disponibile</mat-option>
            }
            @for (person of personOptions(); track person.id) {
              <mat-option [value]="person.id">{{ displayName(person) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Responsabil</mat-label>
          <mat-select formControlName="assignedToId">
            <mat-option [value]="null">Fără responsabil</mat-option>
            @if (personOptions().length === 0) {
              <mat-option disabled>Nu există persoane disponibile</mat-option>
            }
            @for (person of personOptions(); track person.id) {
              <mat-option [value]="person.id">{{ displayName(person) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Tip nevoie</mat-label>
          <mat-select formControlName="needType">
            <mat-option value="FINANCIAL">Sprijin financiar</mat-option>
            <mat-option value="SOCIAL">Sprijin social</mat-option>
            <mat-option value="FOOD">Alimente</mat-option>
            <mat-option value="MEDICAL">Medical</mat-option>
            <mat-option value="HOUSING">Locuire</mat-option>
            <mat-option value="COUNSELING">Consiliere</mat-option>
            <mat-option value="OTHER">Altă nevoie</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select formControlName="status">
            <mat-option value="UNDER_OBSERVATION">Sub observație</mat-option>
            <mat-option value="ACTIVE_NEED">Nevoie activă</mat-option>
            <mat-option value="SUPPORTED">Sprijin activ</mat-option>
            <mat-option value="RESOLVED">Rezolvat</mat-option>
            <mat-option value="CLOSED">Închis</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Prioritate</mat-label>
          <mat-select formControlName="priority">
            <mat-option value="LOW">Scăzută</mat-option>
            <mat-option value="MEDIUM">Normală</mat-option>
            <mat-option value="HIGH">Ridicată</mat-option>
            <mat-option value="URGENT">Urgentă</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Următoarea verificare</mat-label>
          <input matInput type="date" formControlName="nextReviewDate">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Sumă estimată</mat-label>
          <input matInput type="number" min="0" step="0.01" formControlName="estimatedAmount">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Sumă aprobată</mat-label>
          <input matInput type="number" min="0" step="0.01" formControlName="approvedAmount">
        </mat-form-field>

        <mat-form-field class="wide" appearance="outline">
          <mat-label>Rezumat</mat-label>
          <textarea matInput formControlName="summary" rows="3"></textarea>
        </mat-form-field>

        <mat-form-field class="wide" appearance="outline">
          <mat-label>Notițe private</mat-label>
          <textarea matInput formControlName="privateNotes" rows="4"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="toolbar-button toolbar-secondary-button" type="button" mat-dialog-close>Anulează</button>
      <button class="toolbar-button toolbar-primary-button" type="submit" form="social-support-form" [disabled]="form.invalid">
        <mat-icon>{{ data.case ? 'save' : 'add' }}</mat-icon>
        {{ data.case ? 'Salvează' : 'Adaugă' }}
      </button>
    </mat-dialog-actions>
  `
})
export class SocialSupportFormDialogComponent {
  private fb = inject(FormBuilder);
  data = inject<SocialSupportFormDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject<MatDialogRef<SocialSupportFormDialogComponent, SocialSupportCaseRequest>>(MatDialogRef);

  form = this.fb.nonNullable.group({
    personId: [this.data.case?.personId ?? null as number | null, Validators.required],
    assignedToId: [this.data.case?.assignedToId ?? null as number | null],
    needType: [this.data.case?.needType || 'SOCIAL' as SocialNeedType, Validators.required],
    status: [this.data.case?.status || 'UNDER_OBSERVATION' as SocialSupportStatus, Validators.required],
    priority: [this.data.case?.priority || 'MEDIUM' as SocialSupportPriority, Validators.required],
    summary: [this.data.case?.summary || '', Validators.required],
    privateNotes: [this.data.case?.privateNotes || ''],
    estimatedAmount: [this.data.case?.estimatedAmount ?? null as number | null],
    approvedAmount: [this.data.case?.approvedAmount ?? null as number | null],
    nextReviewDate: [this.data.case?.nextReviewDate || '']
  });

  personOptions(): Person[] {
    return [...this.data.persons].sort((left, right) => this.displayName(left).localeCompare(this.displayName(right), 'ro'));
  }

  displayName(person: Person): string {
    return [person.lastName, person.firstName].filter(Boolean).join(' ').trim() || person.fullName;
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    const raw = this.form.getRawValue();
    const summary = raw.summary.trim();
    if (!raw.personId || !summary) {
      return;
    }
    this.dialogRef.close({
      personId: raw.personId,
      assignedToId: raw.assignedToId || null,
      needType: raw.needType,
      status: raw.status,
      priority: raw.priority,
      summary,
      privateNotes: raw.privateNotes.trim() || null,
      estimatedAmount: raw.estimatedAmount ?? null,
      approvedAmount: raw.approvedAmount ?? null,
      nextReviewDate: raw.nextReviewDate || null,
      closedAt: raw.status === 'CLOSED' || raw.status === 'RESOLVED'
        ? this.data.case?.closedAt || new Date().toISOString().slice(0, 10)
        : null
    });
  }
}
