import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../../core/auth.service';
import { LanguageService } from '../../../core/language.service';
import { apiErrorMessage } from '../../../shared/api-error-message';
import { ToastService } from '../../../shared/toast.service';
import { EventAttachmentView } from './event-attachment.model';
import { EventAttachmentsService } from './event-attachments.service';

@Component({
  selector: 'app-event-attachments',
  standalone: true,
  imports: [MatIconModule],
  styles: [`
    .attachments-shell {
      display: grid;
      gap: 8px;
      padding: 10px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: #ffffff;
    }

    .attachments-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .attachments-title {
      margin: 0;
      color: var(--app-text);
      font-size: 14px;
      font-weight: 750;
    }

    .attachment-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
      gap: 8px;
    }

    .attachment-card {
      overflow: hidden;
      display: grid;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface-muted);
    }

    .attachment-image {
      width: 100%;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      background: #eef2f7;
    }

    .attachment-info {
      display: grid;
      gap: 2px;
      min-width: 0;
      padding: 5px 7px;
    }

    .attachment-name {
      overflow: hidden;
      color: var(--app-text);
      font-size: 12px;
      font-weight: 700;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .attachment-size {
      color: var(--app-muted);
      font-size: 11px;
    }

    .attachment-actions {
      display: flex;
      justify-content: flex-end;
      padding: 0 4px 4px;
    }

    .empty-attachments {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--app-muted);
      font-size: 13px;
      min-height: 30px;
    }

    .empty-attachments mat-icon {
      color: var(--app-primary);
    }
  `],
  template: `
    @if (shouldShowSection()) {
      <section class="attachments-shell">
      <div class="attachments-header">
        <h3 class="attachments-title">{{ text('Poze', 'Photos') }}</h3>
        @if (!readonly && auth.isAdmin()) {
          <input #fileInput type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden (change)="upload($event)">
          <button class="toolbar-button toolbar-secondary-button" type="button" (click)="fileInput.click()">
            <mat-icon>add_photo_alternate</mat-icon>
            {{ text('Adaugă', 'Add') }}
          </button>
        }
      </div>

      @if (attachments().length > 0) {
        <div class="attachment-grid">
          @for (attachment of attachments(); track attachment.id) {
            <article class="attachment-card">
              @if (attachment.previewUrl) {
                <img class="attachment-image" [src]="attachment.previewUrl" [alt]="attachment.fileName">
              } @else {
                <div class="empty-attachments">
                  <mat-icon>image</mat-icon>
                </div>
              }
              <div class="attachment-info">
                <span class="attachment-name" [title]="attachment.fileName">{{ attachment.fileName }}</span>
                <span class="attachment-size">{{ formatSize(attachment.fileSize) }}</span>
              </div>
              @if (!readonly && auth.isAdmin()) {
                <div class="attachment-actions">
                  <button class="table-icon-button" type="button" [attr.aria-label]="text('Șterge poza', 'Delete photo')" (click)="delete(attachment.id)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
            </article>
          }
        </div>
      } @else {
        <div class="empty-attachments">
          <mat-icon>image</mat-icon>
          <span>{{ text('Nu există poze atașate.', 'No photos attached.') }}</span>
        </div>
      }
      </section>
    }
  `
})
export class EventAttachmentsComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) eventId!: number;
  @Input() readonly = false;

  private attachmentsService = inject(EventAttachmentsService);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  language = inject(LanguageService);

  attachments = signal<EventAttachmentView[]>([]);

  text(ro: string, en: string): string {
    return this.language.language() === 'en' ? en : ro;
  }

  shouldShowSection(): boolean {
    return !this.readonly || this.attachments().length > 0;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventId'] && this.eventId) {
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.revokePreviewUrls();
  }

  load(): void {
    this.attachmentsService.list(this.eventId).subscribe({
      next: (attachments) => {
        this.revokePreviewUrls();
        this.attachments.set(attachments);
        attachments.forEach((attachment) => this.loadPreview(attachment.id));
      },
      error: (error) => this.toast.error(apiErrorMessage(error, this.text('Nu s-au putut încărca pozele.', 'Photos could not be loaded.')))
    });
  }

  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    if (files.length === 0) {
      return;
    }

    this.attachmentsService.upload(this.eventId, files).subscribe({
      next: () => {
        this.toast.success(files.length === 1
          ? this.text('Poza a fost încărcată.', 'Photo was uploaded.')
          : this.text('Pozele au fost încărcate.', 'Photos were uploaded.'));
        this.load();
      },
      error: (error) => this.toast.error(apiErrorMessage(error, this.text('Nu s-au putut încărca pozele.', 'Photos could not be uploaded.')))
    });
  }

  delete(attachmentId: number): void {
    this.attachmentsService.delete(this.eventId, attachmentId).subscribe({
      next: () => {
        this.toast.success(this.text('Poza a fost ștearsă.', 'Photo was deleted.'));
        this.load();
      },
      error: (error) => this.toast.error(apiErrorMessage(error, this.text('Nu s-a putut șterge poza.', 'Photo could not be deleted.')))
    });
  }

  formatSize(size: number): string {
    if (size < 1024 * 1024) {
      return `${Math.max(1, Math.round(size / 1024))} KB`;
    }
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  private loadPreview(attachmentId: number): void {
    this.attachmentsService.content(this.eventId, attachmentId).subscribe({
      next: (blob) => {
        const previewUrl = URL.createObjectURL(blob);
        this.attachments.update((items) => items.map((item) => item.id === attachmentId ? { ...item, previewUrl } : item));
      },
      error: () => {
        this.attachments.update((items) => items.map((item) => item.id === attachmentId ? { ...item, previewUrl: undefined } : item));
      }
    });
  }

  private revokePreviewUrls(): void {
    this.attachments().forEach((attachment) => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    });
  }
}
