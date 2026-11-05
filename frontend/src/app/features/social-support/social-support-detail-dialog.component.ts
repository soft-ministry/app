import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import {
  socialNeedTypeLabel,
  socialSupportPriorityLabel,
  socialSupportStatusLabel
} from '../../shared/display-labels';
import { SocialSupportCase } from './social-support.model';

@Component({
  selector: 'app-social-support-detail-dialog',
  standalone: true,
  imports: [MatDialogModule, MatIconModule],
  styles: [`
    .paper-document {
      display: grid;
      gap: 18px;
      max-width: 680px;
      padding: 6px 2px 2px;
      color: var(--app-text);
      font-family: Georgia, "Times New Roman", serif;
      line-height: 1.55;
    }

    .document-title {
      margin: 0;
      color: var(--app-text);
      font-size: 20px;
      font-weight: 700;
      line-height: 1.25;
    }

    .document-title-meta {
      color: var(--app-muted);
      font-family: Inter, system-ui, -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 650;
    }

    .document-meta {
      display: grid;
      gap: 5px;
      padding-block: 12px;
      border-top: 1px solid var(--app-border);
      border-bottom: 1px solid var(--app-border);
      font-size: 14px;
    }

    .document-meta p,
    .document-section p {
      margin: 0;
    }

    .document-section {
      display: grid;
      gap: 6px;
      font-size: 15px;
    }

    .document-section h3 {
      margin: 0;
      color: var(--app-text);
      font-family: Inter, system-ui, -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .document-text {
      white-space: pre-wrap;
    }
  `],
  template: `
    <h2 mat-dialog-title>Sprijin social</h2>
    <mat-dialog-content>
      <div class="paper-document">
        <header>
          <h3 class="document-title">
            {{ item.personName }}
            <span class="document-title-meta">({{ needTypeLabel(item.needType) }} - {{ statusLabel(item.status) }})</span>
          </h3>
        </header>

        <section class="document-meta">
          @if (item.assignedToName) {
            <p><strong>Responsabil:</strong> {{ item.assignedToName }}</p>
          }
          <p><strong>Prioritate:</strong> {{ priorityLabel(item.priority) }}</p>
          @if (item.nextReviewDate) {
            <p><strong>Următoarea verificare:</strong> {{ formatDate(item.nextReviewDate) }}</p>
          }
          @if (hasAmount(item.estimatedAmount)) {
            <p><strong>Sumă estimată:</strong> {{ formatAmount(item.estimatedAmount) }}</p>
          }
          @if (hasAmount(item.approvedAmount)) {
            <p><strong>Sumă aprobată:</strong> {{ formatAmount(item.approvedAmount) }}</p>
          }
        </section>

        @if (item.summary) {
          <section class="document-section">
            <h3>Rezumat</h3>
            <p class="document-text">{{ item.summary }}</p>
          </section>
        }

        @if (item.privateNotes) {
          <section class="document-section">
            <h3>Notițe private</h3>
            <p class="document-text">{{ item.privateNotes }}</p>
          </section>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="toolbar-button toolbar-secondary-button" type="button" mat-dialog-close>Închide</button>
    </mat-dialog-actions>
  `
})
export class SocialSupportDetailDialogComponent {
  item = inject<SocialSupportCase>(MAT_DIALOG_DATA);
  needTypeLabel = socialNeedTypeLabel;
  statusLabel = socialSupportStatusLabel;
  priorityLabel = socialSupportPriorityLabel;

  formatDate(value?: string | null): string {
    if (!value) {
      return '';
    }
    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}.${month}.${year}` : value;
  }

  formatAmount(value?: number | null): string {
    if (value === null || value === undefined) {
      return '';
    }
    return new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 }).format(value);
  }

  hasAmount(value?: number | null): boolean {
    return value !== null && value !== undefined;
  }
}
