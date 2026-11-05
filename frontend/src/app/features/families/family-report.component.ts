import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { apiErrorMessage } from '../../shared/api-error-message';
import { PageNavComponent } from '../../shared/page-nav.component';
import { LanguageService } from '../../core/language.service';
import { ToastService } from '../../shared/toast.service';
import { FamiliesService } from './families.service';
import { Family, FamilyMember } from './family.model';

@Component({
  selector: 'app-family-report',
  standalone: true,
  imports: [MatIconModule, PageNavComponent],
  styles: [`
    .report-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 12px;
    }

    .family-report-card {
      display: grid;
      gap: 12px;
      padding: 13px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: #ffffff;
      box-shadow: var(--app-shadow);
    }

    .family-report-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
    }

    .family-report-title {
      margin: 0;
      color: var(--app-text);
      font-size: 16px;
      font-weight: 850;
      line-height: 1.2;
    }

    .family-report-count {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-height: 25px;
      border-radius: 999px;
      background: var(--app-primary-soft);
      color: var(--app-primary-strong);
      font-size: 12px;
      font-weight: 800;
      padding: 0 10px;
      white-space: nowrap;
    }

    .family-tree {
      display: grid;
      gap: 8px;
      justify-items: center;
      padding: 4px 0 2px;
    }

    .generation-row {
      display: flex;
      align-items: center;
      width: 100%;
    }

    .generation-people {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      width: 100%;
      min-width: 0;
      justify-content: center;
    }

    .generation-person {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      min-height: 30px;
      padding: 0 10px;
      border: 1px solid #edf2f7;
      border-radius: 8px;
      background: #f8fafc;
      color: var(--app-text);
      font-size: 13px;
      font-weight: 800;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .generation-person.primary {
      border-color: color-mix(in srgb, var(--app-primary) 34%, #edf2f7);
      background: var(--app-primary-soft);
      color: var(--app-primary-strong);
    }

    .person-dash {
      align-self: center;
      color: var(--app-muted);
      font-size: 14px;
      font-weight: 900;
    }

    .generation-connector {
      box-sizing: border-box;
      width: 100%;
      color: var(--app-muted);
      font-size: 18px;
      font-weight: 800;
      line-height: 1;
      text-align: center;
    }

    .muted-small {
      color: var(--app-muted);
      font-size: 12px;
      font-weight: 650;
    }

    .empty-report {
      display: grid;
      place-items: center;
      min-height: 220px;
      color: var(--app-muted);
      text-align: center;
    }

    @media (max-width: 680px) {
      .report-grid {
        grid-template-columns: 1fr;
      }

      .generation-row {
        align-items: flex-start;
        flex-direction: column;
        gap: 5px;
      }

      .generation-person {
        max-width: 100%;
      }
    }
  `],
  template: `
    <main class="page">
      <header class="page-header">
        <div class="page-header-main">
          <h1 class="page-title page-title-offset">{{ language.language() === 'en' ? 'Family report' : 'Raport familii' }}</h1>
          <p class="page-subtitle" aria-hidden="true">&nbsp;</p>
        </div>
        <div class="page-header-actions">
          <app-page-nav />
        </div>
      </header>

      @if (families().length > 0) {
        <section class="report-grid">
          @for (family of families(); track family.id) {
            <article class="family-report-card">
              <header class="family-report-head">
                <div>
                  <h2 class="family-report-title">{{ family.name }}</h2>
                  @if (family.notes) {
                    <div class="muted-small">{{ family.notes }}</div>
                  }
                </div>
                <span class="family-report-count">
                  <mat-icon>groups</mat-icon>
                  {{ family.members.length }}
                </span>
              </header>

              <section class="family-tree">
                @for (section of familyTree(family); track section.key; let last = $last) {
                  <div class="generation-row">
                    <div class="generation-people">
                      @for (person of section.people; track person.id; let personLast = $last) {
                        <span
                          class="generation-person"
                          [class.primary]="section.primary"
                          [title]="person.name">
                          {{ person.name }}
                        </span>
                        @if (section.joinWithDash && !personLast) {
                          <span class="person-dash" aria-hidden="true">-</span>
                        }
                      }
                    </div>
                  </div>
                  @if (!last) {
                    <div class="generation-connector" aria-hidden="true">|</div>
                  }
                } @empty {
                  <div class="muted-small">Nu există relații definite.</div>
                }
              </section>
            </article>
          }
        </section>
      } @else {
        <section class="surface empty-report">
          <div>
            <mat-icon>family_restroom</mat-icon>
            <p>Nu există familii definite pentru raport.</p>
          </div>
        </section>
      }
    </main>
  `
})
export class FamilyReportComponent implements OnInit {
  language = inject(LanguageService);
  private familiesService = inject(FamiliesService);
  private toast = inject(ToastService);

  families = signal<Family[]>([]);

  ngOnInit(): void {
    this.familiesService.list().subscribe({
      next: (families) => this.families.set(families),
      error: (error) => this.toast.error(apiErrorMessage(error, 'Nu s-a putut încărca raportul de familii.'))
    });
  }

  familyTree(family: Family): FamilyTreeSection[] {
    const parentMap = this.parentMap(family);
    const memberNames = this.memberNameMap(family);
    const centerIds = this.centerPeople(family, parentMap);
    const childrenIds = this.uniqueIds(centerIds.flatMap((id) => parentMap.get(id) || []));
    const grandchildIds = this.uniqueIds(childrenIds.flatMap((id) => parentMap.get(id) || []));
    const parentIds = this.uniqueIds(family.relationships
      .filter((relationship) => relationship.type === 'PARENT_CHILD' && centerIds.includes(relationship.personBId))
      .map((relationship) => relationship.personAId));
    const greatGrandparentIds = this.uniqueIds(family.relationships
      .filter((relationship) => relationship.type === 'PARENT_CHILD' && parentIds.includes(relationship.personBId))
      .map((relationship) => relationship.personAId));

    return [
      this.section('great-grandparents', 'străbunici', greatGrandparentIds, memberNames),
      this.section('grandparents', 'bunici', parentIds, memberNames),
      this.section('parents', this.centerLabel(family, centerIds), centerIds, memberNames, true, centerIds.length === 2),
      this.section('children', childrenIds.length === 1 ? 'copil' : 'copii', childrenIds, memberNames),
      this.section('grandchildren', grandchildIds.length === 1 ? 'nepot' : 'nepoți', grandchildIds, memberNames)
    ].filter((section): section is FamilyTreeSection => section !== null);
  }

  memberName(member: FamilyMember): string {
    return member.firstName || this.firstName(member.fullName);
  }

  private centerPeople(family: Family, parentMap: Map<number, number[]>): number[] {
    const spouse = family.relationships.find((relationship) => relationship.type === 'SPOUSE');
    if (spouse) {
      return [spouse.personAId, spouse.personBId];
    }

    const roleCouple = family.members
      .filter((member) => member.role === 'HUSBAND' || member.role === 'WIFE')
      .map((member) => member.personId);
    if (roleCouple.length > 0) {
      return roleCouple;
    }

    const parentIds = [...parentMap.keys()];
    const topParents = parentIds.filter((id) => !family.relationships.some((relationship) =>
      relationship.type === 'PARENT_CHILD' && relationship.personBId === id));
    if (topParents.length > 0) {
      return topParents;
    }
    if (parentIds.length > 0) {
      return parentIds;
    }
    return family.members.filter((member) => member.primaryMember).map((member) => member.personId);
  }

  private centerLabel(family: Family, centerIds: number[]): string {
    const hasSpouse = family.relationships.some((relationship) =>
      relationship.type === 'SPOUSE'
      && centerIds.includes(relationship.personAId)
      && centerIds.includes(relationship.personBId));
    const hasRoleCouple = family.members.some((member) => centerIds.includes(member.personId) && member.role === 'HUSBAND')
      && family.members.some((member) => centerIds.includes(member.personId) && member.role === 'WIFE');
    return hasSpouse || hasRoleCouple ? 'soți' : 'părinți';
  }

  private parentMap(family: Family): Map<number, number[]> {
    const map = new Map<number, number[]>();
    family.relationships
      .filter((relationship) => relationship.type === 'PARENT_CHILD')
      .forEach((relationship) => {
        map.set(relationship.personAId, [...(map.get(relationship.personAId) || []), relationship.personBId]);
      });
    return map;
  }

  private memberNameMap(family: Family): Map<number, string> {
    const names = new Map(family.members.map((member) => [member.personId, this.memberName(member)]));
    family.relationships.forEach((relationship) => {
      if (!names.has(relationship.personAId)) {
        names.set(relationship.personAId, this.firstName(relationship.personAName));
      }
      if (!names.has(relationship.personBId)) {
        names.set(relationship.personBId, this.firstName(relationship.personBName));
      }
    });
    return names;
  }

  private firstName(name: string): string {
    return name.trim().split(/\s+/)[0] || name;
  }

  private section(
    key: string,
    label: string,
    ids: number[],
    names: Map<number, string>,
    primary = false,
    joinWithDash = false
  ): FamilyTreeSection | null {
    const people = this.uniqueIds(ids)
      .map((id) => ({ id, name: names.get(id) || '' }))
      .filter((person) => person.name)
      .sort((left, right) => left.name.localeCompare(right.name, 'ro'));
    return people.length > 0 ? { key, label, people, primary, joinWithDash } : null;
  }

  private uniqueIds(ids: number[]): number[] {
    return [...new Set(ids)];
  }
}

interface FamilyTreeSection {
  key: string;
  label: string;
  people: FamilyTreePerson[];
  primary: boolean;
  joinWithDash: boolean;
}

interface FamilyTreePerson {
  id: number;
  name: string;
}
