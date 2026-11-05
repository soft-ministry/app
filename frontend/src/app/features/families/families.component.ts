import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';

import { apiErrorMessage } from '../../shared/api-error-message';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { PageNavComponent } from '../../shared/page-nav.component';
import { LanguageService } from '../../core/language.service';
import { ToastService } from '../../shared/toast.service';
import { Person } from '../persons/person.model';
import { PersonsService } from '../persons/persons.service';
import { FamiliesService } from './families.service';
import { Family, FamilyMember, FamilyRelationship, FamilyRelationshipType, FamilyRole } from './family.model';

@Component({
  selector: 'app-families',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatIconModule, PageNavComponent, RouterLink],
  styles: [`
    .families-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex: 1 1 auto;
      min-width: 0;
      width: 100%;
    }

    .families-toolbar .toolbar-input {
      flex: 1 1 260px;
      width: min(380px, 100%);
    }

    .families-toolbar button {
      flex: 0 0 auto;
    }

    .families-dashboard {
      display: grid;
      gap: 18px;
    }

    .families-summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }

    .summary-tile {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 64px;
      box-sizing: border-box;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: #ffffff;
      padding: 10px 12px;
    }

    .summary-tile mat-icon {
      width: 22px;
      height: 22px;
      color: var(--app-primary-strong);
      font-size: 22px;
      line-height: 22px;
    }

    .summary-value {
      display: block;
      color: var(--app-text);
      font-size: 19px;
      font-weight: 800;
      line-height: 1;
    }

    .summary-label {
      display: block;
      margin-top: 4px;
      color: var(--app-muted);
      font-size: 12px;
      font-weight: 650;
      line-height: 1.1;
    }

    .families-workspace {
      display: grid;
      grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
      gap: 18px;
      align-items: start;
    }

    .family-list-panel,
    .family-detail-panel {
      min-width: 0;
    }

    .family-list-panel {
      position: sticky;
      top: 16px;
    }

    .family-create-form,
    .family-tool-grid,
    .relationship-builder {
      display: grid;
      gap: 10px;
    }

    .family-create-form {
      grid-template-columns: minmax(0, 1fr) auto;
      margin-bottom: 14px;
    }

    .families-list {
      display: grid;
      gap: 8px;
      max-height: calc(100vh - 330px);
      min-height: 168px;
      overflow: auto;
      padding-right: 2px;
    }

    .family-card {
      display: grid;
      gap: 10px;
      width: 100%;
      min-height: 104px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: #ffffff;
      color: var(--app-text);
      cursor: pointer;
      font: inherit;
      padding: 12px;
      text-align: left;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    }

    .family-card.active,
    .family-card:hover,
    .family-card:focus-visible {
      border-color: var(--app-primary);
      background: var(--app-primary-soft);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      outline: none;
    }

    .family-card-head,
    .family-section-header,
    .member-card-main,
    .relationship-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      min-width: 0;
    }

    .family-card-title,
    .member-name,
    .relationship-title {
      overflow: hidden;
      color: var(--app-text);
      font-weight: 800;
      line-height: 1.2;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .family-card-title {
      font-size: 15px;
    }

    .family-card-count {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      min-height: 24px;
      border-radius: 999px;
      background: #ffffff;
      color: var(--app-primary-strong);
      font-size: 12px;
      font-weight: 800;
      padding: 0 8px;
      white-space: nowrap;
    }

    .family-card-count mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
      line-height: 16px;
    }

    .family-card-members,
    .member-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      min-width: 0;
    }

    .family-chip {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      min-height: 23px;
      border: 1px solid rgba(148, 163, 184, 0.5);
      border-radius: 999px;
      background: #f8fafc;
      color: var(--app-text);
      font-size: 12px;
      font-weight: 700;
      line-height: 1;
      overflow: hidden;
      padding: 0 8px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .family-card-meta,
    .detail-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--app-muted);
      font-size: 12px;
      font-weight: 700;
      min-width: 0;
    }

    .family-card-meta {
      justify-content: space-between;
    }

    .family-section {
      display: grid;
      gap: 14px;
      padding: 16px 20px 20px;
      border-top: 1px solid #edf2f7;
    }

    .family-section:first-child {
      border-top: 0;
    }

    .family-section-header h2 {
      margin: 0;
      font-size: 17px;
      font-weight: 800;
      line-height: 1.2;
    }

    .section-title-group {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    .section-title-group h2 {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .family-tool-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .family-field {
      display: grid;
      gap: 5px;
      min-width: 0;
    }

    .family-field span {
      color: var(--app-text);
      font-size: 12px;
      font-weight: 750;
    }

    .family-input {
      width: 100%;
      min-width: 0;
      min-height: 40px;
      box-sizing: border-box;
      padding: 0 11px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: #ffffff;
      color: var(--app-text);
      font: inherit;
      font-size: 13px;
    }

    .family-input:focus {
      border-color: var(--app-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
      outline: none;
    }

    textarea.family-input {
      min-height: 76px;
      padding-top: 10px;
      resize: vertical;
    }

    .member-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .member-card,
    .relationship-card,
    .empty-inline {
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: #ffffff;
    }

    .member-card {
      display: grid;
      gap: 10px;
      padding: 12px;
    }

    .member-name,
    .relationship-title {
      font-size: 14px;
    }

    .member-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 0 0 auto;
    }

    .primary-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 28px;
      color: var(--app-muted);
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
      user-select: none;
    }

    .primary-toggle input {
      accent-color: var(--app-primary);
    }

    .relationship-list {
      display: grid;
      gap: 8px;
    }

    .relationship-builder {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 150px auto;
      align-items: end;
      padding: 12px;
      border: 1px solid #edf2f7;
      border-radius: 8px;
      background: #f8fafc;
    }

    .relationship-card {
      padding: 12px;
    }

    .relationship-copy {
      min-width: 0;
    }

    .muted-small {
      color: var(--app-muted);
      font-size: 12px;
      font-weight: 650;
      line-height: 1.3;
    }

    .empty-inline {
      display: grid;
      justify-items: center;
      gap: 8px;
      padding: 22px;
      color: var(--app-muted);
      text-align: center;
    }

    .empty-inline mat-icon {
      width: 26px;
      height: 26px;
      color: var(--app-primary-strong);
      font-size: 26px;
      line-height: 26px;
    }

    @media (max-width: 1040px) {
      .families-summary {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .families-workspace {
        grid-template-columns: 1fr;
      }

      .family-list-panel {
        position: static;
      }

      .families-list {
        max-height: none;
      }
    }

    @media (max-width: 760px) {
      .families-toolbar,
      .family-create-form,
      .family-tool-grid,
      .relationship-builder,
      .member-grid {
        grid-template-columns: 1fr;
      }

      .families-toolbar {
        align-items: stretch;
        display: grid;
      }

      .families-toolbar .toolbar-input,
      .families-toolbar button {
        width: 100%;
      }

      .families-summary {
        grid-template-columns: 1fr;
      }

      .family-section-header {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `],
  template: `
    <main class="page">
      <header class="page-header">
        <div class="page-header-main">
          <h1 class="page-title page-title-offset">{{ language.t('page.families') }}</h1>
          <p class="page-subtitle" aria-hidden="true">&nbsp;</p>
        </div>
        <div class="page-header-actions">
          <app-page-nav />
        </div>
      </header>

      <section class="families-dashboard">
        <div class="families-summary" aria-label="Rezumat familii">
          <div class="summary-tile">
            <mat-icon>family_restroom</mat-icon>
            <span>
              <span class="summary-value">{{ families().length }}</span>
              <span class="summary-label">familii</span>
            </span>
          </div>
          <div class="summary-tile">
            <mat-icon>groups</mat-icon>
            <span>
              <span class="summary-value">{{ totalMembers() }}</span>
              <span class="summary-label">membri în familii</span>
            </span>
          </div>
          <div class="summary-tile">
            <mat-icon>hub</mat-icon>
            <span>
              <span class="summary-value">{{ totalRelationships() }}</span>
              <span class="summary-label">relații definite</span>
            </span>
          </div>
          <div class="summary-tile">
            <mat-icon>person_search</mat-icon>
            <span>
              <span class="summary-value">{{ unassignedPeopleCount() }}</span>
              <span class="summary-label">persoane nealocate</span>
            </span>
          </div>
        </div>

        <section class="surface table-surface">
          <div class="surface-header table-surface-header">
            <div class="families-toolbar">
              <input
                class="toolbar-control toolbar-input"
                type="search"
                name="familySearch"
                placeholder="Caută familie sau membru"
                [(ngModel)]="familyQuery"
                aria-label="Caută familie sau membru">

              <button class="toolbar-button toolbar-secondary-button" type="button" routerLink="/families/report">
                <mat-icon>summarize</mat-icon>
                Raport
              </button>
            </div>
          </div>

          <div class="families-workspace">
            <aside class="surface family-list-panel">
              <div class="family-section">
                <div class="family-section-header">
                  <h2>Lista familiilor</h2>
                  <span class="muted-small">{{ filteredFamilies().length }} afișate</span>
                </div>

                <form class="family-create-form" (ngSubmit)="createFamily()">
                  <label class="family-field">
                    <span>Familie nouă</span>
                    <input
                      class="family-input"
                      name="familyName"
                      placeholder="ex. Popescu"
                      [(ngModel)]="newFamilyName"
                      required>
                  </label>
                  <button class="toolbar-button toolbar-primary-button" type="submit" [disabled]="!newFamilyName.trim()">
                    <mat-icon>add</mat-icon>
                    Creează
                  </button>
                </form>

                <div class="families-list">
                  @for (family of filteredFamilies(); track family.id) {
                    <button class="family-card" type="button" [class.active]="selectedFamilyId() === family.id" (click)="selectFamily(family.id)">
                      <span class="family-card-head">
                        <span class="family-card-title">{{ family.name }}</span>
                        <span class="family-card-count">
                          <mat-icon>groups</mat-icon>
                          {{ family.members.length }}
                        </span>
                      </span>
                      <span class="family-card-members">
                        @for (member of previewMembers(family); track member.id) {
                          <span class="family-chip">{{ memberName(member) }}</span>
                        }
                        @if (family.members.length > 3) {
                          <span class="family-chip">+{{ family.members.length - 3 }}</span>
                        }
                        @if (family.members.length === 0) {
                          <span class="muted-small">Fără membri încă</span>
                        }
                      </span>
                      <span class="family-card-meta">
                        <span>{{ family.relationships.length }} relații</span>
                        <span>{{ family.notes ? 'are note' : 'fără note' }}</span>
                      </span>
                    </button>
                  } @empty {
                    <div class="empty-inline">
                      <mat-icon>search_off</mat-icon>
                      <span>Nu există familii pentru filtrul curent.</span>
                    </div>
                  }
                </div>
              </div>
            </aside>

            <section class="surface family-detail-panel">
              @if (selectedFamily(); as family) {
                <div class="family-section">
                  <div class="family-section-header">
                    <div class="section-title-group">
                      <h2>{{ family.name }}</h2>
                      <div class="detail-meta">
                        <span>{{ family.members.length }} membri</span>
                        <span>{{ family.relationships.length }} relații</span>
                      </div>
                    </div>
                    <button class="toolbar-button toolbar-danger-button" type="button" (click)="deleteFamily(family)">
                      <mat-icon>delete</mat-icon>
                      Șterge
                    </button>
                  </div>

                  <div class="family-tool-grid">
                    <label class="family-field">
                      <span>Nume familie</span>
                      <input class="family-input" name="editFamilyName" [(ngModel)]="editFamilyName">
                    </label>
                    <label class="family-field">
                      <span>Note</span>
                      <textarea class="family-input" name="editFamilyNotes" [(ngModel)]="editFamilyNotes"></textarea>
                    </label>
                  </div>

                  <div class="family-section-header">
                    <span class="muted-small">Editează numele și notele, apoi salvează modificările.</span>
                    <button class="toolbar-button toolbar-secondary-button" type="button" [disabled]="!canSaveFamily()" (click)="saveFamily(family)">
                      <mat-icon>save</mat-icon>
                      Salvează
                    </button>
                  </div>
                </div>

                <div class="family-section">
                  <div class="family-section-header">
                    <div class="section-title-group">
                      <h2>Membri</h2>
                      <span class="muted-small">Adaugă persoanele din aceeași gospodărie și setează rolul fiecăreia.</span>
                    </div>
                  </div>

                  <form class="family-tool-grid" (ngSubmit)="addMember(family)">
                    <label class="family-field">
                      <span>Persoană</span>
                      <select class="family-input" name="personId" [(ngModel)]="newMemberPersonId" required>
                        <option [ngValue]="null">Alege persoana</option>
                        @for (person of availablePersons(family); track person.id) {
                          <option [ngValue]="person.id">{{ personName(person) }}</option>
                        }
                      </select>
                    </label>
                    <label class="family-field">
                      <span>Rol în familie</span>
                      <select class="family-input" name="role" [(ngModel)]="newMemberRole">
                        @for (role of roles; track role) {
                          <option [ngValue]="role">{{ roleLabel(role) }}</option>
                        }
                      </select>
                    </label>
                    <button class="toolbar-button toolbar-primary-button" type="submit" [disabled]="!newMemberPersonId">
                      <mat-icon>person_add</mat-icon>
                      Adaugă
                    </button>
                  </form>

                  <div class="member-grid">
                    @for (member of sortedMembers(family); track member.id) {
                      <article class="member-card">
                        <div class="member-card-main">
                          <span class="member-name">{{ memberName(member) }}</span>
                          <div class="member-actions">
                            <label class="primary-toggle" [title]="member.primaryMember ? 'Persoană principală' : 'Marchează ca persoană principală'">
                              <input
                                type="checkbox"
                                [checked]="member.primaryMember"
                                (change)="togglePrimaryMember(family, member, $any($event.target).checked)">
                              Principal
                            </label>
                            <button class="table-icon-button danger-table-action" type="button" aria-label="Șterge membru" (click)="removeMember(family, member)">
                              <mat-icon>delete</mat-icon>
                            </button>
                          </div>
                        </div>
                        <label class="family-field">
                          <span>Rol</span>
                          <select class="family-input" [ngModel]="member.role" (ngModelChange)="changeMemberRole(family, member, $event)" [ngModelOptions]="{ standalone: true }">
                            @for (role of roles; track role) {
                              <option [ngValue]="role">{{ roleLabel(role) }}</option>
                            }
                          </select>
                        </label>
                      </article>
                    } @empty {
                      <div class="empty-inline">
                        <mat-icon>group_add</mat-icon>
                        <span>Adaugă primul membru ca să poți construi familia.</span>
                      </div>
                    }
                  </div>
                </div>

                <div class="family-section">
                  <div class="family-section-header">
                    <div class="section-title-group">
                      <h2>Relații</h2>
                      <span class="muted-small">Definește legăturile importante dintre membrii familiei.</span>
                    </div>
                  </div>

                  <form class="relationship-builder" (ngSubmit)="addRelationship(family)">
                    <label class="family-field">
                      <span>Persoana 1</span>
                      <select class="family-input" name="relationshipPersonA" [(ngModel)]="newRelationshipPersonAId" [disabled]="family.members.length < 2">
                        <option [ngValue]="null">Alege</option>
                        @for (member of sortedMembers(family); track member.id) {
                          <option [ngValue]="member.personId">{{ memberName(member) }}</option>
                        }
                      </select>
                    </label>
                    <label class="family-field">
                      <span>Persoana 2</span>
                      <select class="family-input" name="relationshipPersonB" [(ngModel)]="newRelationshipPersonBId" [disabled]="family.members.length < 2">
                        <option [ngValue]="null">Alege</option>
                        @for (member of sortedMembers(family); track member.id) {
                          <option [ngValue]="member.personId">{{ memberName(member) }}</option>
                        }
                      </select>
                    </label>
                    <label class="family-field">
                      <span>Tip</span>
                      <select class="family-input" name="relationshipType" [(ngModel)]="newRelationshipType" [disabled]="family.members.length < 2">
                        @for (type of relationshipTypes; track type) {
                          <option [ngValue]="type">{{ relationshipTypeLabel(type) }}</option>
                        }
                      </select>
                    </label>
                    <button class="toolbar-button toolbar-secondary-button" type="submit" [disabled]="!canAddRelationship()">
                      <mat-icon>add_link</mat-icon>
                      Leagă
                    </button>
                  </form>

                  <div class="relationship-list">
                    @for (relationship of family.relationships; track relationship.id) {
                      <article class="relationship-card">
                        <div class="relationship-copy">
                          <strong class="relationship-title">{{ relationshipLabel(relationship) }}</strong>
                          <div class="muted-small">{{ relationshipTypeDescription(relationship.type) }}</div>
                        </div>
                        <button class="table-icon-button danger-table-action" type="button" aria-label="Șterge relația" (click)="deleteRelationship(family, relationship)">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </article>
                    } @empty {
                      <div class="empty-inline">
                        <mat-icon>hub</mat-icon>
                        <span>Nu există relații definite pentru această familie.</span>
                      </div>
                    }
                  </div>
                </div>
              } @else {
                <div class="empty-state">
                  <mat-icon>family_restroom</mat-icon>
                  <span>Selectează sau creează o familie.</span>
                </div>
              }
            </section>
          </div>
        </section>
      </section>
    </main>
  `
})
export class FamiliesComponent implements OnInit {
  language = inject(LanguageService);
  private familiesService = inject(FamiliesService);
  private personsService = inject(PersonsService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  families = signal<Family[]>([]);
  persons = signal<Person[]>([]);
  selectedFamilyId = signal<number | null>(null);
  selectedFamily = computed(() => this.families().find((family) => family.id === this.selectedFamilyId()) || null);
  filteredFamilies = computed(() => {
    const query = this.normalize(this.familyQuery);
    if (!query) {
      return this.families();
    }
    return this.families().filter((family) => {
      const searchable = [
        family.name,
        family.notes || '',
        ...family.members.map((member) => this.memberName(member))
      ].join(' ');
      return this.normalize(searchable).includes(query);
    });
  });
  totalMembers = computed(() => this.families().reduce((total, family) => total + family.members.length, 0));
  totalRelationships = computed(() => this.families().reduce((total, family) => total + family.relationships.length, 0));
  unassignedPeopleCount = computed(() => {
    const assigned = new Set(this.families().flatMap((family) => family.members.map((member) => member.personId)));
    return this.persons().filter((person) => !assigned.has(person.id)).length;
  });

  roles: FamilyRole[] = ['HUSBAND', 'WIFE', 'PARENT', 'CHILD', 'WIDOWED', 'OTHER'];
  relationshipTypes: FamilyRelationshipType[] = ['SPOUSE', 'PARENT_CHILD'];
  familyQuery = '';
  newFamilyName = '';
  editFamilyName = '';
  editFamilyNotes = '';
  newMemberPersonId: number | null = null;
  newMemberRole: FamilyRole = 'OTHER';
  newRelationshipPersonAId: number | null = null;
  newRelationshipPersonBId: number | null = null;
  newRelationshipType: FamilyRelationshipType = 'PARENT_CHILD';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    forkJoin({
      families: this.familiesService.list(),
      persons: this.personsService.list()
    }).subscribe({
      next: ({ families, persons }) => {
        this.families.set(families);
        this.persons.set(persons);
        if (!this.selectedFamilyId() && families.length) {
          this.selectFamily(families[0].id);
        } else {
          this.syncSelectedFamily();
        }
      },
      error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-au putut încărca familiile.'))
    });
  }

  selectFamily(id: number): void {
    const family = this.families().find((item) => item.id === id);
    this.selectedFamilyId.set(id);
    this.editFamilyName = family?.name || '';
    this.editFamilyNotes = family?.notes || '';
    this.resetForms();
  }

  createFamily(): void {
    const name = this.newFamilyName.trim();
    if (!name) {
      return;
    }
    this.familiesService.create({ name }).subscribe({
      next: (family) => {
        this.families.set([...this.families(), family]);
        this.newFamilyName = '';
        this.selectFamily(family.id);
        this.toast.success('Familia a fost creată.');
      },
      error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-a putut crea familia.'))
    });
  }

  canSaveFamily(): boolean {
    const family = this.selectedFamily();
    if (!family) {
      return false;
    }
    const name = this.editFamilyName.trim();
    const notes = this.editFamilyNotes.trim();
    return !!name && (name !== family.name || notes !== (family.notes || ''));
  }

  saveFamily(family: Family): void {
    const name = this.editFamilyName.trim();
    if (!name) {
      return;
    }
    this.familiesService.update(family.id, { name, notes: this.editFamilyNotes.trim() || null }).subscribe({
      next: (updated) => {
        this.replaceFamily(updated);
        this.toast.success('Familia a fost salvată.');
      },
      error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-a putut salva familia.'))
    });
  }

  deleteFamily(family: Family): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '390px',
      data: {
        title: 'Șterge familia',
        message: `Ștergi familia ${family.name}? Membrii rămân în lista de persoane.`,
        confirmLabel: 'Șterge',
        cancelLabel: 'Anulează'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.familiesService.delete(family.id).subscribe({
        next: () => {
          this.families.set(this.families().filter((item) => item.id !== family.id));
          this.selectedFamilyId.set(this.families()[0]?.id || null);
          this.syncSelectedFamily();
          this.toast.success('Familia a fost ștearsă.');
        },
        error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-a putut șterge familia.'))
      });
    });
  }

  addMember(family: Family): void {
    if (!this.newMemberPersonId) {
      return;
    }
    const personId = this.newMemberPersonId;
    const role = this.newMemberRole;
    const primaryMember = family.members.length === 0;
    this.familiesService.addMember(family.id, {
      personId,
      role,
      primaryMember
    }).pipe(
      switchMap((updated) => this.autoAddRelationshipForMember(updated, personId, role))
    ).subscribe({
      next: (updated) => {
        this.replaceFamily(updated);
        this.newMemberPersonId = null;
        this.newMemberRole = 'OTHER';
        this.toast.success('Membrul a fost adăugat.');
      },
      error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-a putut adăuga membrul.'))
    });
  }

  changeMemberRole(family: Family, member: FamilyMember, role: FamilyRole): void {
    this.familiesService.updateMember(family.id, member.id, {
      personId: member.personId,
      role,
      primaryMember: member.primaryMember
    }).subscribe({
      next: (updated) => this.replaceFamily(updated),
      error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-a putut actualiza rolul.'))
    });
  }

  togglePrimaryMember(family: Family, member: FamilyMember, primaryMember: boolean): void {
    this.familiesService.updateMember(family.id, member.id, {
      personId: member.personId,
      role: member.role,
      primaryMember
    }).subscribe({
      next: (updated) => this.replaceFamily(updated),
      error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-a putut actualiza persoana principală.'))
    });
  }

  removeMember(family: Family, member: FamilyMember): void {
    this.familiesService.removeMember(family.id, member.id).subscribe({
      next: (updated) => {
        this.replaceFamily(updated);
        this.toast.success('Membrul a fost șters din familie.');
      },
      error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-a putut șterge membrul.'))
    });
  }

  canAddRelationship(): boolean {
    return !!this.newRelationshipPersonAId
      && !!this.newRelationshipPersonBId
      && this.newRelationshipPersonAId !== this.newRelationshipPersonBId;
  }

  addRelationship(family: Family): void {
    if (!this.canAddRelationship() || !this.newRelationshipPersonAId || !this.newRelationshipPersonBId) {
      return;
    }

    const personAId = this.newRelationshipPersonAId;
    const personBId = this.newRelationshipPersonBId;
    const type = this.newRelationshipType;
    const exists = family.relationships.some((relationship) => this.sameRelationship(relationship, personAId, personBId, type));
    if (exists) {
      this.toast.error('Relația există deja.');
      return;
    }

    this.familiesService.addRelationship(family.id, { personAId, personBId, type }).subscribe({
      next: (updated) => {
        this.replaceFamily(updated);
        this.resetRelationshipForm();
        this.toast.success('Relația a fost adăugată.');
      },
      error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-a putut adăuga relația.'))
    });
  }

  deleteRelationship(family: Family, relationship: FamilyRelationship): void {
    this.familiesService.deleteRelationship(family.id, relationship.id).subscribe({
      next: (updated) => {
        this.replaceFamily(updated);
        this.toast.success('Relația a fost ștearsă.');
      },
      error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-a putut șterge relația.'))
    });
  }

  availablePersons(family: Family): Person[] {
    const used = new Set(family.members.map((member) => member.personId));
    return this.persons()
      .filter((person) => !used.has(person.id))
      .sort((a, b) => this.personName(a).localeCompare(this.personName(b), 'ro'));
  }

  previewMembers(family: Family): FamilyMember[] {
    return this.sortedMembers(family).slice(0, 3);
  }

  sortedMembers(family: Family): FamilyMember[] {
    const roleOrder: Record<FamilyRole, number> = {
      HUSBAND: 1,
      WIFE: 2,
      PARENT: 3,
      CHILD: 4,
      WIDOWED: 5,
      OTHER: 6
    };
    return [...family.members].sort((a, b) => {
      if (a.primaryMember !== b.primaryMember) {
        return a.primaryMember ? -1 : 1;
      }
      return roleOrder[a.role] - roleOrder[b.role] || this.memberName(a).localeCompare(this.memberName(b), 'ro');
    });
  }

  personName(person: Person): string {
    return [person.lastName, person.firstName].filter(Boolean).join(' ') || person.fullName;
  }

  memberName(member: FamilyMember): string {
    return [member.lastName, member.firstName].filter(Boolean).join(' ') || member.fullName;
  }

  roleLabel(role: FamilyRole): string {
    const labels: Record<FamilyRole, string> = {
      HUSBAND: 'soț',
      WIFE: 'soție',
      PARENT: 'părinte',
      CHILD: 'copil',
      WIDOWED: 'văduv(ă)',
      OTHER: 'alt rol'
    };
    return labels[role];
  }

  relationshipTypeLabel(type: FamilyRelationshipType): string {
    const labels: Record<FamilyRelationshipType, string> = {
      SPOUSE: 'soți',
      PARENT_CHILD: 'părinte - copil'
    };
    return labels[type];
  }

  relationshipTypeDescription(type: FamilyRelationshipType): string {
    return type === 'SPOUSE' ? 'relație simetrică' : 'direcție părinte - copil';
  }

  relationshipLabel(relationship: FamilyRelationship): string {
    if (relationship.type === 'SPOUSE') {
      return `${relationship.personAName} ↔ ${relationship.personBName}`;
    }
    return `${relationship.personAName} → ${relationship.personBName}`;
  }

  private replaceFamily(updated: Family): void {
    this.families.set(this.families().map((family) => family.id === updated.id ? updated : family));
    this.selectFamily(updated.id);
  }

  private syncSelectedFamily(): void {
    const family = this.selectedFamily();
    this.editFamilyName = family?.name || '';
    this.editFamilyNotes = family?.notes || '';
  }

  private resetForms(): void {
    this.newMemberPersonId = null;
    this.newMemberRole = 'OTHER';
    this.resetRelationshipForm();
  }

  private resetRelationshipForm(): void {
    this.newRelationshipPersonAId = null;
    this.newRelationshipPersonBId = null;
    this.newRelationshipType = 'PARENT_CHILD';
  }

  private autoAddRelationshipForMember(family: Family, personId: number, role: FamilyRole) {
    if (role !== 'CHILD') {
      return of(family);
    }
    const parent = this.familyHead(family, personId);
    if (!parent) {
      return of(family);
    }
    const exists = family.relationships.some((relationship) =>
      relationship.type === 'PARENT_CHILD'
      && relationship.personAId === parent.personId
      && relationship.personBId === personId);
    if (exists) {
      return of(family);
    }
    return this.familiesService.addRelationship(family.id, {
      personAId: parent.personId,
      personBId: personId,
      type: 'PARENT_CHILD'
    });
  }

  private familyHead(family: Family, excludePersonId: number): FamilyMember | null {
    const candidates = family.members.filter((member) => member.personId !== excludePersonId);
    return candidates.find((member) => member.primaryMember)
      || candidates.find((member) => member.role === 'PARENT')
      || candidates.find((member) => member.role === 'HUSBAND')
      || candidates.find((member) => member.role === 'WIFE')
      || candidates[0]
      || null;
  }

  private sameRelationship(
    relationship: FamilyRelationship,
    personAId: number,
    personBId: number,
    type: FamilyRelationshipType
  ): boolean {
    if (relationship.type !== type) {
      return false;
    }
    if (type === 'SPOUSE') {
      return (relationship.personAId === personAId && relationship.personBId === personBId)
        || (relationship.personAId === personBId && relationship.personBId === personAId);
    }
    return relationship.personAId === personAId && relationship.personBId === personBId;
  }

  private normalize(value: string): string {
    return value
      .toLocaleLowerCase('ro')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
