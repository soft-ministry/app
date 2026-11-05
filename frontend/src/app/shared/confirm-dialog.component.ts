import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule],
  styles: [`
    .confirm-message {
      margin: 0;
      color: #a34d4d;
      font-size: 18px;
      font-weight: 700;
      line-height: 1.35;
    }

    .confirm-actions {
      gap: 10px;
    }
  `],
  template: `
    <mat-dialog-content>
      <p class="confirm-message">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions class="confirm-actions" align="end">
      <button class="toolbar-button toolbar-secondary-button" type="button" [mat-dialog-close]="false">
        {{ data.cancelLabel || 'Anulează' }}
      </button>
      <button class="toolbar-button toolbar-danger-button" type="button" [mat-dialog-close]="true">
        {{ data.confirmLabel || 'Confirmă' }}
      </button>
    </mat-dialog-actions>
  `
})
export class ConfirmDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData) {}
}
