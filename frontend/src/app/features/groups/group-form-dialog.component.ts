import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Person } from '../persons/person.model';
import { Group, GroupRequest, GroupType } from './group.model';

export interface GroupFormDialogData {
  group?: Group | null;
  persons?: Person[];
}

@Component({
  selector: 'app-group-form-dialog',
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
    <h2 mat-dialog-title>{{ data.group ? 'Editează grupul' : 'Grup nou' }}</h2>
    <mat-dialog-content>
      <form class="dialog-form" [formGroup]="form" id="group-form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>Nume</mat-label>
          <input matInput formControlName="name">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Tip</mat-label>
          <mat-select formControlName="type">
            <mat-option value="SMALL_GROUP">Grup mic</mat-option>
            <mat-option value="MINISTRY">Lucrare</mat-option>
            <mat-option value="TEAM">Echipă</mat-option>
            <mat-option value="CLASS">Clasă</mat-option>
            <mat-option value="OTHER">Alt tip</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Descriere</mat-label>
          <textarea matInput formControlName="description" rows="4"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Link grup WhatsApp</mat-label>
          <input matInput formControlName="whatsappLink" placeholder="https://chat.whatsapp.com/...">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Membri</mat-label>
          <mat-select formControlName="memberIds" multiple>
            @for (person of personOptions(); track person.id) {
              <mat-option [value]="person.id">{{ displayName(person) }}</mat-option>
            }
          </mat-select>
          <mat-hint>Selectează persoanele care fac parte din grup.</mat-hint>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="toolbar-button toolbar-secondary-button" type="button" mat-dialog-close>Anulează</button>
      <button class="toolbar-button toolbar-primary-button" type="submit" form="group-form" [disabled]="form.invalid">
        <mat-icon>{{ data.group ? 'save' : 'add' }}</mat-icon>
        {{ data.group ? 'Salvează' : 'Adaugă' }}
      </button>
    </mat-dialog-actions>
  `
})
export class GroupFormDialogComponent {
  private fb = inject(FormBuilder);
  data = inject<GroupFormDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject<MatDialogRef<GroupFormDialogComponent, GroupRequest>>(MatDialogRef);

  form = this.fb.nonNullable.group({
    name: [this.data.group?.name || '', Validators.required],
    type: [this.data.group?.type || 'SMALL_GROUP' as GroupType, Validators.required],
    description: [this.data.group?.description || ''],
    whatsappLink: [this.data.group?.whatsappLink || ''],
    memberIds: [this.data.group?.memberIds || [] as number[]]
  });

  personOptions(): Person[] {
    return [...(this.data.persons || [])]
      .sort((left, right) => this.displayName(left).localeCompare(this.displayName(right), 'ro'));
  }

  displayName(person: Person): string {
    return [person.lastName, person.firstName].filter(Boolean).join(' ').trim() || person.fullName;
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    const raw = this.form.getRawValue();
    const name = raw.name.trim();
    if (!name) {
      this.form.controls.name.setErrors({ required: true });
      return;
    }
    this.dialogRef.close({
      name,
      type: raw.type,
      description: raw.description.trim() || null,
      whatsappLink: raw.whatsappLink.trim() || null,
      leaderId: this.data.group?.leaderId || null,
      memberIds: raw.memberIds
    });
  }
}
