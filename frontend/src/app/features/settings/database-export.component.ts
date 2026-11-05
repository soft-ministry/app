import { Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import { apiErrorMessage } from '../../shared/api-error-message';
import { LanguageService } from '../../core/language.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { PageNavComponent } from '../../shared/page-nav.component';
import { DatabaseExportService } from './database-export.service';

@Component({
  selector: 'app-database-export',
  standalone: true,
  imports: [MatIconModule, PageNavComponent],
  template: `
    <main class="page">
      <header class="page-header">
        <div class="page-header-main">
          <h1 class="page-title page-title-offset">{{ language.language() === 'en' ? 'Database' : 'Bază de date' }}</h1>
          <p class="page-subtitle" aria-hidden="true">&nbsp;</p>
        </div>
        <div class="page-header-actions">
          <app-page-nav />
        </div>
      </header>

      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">{{ text('Backup și restaurare', 'Backup and restore') }}</h2>
            <p class="surface-kicker">{{ text('Exportă o copie completă SQLite și restaureaz-o ulterior.', 'Export a complete SQLite copy and restore it later.') }}</p>
          </div>
        </div>
        <div class="surface-content">
          <div class="database-export-content">
            <div class="empty-state database-export-note">
              <mat-icon>database</mat-icon>
              <span>{{ text('Exportul include schema și datele curente. Fișierul .sqlite poate fi importat din nou în aplicație.', 'The export includes the schema and current data. The .sqlite file can be imported back into the app.') }}</span>
            </div>
            <div class="database-export-actions">
              <button class="toolbar-button toolbar-primary-button" type="button" [disabled]="exporting()" (click)="exportDatabase()">
                <mat-icon>{{ exporting() ? 'hourglass_empty' : 'download' }}</mat-icon>
                {{ exporting() ? text('Se pregătește exportul', 'Preparing export') : text('Descarcă baza de date', 'Download database') }}
              </button>
            </div>

            <div class="database-import-panel">
              <div class="database-import-copy">
                <h3>{{ text('Import bază de date', 'Import database') }}</h3>
                <p>{{ text('Alege un fișier .sqlite exportat din aplicație. Importul face backup automat la baza curentă, apoi o înlocuiește.', 'Choose a .sqlite file exported from the app. Import creates an automatic backup of the current database, then replaces it.') }}</p>
              </div>
              <input #databaseInput type="file" accept=".sqlite,.db,application/vnd.sqlite3,application/octet-stream" hidden (change)="selectImportFile($event)">
              <div class="database-export-actions">
                <button class="toolbar-button toolbar-secondary-button" type="button" [disabled]="importing()" (click)="databaseInput.click()">
                  <mat-icon>upload_file</mat-icon>
                  {{ text('Alege fișier', 'Choose file') }}
                </button>
                <span class="database-file-name">{{ importFile()?.name || text('Niciun fișier selectat', 'No file selected') }}</span>
                <button class="toolbar-button toolbar-danger-button" type="button" [disabled]="!importFile() || importing()" (click)="confirmImport()">
                  <mat-icon>{{ importing() ? 'hourglass_empty' : 'restore' }}</mat-icon>
                  {{ importing() ? text('Se importă', 'Importing') : text('Importă baza de date', 'Import database') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  `,
  styles: [`
    .database-export-content {
      display: grid;
      gap: 14px;
    }

    .database-export-actions {
      align-items: center;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .database-export-note {
      justify-content: flex-start;
    }

    .database-import-panel {
      display: grid;
      gap: 12px;
      padding-top: 14px;
      border-top: 1px solid var(--app-border);
    }

    .database-import-copy {
      display: grid;
      gap: 4px;
    }

    .database-import-copy h3 {
      margin: 0;
      color: var(--app-text);
      font-size: 15px;
      font-weight: 850;
    }

    .database-import-copy p,
    .database-file-name {
      margin: 0;
      color: var(--app-muted);
      font-size: 13px;
      line-height: 1.45;
    }

    .database-file-name {
      overflow: hidden;
      max-width: min(420px, 100%);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `]
})
export class DatabaseExportComponent {
  language = inject(LanguageService);
  private readonly databaseExportService = inject(DatabaseExportService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  exporting = signal(false);
  importing = signal(false);
  importFile = signal<File | null>(null);

  text(ro: string, en: string): string {
    return this.language.language() === 'en' ? en : ro;
  }

  exportDatabase(): void {
    if (this.exporting()) {
      return;
    }
    this.exporting.set(true);
    this.databaseExportService.download().subscribe({
      next: (download) => {
        this.saveBlob(download.blob, download.filename);
        this.exporting.set(false);
        this.snackBar.open(this.text('Exportul bazei de date a fost descărcat.', 'Database export was downloaded.'), 'OK', {
          duration: 2800,
          panelClass: 'toast-success'
        });
      },
      error: (error) => {
        this.exporting.set(false);
        this.snackBar.open(apiErrorMessage(error, this.text('Nu s-a putut exporta baza de date.', 'Database could not be exported.')), 'OK', {
          duration: 4200,
          panelClass: 'toast-error'
        });
      }
    });
  }

  selectImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.importFile.set(input.files?.[0] || null);
    input.value = '';
  }

  confirmImport(): void {
    const file = this.importFile();
    if (!file || this.importing()) {
      return;
    }
    this.dialog.open(ConfirmDialogComponent, {
      width: '520px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        title: this.text('Import bază de date', 'Import database'),
        message: this.text(`Importul va înlocui baza de date curentă cu fișierul "${file.name}". Se face backup automat înainte, dar aplicația trebuie repornită după import.`, `The current database will be replaced with "${file.name}". An automatic backup is created first, but the app must be restarted after the import.`),
        confirmLabel: this.text('Importă', 'Import'),
        cancelLabel: this.text('Anulează', 'Cancel')
      }
    }).afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.importDatabase(file);
      }
    });
  }

  private importDatabase(file: File): void {
    this.importing.set(true);
    this.databaseExportService.import(file).subscribe({
      next: (response) => {
        this.importFile.set(null);
        this.importing.set(false);
        this.snackBar.open(this.text(`${response.message} Backup: ${response.backupPath}`, `Database imported successfully. Backup: ${response.backupPath}`), 'OK', {
          duration: 8000,
          panelClass: 'toast-success'
        });
      },
      error: (error) => {
        this.importing.set(false);
        this.snackBar.open(apiErrorMessage(error, this.text('Nu s-a putut importa baza de date.', 'Database could not be imported.')), 'OK', {
          duration: 5200,
          panelClass: 'toast-error'
        });
      }
    });
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}
