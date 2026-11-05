import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { EventAttachmentsComponent } from './attachments/event-attachments.component';
import { LanguageService } from '../../core/language.service';
import { EventItem, EventRequest, EventStatus, EventType, Priority } from './event.model';
import { groupTypeLabel } from '../../shared/display-labels';
import { Group } from '../groups/group.model';
import { GroupsService } from '../groups/groups.service';
import { Person } from '../persons/person.model';
import { PersonsService } from '../persons/persons.service';

export interface EventFormDialogData {
  event?: EventItem | null;
  openDate?: string | null;
  readonly?: boolean;
}

@Component({
  selector: 'app-event-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    EventAttachmentsComponent
  ],
  styles: [`
    .dialog-form {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      width: min(860px, 100%);
      max-width: 100%;
      box-sizing: border-box;
      padding-top: 4px;
    }

    .field-full {
      grid-column: 1 / -1;
    }

    .field-wide {
      grid-column: span 2;
    }

    mat-dialog-content,
    mat-form-field {
      max-width: 100%;
      box-sizing: border-box;
    }

    mat-dialog-content {
      max-height: calc(100vh - 132px);
    }

    :host ::ng-deep .dialog-form .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    :host ::ng-deep .dialog-form .mat-mdc-text-field-wrapper {
      min-height: 44px;
    }

    :host ::ng-deep .dialog-form .mat-mdc-form-field-infix {
      min-height: 44px;
      padding-top: 11px;
      padding-bottom: 9px;
    }

    :host ::ng-deep .dialog-form textarea.mat-mdc-input-element {
      min-height: 54px;
      resize: vertical;
    }

    :host ::ng-deep .dialog-form .mat-mdc-select {
      line-height: 22px;
    }

    :host ::ng-deep .mat-mdc-dialog-title {
      margin-bottom: 2px;
    }

    :host ::ng-deep .mat-mdc-dialog-actions {
      min-height: 48px;
      padding-top: 6px;
      padding-bottom: 8px;
    }

    @media (max-width: 620px) {
      .dialog-form {
        grid-template-columns: 1fr;
      }

      .field-full,
      .field-wide {
        grid-column: auto;
      }
    }
  `],
  template: `
    <h2 mat-dialog-title>{{ data.readonly ? text('Detalii eveniment', 'Event details') : data.event ? text('Editează evenimentul', 'Edit event') : text('Eveniment nou', 'New event') }}</h2>
    <mat-dialog-content>
      <form class="dialog-form" [formGroup]="form" id="event-form" (ngSubmit)="submit()">
        <mat-form-field class="field-wide" appearance="outline">
          <mat-label>{{ text('Nume', 'Name') }}</mat-label>
          <input matInput formControlName="eventName">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ text('Status', 'Status') }}</mat-label>
          <mat-select formControlName="status">
            <mat-option value="PLANNED">{{ text('Planificat', 'Planned') }}</mat-option>
            <mat-option value="ACTIVE">{{ text('Activ', 'Active') }}</mat-option>
            <mat-option value="DONE">{{ text('Finalizat', 'Completed') }}</mat-option>
            <mat-option value="CANCELED">{{ text('Anulat', 'Canceled') }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ text('Prioritate', 'Priority') }}</mat-label>
          <mat-select formControlName="priority">
            <mat-option value="LOW">{{ text('Scăzută', 'Low') }}</mat-option>
            <mat-option value="MEDIUM_LOW">{{ text('Normală', 'Normal') }}</mat-option>
            <mat-option value="MEDIUM">{{ text('Ridicată', 'High') }}</mat-option>
            <mat-option value="HIGH_MEDIUM">{{ text('Foarte ridicată', 'Very high') }}</mat-option>
            <mat-option value="HIGH">{{ text('Urgentă', 'Urgent') }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ text('Data început', 'Start date') }}</mat-label>
          <input matInput type="date" formControlName="openDate">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ text('Data final', 'End date') }}</mat-label>
          <input matInput type="date" formControlName="endDate">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ text('Ora', 'Time') }}</mat-label>
          <input matInput type="time" formControlName="eventTime">
        </mat-form-field>

        <mat-form-field class="field-wide" appearance="outline">
          <mat-label>{{ text('Responsabili', 'Responsible people') }}</mat-label>
          <mat-select formControlName="responsibleIds" multiple>
            @for (person of people(); track person.id) {
              <mat-option [value]="person.id">{{ person.fullName }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field class="field-wide" appearance="outline">
          <mat-label>{{ text('Grup / slujire', 'Group / ministry') }}</mat-label>
          <mat-select formControlName="groupId">
            <mat-option [value]="null">{{ text('Fără grup', 'No group') }}</mat-option>
            @for (group of groups(); track group.id) {
              <mat-option [value]="group.id">{{ group.name }} · {{ groupTypeLabel(group.type) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field class="field-wide" appearance="outline">
          <mat-label>{{ text('Tip', 'Type') }}</mat-label>
          <mat-select formControlName="eventType">
            <mat-option value="SERVICE">{{ text('Părtășie', 'Fellowship') }}</mat-option>
            <mat-option value="MEETING">{{ text('Catch up', 'Catch-up') }}</mat-option>
            <mat-option value="EVENT">{{ text('Eveniment', 'Event') }}</mat-option>
            <mat-option value="STUDY">{{ text('Studiu', 'Study') }}</mat-option>
            <mat-option value="ADMINISTRATION">{{ text('Administrare', 'Administration') }}</mat-option>
            <mat-option value="MAINTENANCE">{{ text('Întreținere', 'Maintenance') }}</mat-option>
            <mat-option value="SOCIAL_MEDIA_PUBLISHING">{{ text('Publicare rețele sociale', 'Social media publishing') }}</mat-option>
            <mat-option value="RENOVATION">{{ text('Renovare', 'Renovation') }}</mat-option>
            <mat-option value="ACT_DE_CULT">{{ text('Act de cult', 'Worship service') }}</mat-option>
            <mat-option value="EVANGELISM">{{ text('Evanghelizare', 'Evangelism') }}</mat-option>
            <mat-option value="FUNERAL">{{ text('Înmormântare', 'Funeral') }}</mat-option>
            <mat-option value="IT">IT</mat-option>
            <mat-option value="MUSIC">{{ text('Muzică', 'Music') }}</mat-option>
            <mat-option value="OTHER">{{ text('Alt tip', 'Other type') }}</mat-option>
          </mat-select>
        </mat-form-field>

        @if (form.controls.eventType.value === 'MEETING') {
          <mat-form-field class="field-wide" appearance="outline">
          <mat-label>{{ text('Persoane contactate', 'Contacted people') }}</mat-label>
            <mat-select formControlName="contactedPersonIds" multiple>
              @for (person of people(); track person.id) {
                <mat-option [value]="person.id">{{ person.fullName }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        <mat-form-field class="field-full" appearance="outline">
          <mat-label>{{ text('Descriere publică', 'Public description') }}</mat-label>
          <textarea matInput formControlName="publicAbout" rows="2"></textarea>
        </mat-form-field>

        <mat-form-field class="field-full" appearance="outline">
          <mat-label>{{ text('Comentariul meu privat', 'My private comment') }}</mat-label>
          <textarea matInput formControlName="privateAbout" rows="2"></textarea>
          <mat-hint>{{ text('Vizibil doar pentru userul tău. În calendar se adaugă după descrierea publică.', 'Visible only to your user. It is appended after the public description in the calendar.') }}</mat-hint>
        </mat-form-field>

        @if (data.event?.id) {
          <div class="field-full">
            <app-event-attachments [eventId]="data.event!.id" [readonly]="!!data.readonly" />
          </div>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="toolbar-button toolbar-secondary-button" type="button" mat-dialog-close>{{ data.readonly ? text('Închide', 'Close') : text('Anulează', 'Cancel') }}</button>
      @if (!data.readonly) {
        <button class="toolbar-button toolbar-primary-button" type="submit" form="event-form" [disabled]="form.invalid">
          <mat-icon>{{ data.event ? 'save' : 'add' }}</mat-icon>
          {{ data.event ? text('Salvează', 'Save') : text('Adaugă', 'Add') }}
        </button>
      }
    </mat-dialog-actions>
  `
})
export class EventFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private personsService = inject(PersonsService);
  private groupsService = inject(GroupsService);
  private readonly language = inject(LanguageService);
  data = inject<EventFormDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject<MatDialogRef<EventFormDialogComponent, EventRequest>>(MatDialogRef);
  people = signal<Person[]>([]);
  groups = signal<Group[]>([]);
  groupTypeLabel = groupTypeLabel;

  text(ro: string, en: string): string {
    return this.language.language() === 'en' ? en : ro;
  }

  form = this.fb.nonNullable.group({
    eventName: [this.data.event?.eventName || '', Validators.required],
    publicAbout: [this.data.event?.publicAbout || ''],
    privateAbout: [this.data.event?.privateAbout || ''],
    openDate: [this.data.event?.openDate || this.data.openDate || '', Validators.required],
    endDate: [this.data.event?.endDate || this.data.openDate || ''],
    eventTime: [formatTimeForInput(this.data.event?.eventTime)],
    status: [this.data.event?.status || 'PLANNED' as EventStatus, Validators.required],
    eventType: [this.data.event?.eventType || 'OTHER' as EventType, Validators.required],
    priority: [this.data.event?.priority || 'MEDIUM' as Priority, Validators.required],
    groupId: [this.data.event?.groupId ?? null],
    contactedPersonIds: [initialContactedPersonIds(this.data.event)],
    responsibleIds: [initialResponsibleIds(this.data.event)]
  });

  constructor() {
    if (this.data.readonly) {
      this.form.disable();
    }
  }

  ngOnInit(): void {
    this.personsService.list().subscribe((people) => {
      this.people.set(people);
    });
    this.groupsService.list().subscribe((groups) => {
      this.groups.set(groups);
    });
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    const raw = this.form.getRawValue();
    const eventName = raw.eventName.trim();
    if (!eventName) {
      this.form.controls.eventName.setErrors({ required: true });
      return;
    }
    this.dialogRef.close({
      eventName,
      about: raw.publicAbout.trim() || null,
      publicAbout: raw.publicAbout.trim() || null,
      privateAbout: raw.privateAbout.trim() || null,
      aboutPrivate: false,
      openDate: raw.openDate || null,
      endDate: raw.endDate || null,
      eventTime: raw.eventTime || null,
      status: raw.status,
      eventType: raw.eventType,
      priority: raw.priority,
      recurrenceType: 'NONE',
      groupId: raw.groupId || null,
      implementedById: raw.responsibleIds[0] || null,
      contactedPersonId: raw.eventType === 'MEETING' ? raw.contactedPersonIds[0] || null : null,
      contactedPersonIds: raw.eventType === 'MEETING' ? raw.contactedPersonIds : [],
      responsibleIds: raw.responsibleIds
    });
  }
}

function formatTimeForInput(time?: string | null): string {
  return time ? time.slice(0, 5) : '';
}

function initialResponsibleIds(event?: EventItem | null): number[] {
  if (event?.responsibleIds?.length) {
    return event.responsibleIds;
  }
  return event?.implementedById ? [event.implementedById] : [];
}

function initialContactedPersonIds(event?: EventItem | null): number[] {
  if (event?.contactedPersonIds?.length) {
    return event.contactedPersonIds;
  }
  return event?.contactedPersonId ? [event.contactedPersonId] : [];
}
