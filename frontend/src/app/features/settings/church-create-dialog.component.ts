import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { ChurchSettingsRequest } from '../../core/church-settings.model';
import { LanguageService } from '../../core/language.service';

export interface ChurchCreateDialogResult {
  request: ChurchSettingsRequest;
  avatarFile: File | null;
}

@Component({
  selector: 'app-church-create-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule
  ],
  styles: [`
    .dialog-form {
      display: grid;
      gap: 12px;
      width: min(560px, 100%);
      max-width: 100%;
      box-sizing: border-box;
      padding-top: 8px;
    }

    .dialog-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
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

    mat-dialog-content,
    mat-form-field {
      max-width: 100%;
      box-sizing: border-box;
    }

    @media (max-width: 640px) {
      .dialog-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
  template: `
    <h2 mat-dialog-title>{{ text('Biserică nouă', 'New church') }}</h2>
    <mat-dialog-content>
      <form class="dialog-form" [formGroup]="form" id="church-create-form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>{{ text('Numele bisericii', 'Church name') }}</mat-label>
          <input matInput formControlName="name">
        </mat-form-field>

        <div class="dialog-grid">
          <mat-form-field appearance="outline">
            <mat-label>{{ text('Pastor / responsabil', 'Pastor / leader') }}</mat-label>
            <input matInput formControlName="pastorName">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>{{ text('Confesiune', 'Denomination') }}</mat-label>
            <input matInput formControlName="denomination">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>{{ text('Persoană de contact', 'Contact person') }}</mat-label>
            <input matInput formControlName="contactPerson">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>{{ text('Casier', 'Treasurer') }}</mat-label>
            <input matInput formControlName="treasurerName">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>{{ text('Secretar', 'Secretary') }}</mat-label>
            <input matInput formControlName="secretaryName">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>{{ text('Adresă', 'Address') }}</mat-label>
          <textarea matInput formControlName="address" rows="3"></textarea>
        </mat-form-field>

        <div class="photo-row">
          <input #photoInput type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden (change)="selectPhoto($event)">
          <button class="toolbar-button toolbar-secondary-button" type="button" (click)="photoInput.click()">
            <mat-icon>upload</mat-icon>
            {{ text('Poză', 'Photo') }}
          </button>
          <span class="photo-name">{{ avatarFile?.name || text('Nicio poză selectată', 'No photo selected') }}</span>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="toolbar-button toolbar-secondary-button" type="button" mat-dialog-close>{{ text('Anulează', 'Cancel') }}</button>
      <button class="toolbar-button toolbar-primary-button" type="submit" form="church-create-form" [disabled]="form.invalid">
        <mat-icon>add</mat-icon>
        {{ text('Adaugă', 'Add') }}
      </button>
    </mat-dialog-actions>
  `
})
export class ChurchCreateDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<ChurchCreateDialogComponent, ChurchCreateDialogResult>>(MatDialogRef);
  private readonly language = inject(LanguageService);
  avatarFile: File | null = null;

  text(ro: string, en: string): string {
    return this.language.language() === 'en' ? en : ro;
  }

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    pastorName: ['', Validators.maxLength(160)],
    denomination: ['', Validators.maxLength(160)],
    address: ['', Validators.maxLength(600)],
    treasurerName: ['', Validators.maxLength(160)],
    secretaryName: ['', Validators.maxLength(160)],
    contactPerson: ['', Validators.maxLength(160)]
  });

  selectPhoto(event: Event): void {
    this.avatarFile = (event.target as HTMLInputElement).files?.[0] || null;
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
      request: {
        name,
        pastorName: clean(raw.pastorName),
        denomination: clean(raw.denomination),
        address: clean(raw.address),
        treasurerName: clean(raw.treasurerName),
        secretaryName: clean(raw.secretaryName),
        contactPerson: clean(raw.contactPerson)
      },
      avatarFile: this.avatarFile
    });
  }
}

function clean(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}
