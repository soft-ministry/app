import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { apiErrorMessage } from '../../shared/api-error-message';
import { LanguageService } from '../../core/language.service';
import { normalizeSearchText } from '../../shared/search-normalization';
import { ToastService } from '../../shared/toast.service';
import { Group } from '../groups/group.model';
import { AttendanceSession, AttendanceSheet } from './attendance.model';
import { AttendanceService } from './attendance.service';

export interface AttendanceEditorDialogData {
  mode: 'create' | 'view' | 'edit';
  attendanceDate: string;
  session: AttendanceSession;
  groups: Group[];
}

@Component({
  selector: 'app-attendance-editor-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatIconModule],
  styles: [`
    .dialog-shell {
      width: min(980px, 100%);
      max-width: 100%;
    }

    .attendance-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      width: 100%;
      margin-bottom: 14px;
    }

    .attendance-inputs,
    .attendance-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .attendance-inputs {
      flex: 1 1 auto;
      justify-content: flex-start;
    }

    .attendance-actions {
      flex: 0 0 auto;
      justify-content: flex-end;
    }

    .date-input {
      width: 158px;
    }

    .session-select {
      width: 150px;
    }

    .group-select {
      width: min(260px, 100%);
      flex: 0 1 260px;
    }

    .attendance-count {
      color: var(--app-muted);
      font-size: 13px;
      white-space: nowrap;
    }

    .attendance-count strong {
      color: var(--app-text);
      font-weight: 700;
    }

    .attendance-table .present-column {
      width: 120px;
      text-align: center;
    }

    .person-search-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 12px;
    }

    .person-search-row .toolbar-input {
      width: min(360px, 100%);
      flex: 0 1 360px;
    }

    .person-search-row .toolbar-count {
      margin-left: auto;
    }

    .attendance-table th.present-column {
      text-align: center;
    }

    .attendance-checkbox {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      accent-color: var(--app-primary);
      cursor: pointer;
    }

    mat-dialog-content {
      max-height: calc(100vh - 134px);
    }

    @media (max-width: 760px) {
      .attendance-toolbar,
      .attendance-inputs,
      .attendance-actions {
        align-items: stretch;
        flex-direction: column;
      }

      .date-input,
      .session-select,
      .group-select,
      .person-search-row,
      .person-search-row .toolbar-input,
      .attendance-actions .toolbar-button {
        width: 100%;
      }

      .person-search-row {
        align-items: stretch;
        flex-direction: column;
      }

      .person-search-row .toolbar-count {
        margin-left: 0;
      }
    }
  `],
  template: `
    <h2 mat-dialog-title>{{ editorTitle() }}</h2>
    <mat-dialog-content>
      <section class="dialog-shell">
        <div class="attendance-toolbar">
          <div class="attendance-inputs">
            <input class="toolbar-control toolbar-input date-input" type="date" [(ngModel)]="attendanceDate" [disabled]="mode() === 'view'">
            <select class="toolbar-control toolbar-select session-select" [(ngModel)]="session" [disabled]="mode() === 'view'">
              <option value="DEFAULT">{{ text('Implicit', 'Default') }}</option>
              <option value="MORNING">{{ text('Dimineața', 'Morning') }}</option>
              <option value="EVENING">{{ text('Seara', 'Evening') }}</option>
            </select>
            <select class="toolbar-control toolbar-select group-select" [(ngModel)]="groupId" [disabled]="mode() === 'view'">
              <option [ngValue]="null">{{ text('Toată biserica', 'Entire church') }}</option>
              @for (group of data.groups; track group.id) {
                <option [ngValue]="group.id">{{ group.name }}</option>
              }
            </select>
            <span class="attendance-count">
              <strong>{{ sheet()?.presentCount || 0 }}</strong>
              {{ text('prezenți', 'present') }}
            </span>
          </div>
          <div class="attendance-actions">
            <button class="toolbar-button toolbar-secondary-button" type="button" (click)="loadSheet()">
              <mat-icon>search</mat-icon>
              {{ text('Deschide', 'Open') }}
            </button>
            @if (mode() === 'view') {
              <button class="toolbar-button toolbar-primary-button" type="button" (click)="switchToEdit()">
                <mat-icon>edit</mat-icon>
                {{ text('Editează', 'Edit') }}
              </button>
            }
          </div>
        </div>

        @if (sheet(); as currentSheet) {
          <div class="person-search-row">
            <input
              class="toolbar-control toolbar-input"
              type="search"
              [placeholder]="text('Caută persoană', 'Search person')"
              [ngModel]="personQuery()"
              (ngModelChange)="personQuery.set($event)">
            <span class="toolbar-count">
              <strong>{{ filteredRows().length }}</strong>
              {{ text('persoane', 'people') }}
            </span>
          </div>
          <div class="table-wrap">
            <table class="data-table attendance-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{{ text('Nume', 'Name') }}</th>
                  <th>{{ text('Tip', 'Type') }}</th>
                  <th>{{ text('Telefon', 'Phone') }}</th>
                  <th class="present-column">{{ text('Prezent', 'Present') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (row of filteredRows(); track row.personId; let index = $index) {
                  <tr>
                    <td>{{ index + 1 }}.</td>
                    <td><span class="primary-text">{{ row.fullName }}</span></td>
                    <td>{{ memberTypeLabel(row.memberType) }}</td>
                    <td>{{ row.phone || '-' }}</td>
                    <td class="present-column">
                      <input class="attendance-checkbox" type="checkbox" [checked]="row.present" [disabled]="mode() === 'view'" (change)="toggle(row.personId, $event)">
                    </td>
                  </tr>
                }
                @if (currentSheet.rows.length > 0 && filteredRows().length === 0) {
                  <tr>
                    <td colspan="5" class="muted">{{ text('Nu există persoane pentru căutarea curentă.', 'No people match the current search.') }}</td>
                  </tr>
                }
                @if (currentSheet.rows.length === 0) {
                  <tr>
                    <td colspan="5" class="muted">{{ text('Nu există persoane pentru selecția curentă.', 'No people are available for the current selection.') }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="empty-state">
            <mat-icon>how_to_reg</mat-icon>
            <span>{{ text('Alege ziua și programul, apoi deschide foaia de prezență.', 'Choose a date and service, then open the attendance sheet.') }}</span>
          </div>
        }
      </section>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="toolbar-button toolbar-secondary-button" type="button" mat-dialog-close>
        {{ mode() === 'view' ? text('Închide', 'Close') : text('Anulează', 'Cancel') }}
      </button>
      @if (mode() !== 'view') {
        <button class="toolbar-button toolbar-primary-button" type="button" [disabled]="!sheet()" (click)="save()">
          <mat-icon>save</mat-icon>
          {{ mode() === 'edit' ? text('Actualizează', 'Update') : text('Salvează', 'Save') }}
        </button>
      }
    </mat-dialog-actions>
  `
})
export class AttendanceEditorDialogComponent implements OnInit {
  private attendanceService = inject(AttendanceService);
  private toast = inject(ToastService);
  language = inject(LanguageService);
  private dialogRef = inject<MatDialogRef<AttendanceEditorDialogComponent, boolean>>(MatDialogRef);
  data = inject<AttendanceEditorDialogData>(MAT_DIALOG_DATA);

  sheet = signal<AttendanceSheet | null>(null);
  mode = signal<'create' | 'view' | 'edit'>(this.data.mode);
  editingSession = signal<{ attendanceDate: string; session: AttendanceSession } | null>(
    this.data.mode === 'edit' || this.data.mode === 'view'
      ? { attendanceDate: this.data.attendanceDate, session: this.data.session }
      : null
  );
  attendanceDate = this.data.attendanceDate;
  session: AttendanceSession = this.data.session;
  groupId: number | null = null;
  personQuery = signal('');

  text(ro: string, en: string): string {
    return this.language.language() === 'en' ? en : ro;
  }

  filteredRows = computed(() => {
    const rows = this.sheet()?.rows || [];
    const query = normalizeSearchText(this.personQuery(), true);
    if (!query) {
      return rows;
    }
    return rows.filter((row) => attendancePersonSearchText(row).includes(query));
  });

  ngOnInit(): void {
    this.loadSheet();
  }

  loadSheet(): void {
    this.attendanceService.sheet(this.attendanceDate, this.session, this.groupId).subscribe({
      next: (sheet) => {
        this.sheet.set(sheet);
        this.personQuery.set('');
      },
      error: (error) => this.toast.error(apiErrorMessage(error, this.text('Nu s-a putut încărca foaia de prezență.', 'Attendance sheet could not be loaded.')))
    });
  }

  save(): void {
    const sheet = this.sheet();
    if (!sheet) {
      return;
    }
    const request = {
      attendanceDate: this.attendanceDate,
      session: this.session,
      groupId: this.groupId,
      personIds: sheet.rows.map((row) => row.personId),
      presentPersonIds: sheet.rows.filter((row) => row.present).map((row) => row.personId)
    };
    const original = this.mode() === 'edit' ? this.editingSession() : null;
    const saveRequest = original
      ? this.attendanceService.update({
          ...request,
          originalAttendanceDate: original.attendanceDate,
          originalSession: original.session
        })
      : this.attendanceService.save(request);

    saveRequest.subscribe({
      next: () => {
        this.toast.success(this.text('Prezența a fost salvată.', 'Attendance was saved.'));
        this.dialogRef.close(true);
      },
      error: (error) => this.toast.error(apiErrorMessage(error, this.text('Nu s-a putut salva prezența.', 'Attendance could not be saved.')))
    });
  }

  toggle(personId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const sheet = this.sheet();
    if (!sheet) {
      return;
    }
    const rows = sheet.rows.map((row) => row.personId === personId
      ? { ...row, present: checked, status: checked ? 'PRESENT' as const : 'ABSENT' as const }
      : row);
    this.sheet.set({
      ...sheet,
      rows,
      presentCount: rows.filter((row) => row.present).length,
      absentCount: rows.filter((row) => !row.present).length
    });
  }

  switchToEdit(): void {
    this.mode.set('edit');
  }

  memberTypeLabel(memberType?: string | null): string {
    const labels: Record<string, string> = {
      MEMBER: this.text('membru', 'member'),
      CHILD: this.text('copil', 'child'),
      ADHERENT: this.text('apartenent', 'adherent'),
      OCCASIONAL_VISITOR: this.text('vizitator ocazional', 'occasional visitor'),
      VISITOR: this.text('vizitator', 'visitor'),
      PASTOR: this.text('pastor', 'pastor'),
      LEADER: this.text('lider', 'leader')
    };
    return memberType ? labels[memberType] || memberType.toLowerCase() : '-';
  }

  editorTitle(): string {
    if (this.mode() === 'view') {
      return this.text('Detalii prezență', 'Attendance details');
    }
    return this.mode() === 'edit' ? this.text('Editează prezență', 'Edit attendance') : this.text('Adaugă prezență', 'Add attendance');
  }
}

function attendancePersonSearchText(row: { fullName: string; phone?: string | null; memberType?: string | null }): string {
  return normalizeSearchText([
    row.fullName,
    row.phone,
    row.memberType
  ].join(' '), true);
}
