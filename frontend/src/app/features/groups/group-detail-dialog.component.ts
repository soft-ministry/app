import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { groupTypeLabel } from '../../shared/display-labels';
import { Group } from './group.model';

@Component({
  selector: 'app-group-detail-dialog',
  standalone: true,
  imports: [MatDialogModule, MatIconModule],
  styles: [`
    .detail-shell {
      display: grid;
      gap: 18px;
      width: min(520px, 100%);
      box-sizing: border-box;
    }

    .detail-title {
      margin: 0;
      color: var(--app-text);
      font-size: 24px;
      font-weight: 750;
      line-height: 1.18;
    }

    .detail-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .detail-item,
    .detail-description {
      display: grid;
      gap: 5px;
      padding: 12px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: #ffffff;
    }

    .detail-description {
      background: #fafbf9;
    }

    .detail-label {
      color: var(--app-muted);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .detail-value {
      color: var(--app-text);
      font-size: 14px;
      line-height: 1.4;
    }

    .detail-description p {
      margin: 0;
      white-space: pre-wrap;
    }

    .whatsapp-link {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      width: fit-content;
      color: #047857;
      font-size: 14px;
      font-weight: 750;
      text-decoration: none;
    }

    .whatsapp-link mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
      line-height: 18px;
    }

    @media (max-width: 620px) {
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
  template: `
    <h2 mat-dialog-title>Detalii grup</h2>
    <mat-dialog-content>
      <section class="detail-shell">
        <div>
          <h3 class="detail-title">{{ group.name }}</h3>
          <div class="detail-meta">
            <span class="badge info">{{ groupTypeLabel(group.type) }}</span>
            <span class="badge warning">{{ group.memberCount }} membri</span>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Lider</span>
            <span class="detail-value">{{ group.leaderName || '-' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Membri</span>
            <span class="detail-value">{{ group.memberCount }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">WhatsApp</span>
            @if (group.whatsappLink) {
              <a class="whatsapp-link" [href]="group.whatsappLink" target="_blank" rel="noopener noreferrer">
                <mat-icon>open_in_new</mat-icon>
                Deschide grupul
              </a>
            } @else {
              <span class="detail-value">-</span>
            }
          </div>
        </div>

        <div class="detail-description">
          <span class="detail-label">Descriere</span>
          <p class="detail-value">{{ group.description || 'Fără descriere.' }}</p>
        </div>
      </section>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="toolbar-button toolbar-primary-button" type="button" mat-dialog-close>
        <mat-icon>check</mat-icon>
        Închide
      </button>
    </mat-dialog-actions>
  `
})
export class GroupDetailDialogComponent {
  group = inject<Group>(MAT_DIALOG_DATA);
  groupTypeLabel = groupTypeLabel;
}
