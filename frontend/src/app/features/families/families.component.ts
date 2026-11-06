import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
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
import { Family, FamilyMember, FamilyRelationship, FamilyRelationshipRequest, FamilyRelationshipType, FamilyRole } from './family.model';

@Component({
  selector: 'app-families',
  standalone: true,
  imports: [CdkDrag, CdkDropList, CdkDropListGroup, FormsModule, MatDialogModule, MatIconModule, PageNavComponent, RouterLink],
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

    .family-selector {
      flex: 1 1 240px;
      width: min(300px, 100%);
    }

    .family-create-inline {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1 1 280px;
      min-width: 0;
    }

    .family-create-inline .family-input {
      min-width: 0;
      flex: 1 1 auto;
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
      grid-template-columns: minmax(0, 1fr);
    }

    .family-detail-panel {
      min-width: 0;
    }

    .family-create-form,
    .family-tool-grid,
    .relationship-builder {
      display: grid;
      gap: 10px;
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

    .family-tree-editor {
      display: grid;
      gap: 12px;
      padding: 14px 20px 18px;
      border-top: 1px solid #edf2f7;
      background: #f8fafc;
    }

    .family-tree-workspace {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 220px;
      gap: 14px;
      align-items: start;
    }

    .family-tree-canvas {
      display: grid;
      gap: 8px;
      min-width: 0;
      padding: 12px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: #ffffff;
    }

    .tree-level {
      display: flex;
      justify-content: center;
      gap: 8px;
      min-width: 0;
      flex-wrap: wrap;
    }

    .tree-grandparents-level {
      align-items: start;
      gap: 18px;
    }

    .tree-grandparent-group {
      display: grid;
      gap: 5px;
    }

    .tree-family-side-label {
      color: var(--app-muted);
      font-size: 10px;
      font-weight: 750;
      text-align: center;
    }

    .tree-level-label {
      color: var(--app-muted);
      font-size: 11px;
      font-weight: 800;
      text-align: center;
      text-transform: uppercase;
    }

    .tree-connector {
      width: 1px;
      height: 10px;
      margin: 0 auto;
      background: var(--app-border);
    }

    .tree-slot {
      display: grid;
      align-content: center;
      justify-items: center;
      gap: 4px;
      width: 145px;
      min-height: 62px;
      box-sizing: border-box;
      border: 1px dashed #94a3b8;
      border-radius: 8px;
      background: #f8fafc;
      color: var(--app-muted);
      text-align: center;
      transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
    }

    .tree-slot.cdk-drop-list-receiving,
    .tree-slot.cdk-drop-list-dragging {
      border-color: var(--app-primary);
      background: var(--app-primary-soft);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, .1);
    }

    .tree-person-card {
      display: grid;
      align-content: center;
      justify-items: center;
      gap: 3px;
      width: 100%;
      min-height: 60px;
      box-sizing: border-box;
      padding: 7px;
      border-radius: 7px;
      background: #ffffff;
      color: var(--app-text);
      cursor: grab;
    }

    .tree-person-card.current {
      background: var(--app-primary-soft);
      color: var(--app-primary-strong);
    }

    .tree-person-card:active {
      cursor: grabbing;
    }

    .tree-person-name {
      overflow: hidden;
      max-width: 100%;
      font-size: 12px;
      font-weight: 800;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tree-person-meta {
      color: var(--app-muted);
      font-size: 10px;
    }

    .tree-person-picker {
      display: grid;
      gap: 8px;
      min-width: 0;
      padding: 10px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: #ffffff;
    }

    .tree-person-list {
      display: grid;
      gap: 5px;
      max-height: 300px;
      overflow: auto;
      padding: 2px;
    }

    .tree-person-option {
      display: grid;
      gap: 2px;
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #edf2f7;
      border-radius: 7px;
      background: #ffffff;
      color: var(--app-text);
      cursor: grab;
      padding: 7px;
      text-align: left;
    }

    .tree-person-option:hover {
      border-color: var(--app-primary);
      background: var(--app-primary-soft);
    }

    .tree-expand-button {
      justify-self: center;
      border: 0;
      background: transparent;
      color: var(--app-primary-strong);
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      font-weight: 750;
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

    }

    @media (max-width: 760px) {
      .families-toolbar,
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
      .families-toolbar .family-selector,
      .family-create-inline,
      .families-toolbar button {
        width: 100%;
      }

      .families-summary {
        grid-template-columns: 1fr;
      }

      .family-tree-workspace {
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
              <select
                class="toolbar-control toolbar-select family-selector"
                [ngModel]="selectedFamilyId()"
                (ngModelChange)="selectFamily($event)"
                [ngModelOptions]="{ standalone: true }"
                aria-label="Selectează familia">
                @for (family of families(); track family.id) {
                  <option [ngValue]="family.id">{{ family.name }}</option>
                }
              </select>

              <form class="family-create-inline" (ngSubmit)="createFamily()">
                <input
                  class="family-input"
                  type="text"
                  name="familyName"
                  placeholder="Familie nouă"
                  [(ngModel)]="newFamilyName"
                  [ngModelOptions]="{ standalone: true }">
                <button class="toolbar-button toolbar-primary-button" type="submit" [disabled]="!newFamilyName.trim()">
                  <mat-icon>add</mat-icon>
                  Creează
                </button>
              </form>

              <button class="toolbar-button toolbar-secondary-button" type="button" routerLink="/families/report">
                <mat-icon>summarize</mat-icon>
                Raport
              </button>
            </div>
          </div>

          <div class="families-workspace">
            <section class="surface family-detail-panel">
              @if (selectedFamily(); as family) {
                <section class="family-tree-editor" aria-label="Arbore familial" cdkDropListGroup>
                  <div class="family-section-header">
                    <div class="section-title-group">
                      <h2>Arbore familial</h2>
                      <span class="muted-small">Trage o persoană din dreapta peste poziția potrivită.</span>
                    </div>
                  </div>

                  <div class="family-tree-workspace">
                    <div class="family-tree-canvas">
                      <span class="tree-level-label">Bunici</span>
                      <div class="tree-level tree-grandparents-level">
                        <div class="tree-grandparent-group">
                          <span class="tree-family-side-label">Bunici paterni</span>
                          <div class="tree-level">
                            <div class="tree-slot" cdkDropList (cdkDropListDropped)="dropTreePerson($event, 'paternalGrandfather', family)">
                              @if (treeGrandparent(family, 'paternal', 'MALE'); as grandparent) {
                                <div class="tree-person-card" cdkDrag [cdkDragData]="grandparent">
                                  <span class="tree-person-name">{{ personName(grandparent) }}</span>
                                  <span class="tree-person-meta">bunic</span>
                                </div>
                              } @else {
                                <mat-icon>add</mat-icon>
                                <span>Bunic</span>
                              }
                            </div>
                            <div class="tree-slot" cdkDropList (cdkDropListDropped)="dropTreePerson($event, 'paternalGrandmother', family)">
                              @if (treeGrandparent(family, 'paternal', 'FEMALE'); as grandparent) {
                                <div class="tree-person-card" cdkDrag [cdkDragData]="grandparent">
                                  <span class="tree-person-name">{{ personName(grandparent) }}</span>
                                  <span class="tree-person-meta">bunică</span>
                                </div>
                              } @else {
                                <mat-icon>add</mat-icon>
                                <span>Bunică</span>
                              }
                            </div>
                          </div>
                        </div>
                        <div class="tree-grandparent-group">
                          <span class="tree-family-side-label">Bunici materni</span>
                          <div class="tree-level">
                            <div class="tree-slot" cdkDropList (cdkDropListDropped)="dropTreePerson($event, 'maternalGrandfather', family)">
                              @if (treeGrandparent(family, 'maternal', 'MALE'); as grandparent) {
                                <div class="tree-person-card" cdkDrag [cdkDragData]="grandparent">
                                  <span class="tree-person-name">{{ personName(grandparent) }}</span>
                                  <span class="tree-person-meta">bunic</span>
                                </div>
                              } @else {
                                <mat-icon>add</mat-icon>
                                <span>Bunic</span>
                              }
                            </div>
                            <div class="tree-slot" cdkDropList (cdkDropListDropped)="dropTreePerson($event, 'maternalGrandmother', family)">
                              @if (treeGrandparent(family, 'maternal', 'FEMALE'); as grandparent) {
                                <div class="tree-person-card" cdkDrag [cdkDragData]="grandparent">
                                  <span class="tree-person-name">{{ personName(grandparent) }}</span>
                                  <span class="tree-person-meta">bunică</span>
                                </div>
                              } @else {
                                <mat-icon>add</mat-icon>
                                <span>Bunică</span>
                              }
                            </div>
                          </div>
                        </div>
                      </div>

                      <div class="tree-connector" aria-hidden="true"></div>
                      <span class="tree-level-label">Părinți</span>
                      <div class="tree-level">
                        <div class="tree-slot" cdkDropList (cdkDropListDropped)="dropTreePerson($event, 'father', family)">
                          @if (treeParent(family, 'MALE'); as parent) {
                            <div class="tree-person-card" cdkDrag [cdkDragData]="parent">
                              <span class="tree-person-name">{{ personName(parent) }}</span>
                              <span class="tree-person-meta">tată</span>
                            </div>
                          } @else {
                            <mat-icon>add</mat-icon>
                            <span>Tată</span>
                          }
                        </div>
                        <div class="tree-slot" cdkDropList (cdkDropListDropped)="dropTreePerson($event, 'mother', family)">
                          @if (treeParent(family, 'FEMALE'); as parent) {
                            <div class="tree-person-card" cdkDrag [cdkDragData]="parent">
                              <span class="tree-person-name">{{ personName(parent) }}</span>
                              <span class="tree-person-meta">mamă</span>
                            </div>
                          } @else {
                            <mat-icon>add</mat-icon>
                            <span>Mamă</span>
                          }
                        </div>
                      </div>

                      <div class="tree-connector" aria-hidden="true"></div>
                      <span class="tree-level-label">Persoana principală</span>
                      <div class="tree-level">
                        <div class="tree-slot" cdkDropList (cdkDropListDropped)="dropTreePerson($event, 'primary', family)">
                          @if (treePrimaryPerson(family); as primary) {
                            <div class="tree-person-card current">
                              <span class="tree-person-name">{{ personName(primary) }}</span>
                              <span class="tree-person-meta">principal</span>
                            </div>
                          } @else {
                            <span>Adaugă primul membru</span>
                          }
                        </div>
                        <div class="tree-slot" cdkDropList (cdkDropListDropped)="dropTreePerson($event, 'spouse', family)">
                          @if (treeSpouse(family); as spouse) {
                            <div class="tree-person-card" cdkDrag [cdkDragData]="spouse">
                              <span class="tree-person-name">{{ personName(spouse) }}</span>
                              <span class="tree-person-meta">soț/soție</span>
                            </div>
                          } @else {
                            <mat-icon>add</mat-icon>
                            <span>Soț/soție</span>
                          }
                        </div>
                      </div>

                      <div class="tree-connector" aria-hidden="true"></div>
                      <span class="tree-level-label">Frați</span>
                      <div class="tree-level">
                        @for (sibling of visibleTreeSiblings(family); track sibling.id) {
                          <div class="tree-slot">
                            <div class="tree-person-card" cdkDrag [cdkDragData]="sibling">
                              <span class="tree-person-name">{{ personName(sibling) }}</span>
                              <span class="tree-person-meta">frate/soră</span>
                            </div>
                          </div>
                        }
                        <div class="tree-slot" cdkDropList (cdkDropListDropped)="dropTreePerson($event, 'sibling', family)">
                          <mat-icon>add</mat-icon>
                          <span>Frate/soră</span>
                        </div>
                      </div>
                      @if (treeSiblings(family).length > 3) {
                        <button class="tree-expand-button" type="button" (click)="treeSiblingsExpanded = !treeSiblingsExpanded">
                          {{ treeSiblingsExpanded ? 'Ascunde frații' : '+ ' + (treeSiblings(family).length - 3) + ' frați' }}
                        </button>
                      }

                      <div class="tree-connector" aria-hidden="true"></div>
                      <span class="tree-level-label">Copii</span>
                      <div class="tree-level">
                        @for (slot of [0, 1, 2]; track slot) {
                          <div class="tree-slot" cdkDropList (cdkDropListDropped)="dropTreePerson($event, 'child', family)">
                            @if (treeChildren(family)[slot]; as child) {
                              <div class="tree-person-card" cdkDrag [cdkDragData]="child">
                                <span class="tree-person-name">{{ personName(child) }}</span>
                                <span class="tree-person-meta">copil</span>
                              </div>
                            } @else {
                              <mat-icon>add</mat-icon>
                              <span>Copil</span>
                            }
                          </div>
                        }
                      </div>

                      @if (treeChildren(family).length > 0) {
                        <label class="family-field">
                          <span>Adaugă nepot pentru copilul</span>
                          <select class="family-input" [ngModel]="treeGrandchildParentId" (ngModelChange)="treeGrandchildParentId = $event" [ngModelOptions]="{ standalone: true }">
                            @for (child of treeChildren(family); track child.id) {
                              <option [ngValue]="child.id">{{ personName(child) }}</option>
                            }
                          </select>
                        </label>
                      }

                      @if (treeChildren(family).length > 0) {
                        <div class="tree-connector" aria-hidden="true"></div>
                        <span class="tree-level-label">Nepoți</span>
                        <div class="tree-level">
                          @for (grandchild of visibleTreeGrandchildren(family); track grandchild.id) {
                            <div class="tree-slot">
                              <div class="tree-person-card" cdkDrag [cdkDragData]="grandchild">
                                <span class="tree-person-name">{{ personName(grandchild) }}</span>
                                <span class="tree-person-meta">nepot</span>
                              </div>
                            </div>
                          }
                          <div class="tree-slot" cdkDropList (cdkDropListDropped)="dropTreePerson($event, 'grandchild', family)">
                            <mat-icon>add</mat-icon>
                            <span>Nepot</span>
                          </div>
                        </div>
                        @if (treeGrandchildren(family).length > 3) {
                          <button class="tree-expand-button" type="button" (click)="treeGrandchildrenExpanded = !treeGrandchildrenExpanded">
                            {{ treeGrandchildrenExpanded ? 'Ascunde nepoții' : '+ ' + (treeGrandchildren(family).length - 3) + ' nepoți' }}
                          </button>
                        }
                      }

                    </div>

                    <aside class="tree-person-picker">
                      <strong>Persoane</strong>
                      <input class="family-input" type="search" placeholder="Caută persoană" [(ngModel)]="treePersonQuery" [ngModelOptions]="{ standalone: true }">
                      <span class="muted-small">Trage persoana peste un slot.</span>
                      <div class="tree-person-list" cdkDropList [cdkDropListData]="treePickerPersons(family)">
                        @for (person of treePickerPersons(family); track person.id) {
                          <div class="tree-person-option" cdkDrag [cdkDragData]="person">
                            <span class="tree-person-name">{{ personName(person) }}</span>
                            <span class="tree-person-meta">{{ genderLabel(person) }}</span>
                          </div>
                        } @empty {
                          <span class="muted-small">Nicio persoană găsită.</span>
                        }
                      </div>
                    </aside>
                  </div>
                </section>

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
  totalMembers = computed(() => this.families().reduce((total, family) => total + family.members.length, 0));
  totalRelationships = computed(() => this.families().reduce((total, family) => total + family.relationships.length, 0));
  unassignedPeopleCount = computed(() => {
    const assigned = new Set(this.families().flatMap((family) => family.members.map((member) => member.personId)));
    return this.persons().filter((person) => !assigned.has(person.id)).length;
  });

  roles: FamilyRole[] = ['HUSBAND', 'WIFE', 'FATHER', 'MOTHER', 'PARENT', 'CHILD', 'WIDOWED', 'OTHER'];
  relationshipTypes: FamilyRelationshipType[] = ['SPOUSE', 'PARENT_CHILD', 'SIBLING'];
  treePersonQuery = '';
  treeGrandchildParentId: number | null = null;
  treeSiblingsExpanded = false;
  treeGrandchildrenExpanded = false;
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
    this.treeGrandchildParentId = null;
    this.treeSiblingsExpanded = false;
    this.treeGrandchildrenExpanded = false;
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

  treePickerPersons(family: Family): Person[] {
    const query = this.normalize(this.treePersonQuery);
    return this.persons()
      .filter((person) => person.id !== this.treePrimaryPerson(family)?.id)
      .filter((person) => !query || this.normalize(this.personName(person)).includes(query))
      .sort((a, b) => this.personName(a).localeCompare(this.personName(b), 'ro'));
  }

  treePrimaryPerson(family: Family): Person | null {
    const member = family.members.find((item) => item.primaryMember) || family.members[0];
    return member ? this.personById(member.personId) : null;
  }

  treeParent(family: Family, gender: 'MALE' | 'FEMALE'): Person | null {
    const primary = this.treePrimaryPerson(family);
    if (!primary) {
      return null;
    }
    const parents = this.relatedIds(family, 'PARENT_CHILD', primary.id, 'parent')
      .map((id) => this.personById(id))
      .filter((person): person is Person => !!person);
    return parents.find((person) => person.gender === gender)
      || parents.find((person) => family.members.find((member) => member.personId === person.id)?.role === (gender === 'MALE' ? 'FATHER' : 'MOTHER'))
      || null;
  }

  treeGrandparent(family: Family, side: 'paternal' | 'maternal', gender: 'MALE' | 'FEMALE'): Person | null {
    const parent = this.treeParent(family, side === 'paternal' ? 'MALE' : 'FEMALE');
    if (!parent) {
      return null;
    }
    const grandparents = this.peopleForIds(this.relatedIds(family, 'PARENT_CHILD', parent.id, 'parent'));
    const role = gender === 'MALE' ? 'GRANDFATHER' : 'GRANDMOTHER';
    return grandparents.find((person) => family.members.find((member) => member.personId === person.id)?.role === role)
      || grandparents.find((person) => person.gender === gender)
      || null;
  }

  treeSpouse(family: Family): Person | null {
    const primary = this.treePrimaryPerson(family);
    if (!primary) {
      return null;
    }
    const spouseId = family.relationships.find((relationship) => relationship.type === 'SPOUSE'
      && (relationship.personAId === primary.id || relationship.personBId === primary.id));
    return spouseId ? this.personById(spouseId.personAId === primary.id ? spouseId.personBId : spouseId.personAId) : null;
  }

  treeSiblings(family: Family): Person[] {
    const primary = this.treePrimaryPerson(family);
    if (!primary) {
      return [];
    }
    const parentIds = this.relatedIds(family, 'PARENT_CHILD', primary.id, 'parent');
    const inferred = family.relationships
      .filter((relationship) => relationship.type === 'PARENT_CHILD'
        && parentIds.includes(relationship.personAId)
        && relationship.personBId !== primary.id)
      .map((relationship) => relationship.personBId);
    const explicit = family.relationships
      .filter((relationship) => relationship.type === 'SIBLING'
        && (relationship.personAId === primary.id || relationship.personBId === primary.id))
      .map((relationship) => relationship.personAId === primary.id ? relationship.personBId : relationship.personAId);
    return this.peopleForIds([...inferred, ...explicit]);
  }

  treeChildren(family: Family): Person[] {
    const primary = this.treePrimaryPerson(family);
    return primary ? this.peopleForIds(this.relatedIds(family, 'PARENT_CHILD', primary.id, 'child')) : [];
  }

  treeGrandchildren(family: Family): Person[] {
    return this.peopleForIds(this.treeChildren(family).flatMap((child) => this.relatedIds(family, 'PARENT_CHILD', child.id, 'child')));
  }

  visibleTreeSiblings(family: Family): Person[] {
    return this.treeSiblingsExpanded ? this.treeSiblings(family) : this.treeSiblings(family).slice(0, 3);
  }

  visibleTreeGrandchildren(family: Family): Person[] {
    return this.treeGrandchildrenExpanded ? this.treeGrandchildren(family) : this.treeGrandchildren(family).slice(0, 3);
  }

  dropTreePerson(event: CdkDragDrop<unknown>, slot: TreeSlot, family: Family): void {
    const person = event.item.data as Person | undefined;
    if (!person) {
      return;
    }

    if (slot === 'primary') {
      this.ensurePrimaryTreeMember(family, person).subscribe({
        next: (updated) => {
          this.replaceFamily(updated);
          this.toast.success('Persoana principală a fost adăugată.');
        },
        error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-a putut adăuga persoana principală.'))
      });
      return;
    }

    const primary = this.treePrimaryPerson(family);
    if (!primary || person.id === primary.id) {
      return;
    }

    if (this.isGrandparentSlot(slot) && !this.treeGrandparentParent(family, slot)) {
      this.toast.error('Adaugă mai întâi părintele pentru această ramură.');
      return;
    }

    const relationship = this.treeRelationship(slot, family, primary.id, person.id);
    if (!relationship) {
      return;
    }
    const role = this.treeRole(slot, person);
    this.ensureTreeMember(family, person, role).pipe(
      switchMap((updated) => this.addTreeRelationship(updated, relationship))
    ).subscribe({
      next: (updated) => {
        this.replaceFamily(updated);
        this.toast.success('Relația de familie a fost salvată.');
      },
      error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-a putut salva relația de familie.'))
    });
  }

  genderLabel(person: Person): string {
    return person.gender === 'MALE' ? 'bărbat' : person.gender === 'FEMALE' ? 'femeie' : 'gen nespecificat';
  }

  private treeRelationship(slot: TreeSlot, family: Family, primaryId: number, personId: number): FamilyRelationshipRequest | null {
    if (this.isGrandparentSlot(slot)) {
      const parentId = this.treeGrandparentParent(family, slot);
      return parentId ? { personAId: personId, personBId: parentId, type: 'PARENT_CHILD' } : null;
    }
    if (slot === 'father' || slot === 'mother') {
      return { personAId: personId, personBId: primaryId, type: 'PARENT_CHILD' };
    }
    if (slot === 'child') {
      return { personAId: primaryId, personBId: personId, type: 'PARENT_CHILD' };
    }
    if (slot === 'grandchild') {
      const parentId = this.treeGrandchildParentId || this.treeChildren(family)[0]?.id;
      return parentId
        ? { personAId: parentId, personBId: personId, type: 'PARENT_CHILD' }
        : null;
    }
    if (slot === 'sibling') {
      return { personAId: primaryId, personBId: personId, type: 'SIBLING' };
    }
    if (slot === 'spouse') {
      return { personAId: primaryId, personBId: personId, type: 'SPOUSE' };
    }
    return null;
  }

  private treeRole(slot: TreeSlot, person: Person): FamilyRole {
    if (slot === 'paternalGrandfather' || slot === 'maternalGrandfather') {
      return 'GRANDFATHER';
    }
    if (slot === 'paternalGrandmother' || slot === 'maternalGrandmother') {
      return 'GRANDMOTHER';
    }
    if (slot === 'father') {
      return 'FATHER';
    }
    if (slot === 'mother') {
      return 'MOTHER';
    }
    if (slot === 'child' || slot === 'grandchild') {
      return 'CHILD';
    }
    if (slot === 'spouse') {
      return person.gender === 'MALE' ? 'HUSBAND' : person.gender === 'FEMALE' ? 'WIFE' : 'OTHER';
    }
    return 'OTHER';
  }

  private isGrandparentSlot(slot: TreeSlot): boolean {
    return slot === 'paternalGrandfather'
      || slot === 'paternalGrandmother'
      || slot === 'maternalGrandfather'
      || slot === 'maternalGrandmother';
  }

  private treeGrandparentParent(family: Family, slot: TreeSlot): number | null {
    if (slot === 'paternalGrandfather' || slot === 'paternalGrandmother') {
      return this.treeParent(family, 'MALE')?.id || null;
    }
    if (slot === 'maternalGrandfather' || slot === 'maternalGrandmother') {
      return this.treeParent(family, 'FEMALE')?.id || null;
    }
    return null;
  }

  private ensureTreeMember(family: Family, person: Person, role: FamilyRole) {
    const existing = family.members.find((member) => member.personId === person.id);
    if (!existing) {
      return this.familiesService.addMember(family.id, {
        personId: person.id,
        role,
        primaryMember: false
      });
    }
    if (existing.role === role) {
      return of(family);
    }
    return this.familiesService.updateMember(family.id, existing.id, {
      personId: existing.personId,
      role,
      primaryMember: existing.primaryMember
    });
  }

  private ensurePrimaryTreeMember(family: Family, person: Person) {
    const existing = family.members.find((member) => member.personId === person.id);
    if (!existing) {
      return this.familiesService.addMember(family.id, {
        personId: person.id,
        role: 'OTHER',
        primaryMember: true
      });
    }
    if (existing.primaryMember) {
      return of(family);
    }
    return this.familiesService.updateMember(family.id, existing.id, {
      personId: existing.personId,
      role: existing.role,
      primaryMember: true
    });
  }

  private addTreeRelationship(family: Family, relationship: FamilyRelationshipRequest) {
    if (family.relationships.some((existing) => this.sameRelationship(
      existing,
      relationship.personAId,
      relationship.personBId,
      relationship.type))) {
      return of(family);
    }
    return this.familiesService.addRelationship(family.id, relationship);
  }

  private relatedIds(
    family: Family,
    type: FamilyRelationshipType,
    personId: number,
    direction: 'parent' | 'child'
  ): number[] {
    return family.relationships
      .filter((relationship) => relationship.type === type
        && (direction === 'parent' ? relationship.personBId === personId : relationship.personAId === personId))
      .map((relationship) => direction === 'parent' ? relationship.personAId : relationship.personBId);
  }

  private peopleForIds(ids: number[]): Person[] {
    return [...new Set(ids)]
      .map((id) => this.personById(id))
      .filter((person): person is Person => !!person);
  }

  private personById(id: number): Person | null {
    return this.persons().find((person) => person.id === id) || null;
  }

  previewMembers(family: Family): FamilyMember[] {
    return this.sortedMembers(family).slice(0, 3);
  }

  sortedMembers(family: Family): FamilyMember[] {
    const roleOrder: Record<FamilyRole, number> = {
      HUSBAND: 1,
      WIFE: 2,
      FATHER: 3,
      MOTHER: 4,
      GRANDFATHER: 5,
      GRANDMOTHER: 6,
      PARENT: 7,
      CHILD: 8,
      WIDOWED: 9,
      OTHER: 10
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
      FATHER: 'tată',
      MOTHER: 'mamă',
      GRANDFATHER: 'bunic',
      GRANDMOTHER: 'bunică',
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
      PARENT_CHILD: 'părinte - copil',
      SIBLING: 'frați / surori'
    };
    return labels[type];
  }

  relationshipTypeDescription(type: FamilyRelationshipType): string {
    if (type === 'SPOUSE') {
      return 'relație simetrică';
    }
    if (type === 'SIBLING') {
      return 'relație simetrică';
    }
    return 'direcție părinte - copil';
  }

  relationshipLabel(relationship: FamilyRelationship): string {
    if (relationship.type === 'SPOUSE') {
      return `${relationship.personAName} ↔ ${relationship.personBName}`;
    }
    if (relationship.type === 'SIBLING') {
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
      || candidates.find((member) => member.role === 'FATHER' || member.role === 'MOTHER')
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
    if (type === 'SPOUSE' || type === 'SIBLING') {
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

type TreeSlot = 'primary' | 'father' | 'mother' | 'paternalGrandfather' | 'paternalGrandmother' | 'maternalGrandfather' | 'maternalGrandmother' | 'spouse' | 'sibling' | 'child' | 'grandchild';
