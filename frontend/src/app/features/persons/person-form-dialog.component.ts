import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { LanguageService } from '../../core/language.service';
import { Person, PersonRequest } from './person.model';

export interface PersonFormDialogData {
  person?: Person | null;
  widowed?: boolean;
}

export interface PersonFormDialogResult extends PersonRequest {
  widowed: boolean;
  statusPhotoFile: File | null;
}

@Component({
  selector: 'app-person-form-dialog',
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
      width: min(460px, 100%);
      max-width: 100%;
      box-sizing: border-box;
      padding-top: 8px;
    }

    mat-dialog-content,
    mat-form-field {
      max-width: 100%;
      box-sizing: border-box;
    }

    .status-checkbox {
      margin: -2px 0 2px;
      color: var(--app-text);
      font-size: 14px;
      font-weight: 600;
    }

    .status-options {
      display: grid;
      gap: 6px;
    }

    .photo-row {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .photo-name {
      overflow: hidden;
      color: var(--app-muted);
      font-size: 13px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `],
  template: `
    <h2 mat-dialog-title>{{ data.person ? text('Editează persoana', 'Edit person') : text('Persoană nouă', 'New person') }}</h2>
    <mat-dialog-content>
      <form class="dialog-form" [formGroup]="form" id="person-form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>{{ text('Prenume', 'First name') }}</mat-label>
          <input matInput formControlName="firstName">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ text('Nume', 'Last name') }}</mat-label>
          <input matInput formControlName="lastName">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput formControlName="email">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ text('Telefon', 'Phone') }}</mat-label>
          <input matInput formControlName="phone">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ text('Data nașterii', 'Birth date') }}</mat-label>
          <input matInput type="date" formControlName="birthDate">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ text('Gen (opțional)', 'Gender (optional)') }}</mat-label>
          <mat-select formControlName="gender">
            <mat-option value="">{{ text('Nespecificat', 'Not specified') }}</mat-option>
            <mat-option value="MALE">{{ text('Bărbat', 'Male') }}</mat-option>
            <mat-option value="FEMALE">{{ text('Femeie', 'Female') }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ text('Tip', 'Type') }}</mat-label>
          <mat-select formControlName="memberType">
            <mat-option value="MEMBER">{{ text('Membru', 'Member') }}</mat-option>
            <mat-option value="CHILD">{{ text('Copil', 'Child') }}</mat-option>
            <mat-option value="ADHERENT">{{ text('Apartenent', 'Adherent') }}</mat-option>
            <mat-option value="OCCASIONAL_VISITOR">{{ text('Vizitator ocazional', 'Occasional visitor') }}</mat-option>
            <mat-option value="VISITOR">{{ text('Vizitator', 'Visitor') }}</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="status-options">
          <mat-form-field appearance="outline">
            <mat-label>{{ text('Status', 'Status') }}</mat-label>
            <mat-select formControlName="status">
              <mat-option value="ACTIVE">{{ text('Activ', 'Active') }}</mat-option>
              <mat-option value="INACTIVE" [disabled]="form.controls.memberType.value === 'CHILD'">{{ text('Inactiv', 'Inactive') }}</mat-option>
              <mat-option value="DECEASED">{{ text('Decedat', 'Deceased') }}</mat-option>
              <mat-option value="TRANSFERRED">{{ text('Transferat', 'Transferred') }}</mat-option>
              <mat-option value="WITHDRAWN">{{ text('Retras', 'Withdrawn') }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-checkbox class="status-checkbox" formControlName="widowed">
            {{ text('Văduv(ă)', 'Widowed') }}
          </mat-checkbox>
        </div>

        @if (requiresStatusDetails()) {
          <mat-form-field appearance="outline">
            <mat-label>{{ text('Data trecerii (opțională)', 'Transition date (optional)') }}</mat-label>
            <input matInput type="date" formControlName="statusChangedDate">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>{{ text('Detalii status', 'Status details') }}</mat-label>
            <textarea matInput formControlName="statusDetails" rows="3"></textarea>
          </mat-form-field>

          <div class="photo-row">
            <input #statusPhotoInput type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden (change)="selectStatusPhoto($event)">
            <button class="toolbar-button toolbar-secondary-button" type="button" (click)="statusPhotoInput.click()">
              <mat-icon>image</mat-icon>
              {{ text('Poză', 'Photo') }}
            </button>
            <span class="photo-name">{{ statusPhotoName() }}</span>
          </div>
        }

        <mat-form-field appearance="outline">
          <mat-label>{{ text('Descriere publică', 'Public description') }}</mat-label>
          <textarea matInput formControlName="publicDescription" rows="3"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ text('Comentariul meu privat', 'My private comment') }}</mat-label>
          <textarea matInput formControlName="privateDescription" rows="3"></textarea>
          <mat-hint>{{ text('Vizibil doar pentru userul tău. În afișare se adaugă după descrierea publică.', 'Visible only to your user. It is appended after the public description when displayed.') }}</mat-hint>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="toolbar-button toolbar-secondary-button" type="button" mat-dialog-close>{{ text('Anulează', 'Cancel') }}</button>
      <button class="toolbar-button toolbar-primary-button" type="submit" form="person-form" [disabled]="form.invalid">
        <mat-icon>{{ data.person ? 'save' : 'add' }}</mat-icon>
        {{ data.person ? text('Salvează', 'Save') : text('Adaugă', 'Add') }}
      </button>
    </mat-dialog-actions>
  `
})
export class PersonFormDialogComponent {
  private fb = inject(FormBuilder);
  private readonly language = inject(LanguageService);
  data = inject<PersonFormDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject<MatDialogRef<PersonFormDialogComponent, PersonFormDialogResult>>(MatDialogRef);
  private statusPhotoFile: File | null = null;

  text(ro: string, en: string): string {
    return this.language.language() === 'en' ? en : ro;
  }

  form = this.fb.nonNullable.group({
    firstName: [this.data.person?.firstName || '', Validators.required],
    lastName: [this.data.person?.lastName || '', Validators.required],
    email: [this.data.person?.email || ''],
    phone: [this.data.person?.phone || ''],
    birthDate: [this.data.person?.birthDate || ''],
    gender: [this.data.person?.gender || ''],
    memberType: [this.data.person?.memberType || 'MEMBER' as Person['memberType'], Validators.required],
    status: [this.data.person?.status || (this.data.person?.active === false ? 'INACTIVE' : 'ACTIVE')],
    statusChangedDate: [this.data.person?.statusChangedDate || ''],
    statusDetails: [this.data.person?.statusDetails || ''],
    widowed: [this.data.widowed ?? false],
    publicDescription: [this.data.person?.publicDescription || ''],
    privateDescription: [this.data.person?.privateDescription || '']
  });

  constructor() {
    this.form.controls.memberType.valueChanges.subscribe((memberType) => {
      if (memberType === 'CHILD' && this.form.controls.status.value === 'INACTIVE') {
        this.form.controls.status.setValue('ACTIVE');
      }
    });
  }

  requiresStatusDetails(): boolean {
    const status = this.form.controls.status.value;
    return status === 'DECEASED' || status === 'TRANSFERRED' || status === 'WITHDRAWN';
  }

  selectStatusPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.statusPhotoFile = input.files?.[0] || null;
  }

  statusPhotoName(): string {
    return this.statusPhotoFile?.name || this.data.person?.statusPhotoFileName || this.text('Nicio poză selectată', 'No photo selected');
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    const raw = this.form.getRawValue();
    const status = raw.memberType === 'CHILD' && raw.status === 'INACTIVE' ? 'ACTIVE' : raw.status;
    this.dialogRef.close({
      ...raw,
      description: raw.publicDescription || null,
      publicDescription: raw.publicDescription || null,
      privateDescription: raw.privateDescription || null,
      birthDate: raw.birthDate || null,
      gender: (raw.gender || null) as Person['gender'],
      active: status === 'ACTIVE',
      status,
      statusChangedDate: status === 'DECEASED' || status === 'TRANSFERRED' || status === 'WITHDRAWN' ? raw.statusChangedDate || null : null,
      statusDetails: status === 'DECEASED' || status === 'TRANSFERRED' || status === 'WITHDRAWN' ? raw.statusDetails || null : null,
      widowed: raw.widowed,
      descriptionPrivate: false,
      statusPhotoFile: this.statusPhotoFile
    });
  }
}
