import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, 'OK', {
      duration: 3000,
      panelClass: ['toast-success']
    });
  }

  info(message: string): void {
    this.snackBar.open(message, 'OK', {
      duration: 3500
    });
  }

  error(message: string): void {
    this.snackBar.open(message, 'OK', {
      duration: 5000,
      panelClass: ['toast-error']
    });
  }
}
