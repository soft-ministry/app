import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { LanguageService } from '../../core/language.service';
import { UserAccount, UserAccountRequest, UserRole } from './user-account.model';

export interface UserFormDialogData {
  user?: UserAccount | null;
}

@Component({
  selector: 'app-user-form-dialog',
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
  `],
  template: `
    <h2 mat-dialog-title>{{ data.user ? text('Editează utilizatorul', 'Edit user') : text('Utilizator nou', 'New user') }}</h2>
    <mat-dialog-content>
      <form class="dialog-form" [formGroup]="form" id="user-form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>{{ text('Utilizator', 'Username') }}</mat-label>
          <input matInput formControlName="username" autocomplete="off">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ data.user ? text('Parolă nouă', 'New password') : text('Parolă', 'Password') }}</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="new-password">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ text('Rol', 'Role') }}</mat-label>
          <mat-select formControlName="role">
            <mat-option value="ADMIN">{{ text('Administrator', 'Administrator') }}</mat-option>
            <mat-option value="USER">{{ text('Utilizator', 'User') }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-checkbox formControlName="enabled">{{ text('Activ', 'Active') }}</mat-checkbox>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="toolbar-button toolbar-secondary-button" type="button" mat-dialog-close>{{ text('Anulează', 'Cancel') }}</button>
      <button class="toolbar-button toolbar-primary-button" type="submit" form="user-form" [disabled]="form.invalid">
        <mat-icon>{{ data.user ? 'save' : 'add' }}</mat-icon>
        {{ data.user ? text('Salvează', 'Save') : text('Adaugă', 'Add') }}
      </button>
    </mat-dialog-actions>
  `
})
export class UserFormDialogComponent {
  private fb = inject(FormBuilder);
  private readonly language = inject(LanguageService);
  data = inject<UserFormDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject<MatDialogRef<UserFormDialogComponent, UserAccountRequest>>(MatDialogRef);

  form = this.fb.nonNullable.group({
    username: [this.data.user?.username || '', Validators.required],
    password: ['', this.data.user ? [] : [Validators.required]],
    role: [this.data.user?.role || 'USER' as UserRole, Validators.required],
    enabled: [this.data.user?.enabled ?? true]
  });

  text(ro: string, en: string): string {
    return this.language.language() === 'en' ? en : ro;
  }

  constructor() {
    if (this.isDefaultAdmin()) {
      this.form.controls.username.disable();
      this.form.controls.role.disable();
      this.form.controls.enabled.disable();
    }
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    const raw = this.form.getRawValue();
    const username = raw.username.trim();
    if (!username) {
      this.form.controls.username.setErrors({ required: true });
      return;
    }
    this.dialogRef.close({
      username,
      password: raw.password.trim() || null,
      role: raw.role,
      enabled: raw.enabled
    });
  }

  private isDefaultAdmin(): boolean {
    return this.data.user?.username.toLowerCase() === 'admin';
  }
}
