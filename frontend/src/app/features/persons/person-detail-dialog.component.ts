import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { LanguageService } from '../../core/language.service';
import { memberTypeLabel } from '../../shared/display-labels';
import { Family } from '../families/family.model';
import { Group } from '../groups/group.model';
import { Person } from './person.model';
import { PersonsService } from './persons.service';

export interface PersonDetailDialogData {
  person: Person;
  groups: Group[];
  families: Family[];
}

@Component({
  selector: 'app-person-detail-dialog',
  standalone: true,
  imports: [MatDialogModule, MatIconModule],
  styles: [`
    .detail-shell {
      display: grid;
      gap: 14px;
      width: min(640px, 100%);
      box-sizing: border-box;
    }

    .person-head {
      display: grid;
      grid-template-columns: 56px minmax(0, 1fr);
      gap: 13px;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--app-border);
    }

    .person-avatar {
      display: grid;
      width: 56px;
      height: 56px;
      place-items: center;
      border-radius: 8px;
      background: var(--app-primary);
      color: #ffffff;
      font-size: 18px;
      font-weight: 850;
      letter-spacing: 0;
    }

    .person-title-group {
      display: grid;
      gap: 7px;
      min-width: 0;
    }

    .detail-title {
      overflow: hidden;
      margin: 0;
      color: var(--app-text);
      font-size: 22px;
      font-weight: 750;
      line-height: 1.18;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .detail-meta,
    .chip-list {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0;
      overflow: hidden;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: #ffffff;
    }

    .detail-item {
      display: grid;
      grid-template-columns: 112px minmax(0, 1fr);
      gap: 10px;
      align-items: baseline;
      min-width: 0;
      padding: 9px 12px;
      border-bottom: 1px solid #eef2f7;
    }

    .detail-item:nth-child(odd) {
      border-right: 1px solid #eef2f7;
    }

    .detail-item:nth-last-child(-n + 2) {
      border-bottom: 0;
    }

    .detail-section {
      display: grid;
      gap: 8px;
      padding-top: 2px;
    }

    .section-title {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--app-muted);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .section-title mat-icon {
      width: 16px;
      height: 16px;
      color: var(--app-primary);
      font-size: 16px;
      line-height: 16px;
    }

    .detail-label {
      color: var(--app-muted);
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }

    .detail-value {
      overflow-wrap: anywhere;
      color: var(--app-text);
      font-size: 14px;
      font-weight: 650;
      line-height: 1.35;
    }

    .detail-text {
      margin: 0;
      color: var(--app-text);
      font-size: 14px;
      line-height: 1.45;
      white-space: pre-wrap;
    }

    .status-photo {
      overflow: hidden;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: #ffffff;
    }

    .status-photo img {
      display: block;
      width: 100%;
      max-height: 320px;
      object-fit: contain;
      background: #f8fafc;
    }

    @media (max-width: 620px) {
      .person-head,
      .detail-grid {
        grid-template-columns: 1fr;
      }

      .detail-title {
        white-space: normal;
      }

      .detail-item {
        grid-template-columns: 1fr;
        gap: 3px;
      }

      .detail-item:nth-child(odd) {
        border-right: 0;
      }

      .detail-item:nth-last-child(2) {
        border-bottom: 1px solid #eef2f7;
      }
    }
  `],
  template: `
    <mat-dialog-content>
      <section class="detail-shell">
        <header class="person-head">
          <div class="person-avatar" aria-hidden="true">{{ initials() }}</div>
          <div class="person-title-group">
            <h2 class="detail-title">{{ displayName(person) }}</h2>
            <div class="detail-meta">
              <span class="badge info">{{ memberTypeLabel(person.memberType) }}</span>
              <span class="badge" [class.warning]="person.status !== 'ACTIVE'">{{ personStatusLabel(person.status) }}</span>
              <span class="badge" [class.warning]="groups.length === 0">{{ groups.length > 0 ? groups.length + ' ' + text('grupuri', 'groups') : '-' }}</span>
              @if (isWidowed()) {
                <span class="badge warning">{{ text('văduv(ă)', 'widowed') }}</span>
              }
            </div>
          </div>
        </header>

        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Telefon</span>
            <span class="detail-value">{{ valueOrDash(person.phone) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Email</span>
            <span class="detail-value">{{ valueOrDash(person.email) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ text('Naștere', 'Birth date') }}</span>
            <span class="detail-value">{{ formatDate(person.birthDate) || '-' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Rol</span>
            <span class="detail-value">{{ roleLabel() }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ text('Adresă', 'Address') }}</span>
            <span class="detail-value">{{ valueOrDash(person.address) }}</span>
          </div>
          @if (isFinalStatus()) {
            <div class="detail-item">
              <span class="detail-label">Status din</span>
              <span class="detail-value">{{ formatDate(person.statusChangedDate) || '-' }}</span>
            </div>
          }
        </div>

        @if (isFinalStatus() && hasText(person.statusDetails)) {
          <section class="detail-section">
            <span class="section-title">
              <mat-icon>info</mat-icon>
              {{ text('Detalii status', 'Status details') }}
            </span>
            <p class="detail-text">{{ person.statusDetails }}</p>
          </section>
        }

        @if (statusPhotoUrl) {
          <div class="status-photo">
            <img [src]="statusPhotoUrl" [alt]="person.statusPhotoFileName || text('Poză status', 'Status photo')">
          </div>
        }

        @if (groups.length > 0) {
          <section class="detail-section">
            <span class="section-title">
              <mat-icon>diversity_3</mat-icon>
              {{ text('Grupuri', 'Groups') }}
            </span>
            <div class="chip-list">
              @for (group of groups; track group.id) {
                <span class="badge info">{{ group.name }}</span>
              }
            </div>
          </section>
        }

        @if (hasText(descriptionText())) {
          <section class="detail-section">
            <span class="section-title">
              <mat-icon>notes</mat-icon>
              {{ text('Descriere', 'Description') }}
            </span>
            <p class="detail-text">{{ descriptionText() }}</p>
          </section>
        }
      </section>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="toolbar-button toolbar-primary-button" type="button" mat-dialog-close>
        <mat-icon>check</mat-icon>
        {{ text('Închide', 'Close') }}
      </button>
    </mat-dialog-actions>
  `
})
export class PersonDetailDialogComponent implements OnInit, OnDestroy {
  data = inject<PersonDetailDialogData>(MAT_DIALOG_DATA);
  private personsService = inject(PersonsService);
  language = inject(LanguageService);
  person = this.data.person;
  groups = this.data.groups;
  families = this.data.families;
  memberTypeLabel = memberTypeLabel;
  statusPhotoUrl = '';

  text(ro: string, en: string): string {
    return this.language.language() === 'en' ? en : ro;
  }

  ngOnInit(): void {
    if (!this.isFinalStatus() || !this.person.statusPhotoAvailable) {
      return;
    }
    this.personsService.statusPhoto(this.person.id).subscribe((blob) => {
      this.statusPhotoUrl = URL.createObjectURL(blob);
    });
  }

  ngOnDestroy(): void {
    if (this.statusPhotoUrl) {
      URL.revokeObjectURL(this.statusPhotoUrl);
    }
  }

  displayName(person: Person): string {
    return [person.lastName, person.firstName].filter(Boolean).join(' ').trim() || person.fullName;
  }

  roleLabel(): string {
    return [this.person.churchRole, this.person.position].filter(Boolean).join(' / ') || '-';
  }

  initials(): string {
    const first = this.person.firstName?.trim().charAt(0) || '';
    const last = this.person.lastName?.trim().charAt(0) || '';
    return `${last}${first}`.trim().toUpperCase() || this.displayName(this.person).charAt(0).toUpperCase() || '?';
  }

  valueOrDash(value?: string | null): string {
    return value?.trim() || '-';
  }

  descriptionText(): string {
    return this.person.publicDescription?.trim()
      || this.person.description?.trim()
      || this.person.privateDescription?.trim()
      || '';
  }

  personStatusLabel(status: Person['status']): string {
    return {
      ACTIVE: this.text('activ', 'active'),
      INACTIVE: this.text('inactiv', 'inactive'),
      DECEASED: this.text('decedat', 'deceased'),
      TRANSFERRED: this.text('transferat', 'transferred'),
      WITHDRAWN: this.text('retras', 'withdrawn')
    }[status];
  }

  isFinalStatus(): boolean {
    return this.person.status === 'DECEASED' || this.person.status === 'TRANSFERRED' || this.person.status === 'WITHDRAWN';
  }

  hasText(value?: string | null): boolean {
    return !!value?.trim();
  }

  isWidowed(): boolean {
    return this.families.some((family) =>
      family.members.some((member) => member.personId === this.person.id && member.role === 'WIDOWED'));
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '';
    }
    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}.${month}.${year}` : value;
  }
}
