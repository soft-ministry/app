import { Component, ElementRef, HostListener, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../core/auth.service';
import { ChurchSettingsService } from '../core/church-settings.service';
import { LanguageService } from '../core/language.service';
import { PageMenuActionsService } from './page-menu-actions.service';
import { TableNavigationItem, TablePreferencesService } from './table-preferences.service';

@Component({
  selector: 'app-page-nav',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet, RouterLink, RouterLinkActive, MatIconModule],
  styles: [`
    .page-nav {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.45rem;
      width: max-content;
      max-width: 100%;
      min-width: 0;
      flex-wrap: nowrap;
      overflow: visible;
    }

    .church-select {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      flex: 0 1 240px;
      min-width: 150px;
      max-width: 260px;
      min-height: 2.2rem;
      padding: 0.35rem 0.45rem;
      border: 1px solid var(--app-border);
      border-radius: 999px;
      background: #ffffff;
      color: var(--app-text);
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
    }

    .church-select mat-icon {
      flex: 0 0 auto;
      color: var(--app-primary-strong);
    }

    .church-avatar {
      overflow: hidden;
      flex: 0 0 auto;
      width: 24px;
      height: 24px;
      border-radius: 999px;
      object-fit: cover;
      background: var(--app-primary-soft);
    }

    .church-select select {
      min-width: 0;
      width: 100%;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--app-text);
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    .page-nav .nav-control {
      flex: 0 0 auto;
      display: inline-grid;
      place-items: center;
      position: relative;
      width: 2.2rem;
      height: 2.2rem;
      border: 1px solid var(--app-border);
      border-radius: 999px;
      background: #ffffff;
      color: var(--app-muted);
      cursor: pointer;
      padding: 0;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
      transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .nav-group-menu,
    .account-menu {
      position: relative;
      flex: 0 0 auto;
    }

    .nav-group-menu summary,
    .account-menu summary {
      list-style: none;
    }

    .nav-group-menu summary::-webkit-details-marker,
    .account-menu summary::-webkit-details-marker {
      display: none;
    }

    .nav-group-menu[open] .nav-group-trigger,
    .account-menu[open] .account-trigger,
    .page-nav .nav-control:hover,
    .page-nav .nav-control.nav-active {
      border-color: var(--app-primary);
      background: var(--app-primary-soft);
      color: var(--app-primary-strong);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      transform: translateY(-1px);
    }

    .page-nav .nav-control:focus:not(:focus-visible) {
      outline: none;
    }

    .nav-control mat-icon {
      width: 19px;
      height: 19px;
      font-size: 19px;
      line-height: 19px;
    }

    .nav-group-panel {
      position: absolute;
      top: calc(100% + 0.45rem);
      left: 0;
      z-index: 2600;
      display: grid;
      min-width: 250px;
      gap: 0.12rem;
      padding: 0.4rem;
      border: 1px solid var(--app-border);
      border-radius: 12px;
      background: #ffffff;
      box-shadow: 0 14px 34px rgba(15, 23, 42, 0.12);
    }

    .nav-group-link {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.5rem;
      padding: 0.42rem 0.55rem;
      border-radius: 9px;
      color: #374151;
      text-decoration: none;
      font-size: inherit;
      font-weight: 400;
      white-space: nowrap;
    }

    .nav-group-label {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-shortcut {
      color: var(--app-muted);
      font-size: 12px;
      font-weight: 650;
    }

    .nav-group-link mat-icon {
      width: 1.3rem;
      height: 1.3rem;
      color: currentColor;
      font-size: 1.3rem;
      line-height: 1.3rem;
    }

    .nav-group-link:hover,
    .nav-group-link.nav-active {
      background: #f1f5f9;
      color: #111827;
    }

    .nav-group-link.nav-groups {
      color: #0891b2;
    }

    .nav-group-link.nav-reports {
      color: #d97706;
    }

    .nav-group-link.nav-finance {
      color: #0369a1;
    }

    .nav-group-link.nav-groups:hover,
    .nav-group-link.nav-groups.nav-active {
      color: #0891b2;
    }

    .nav-group-link.nav-reports:hover,
    .nav-group-link.nav-reports.nav-active {
      color: #d97706;
    }

    .nav-group-link.nav-finance:hover,
    .nav-group-link.nav-finance.nav-active {
      color: #0369a1;
    }

    .nav-group-link.nav-disabled {
      color: #94a3b8;
      cursor: not-allowed;
      opacity: 0.72;
    }

    .nav-group-link.nav-disabled:hover {
      background: #f8fafc;
      color: #64748b;
    }

    .account-menu-panel {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      z-index: 2600;
      display: grid;
      min-width: 126px;
      gap: 2px;
      overflow: hidden;
      padding: 6px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 18px 44px rgba(15, 23, 42, 0.15);
    }

    .account-menu-custom {
      display: grid;
      gap: 2px;
    }

    .account-menu-section {
      display: grid;
      gap: 2px;
    }

    .account-menu-panel a,
    .account-menu-panel button {
      display: flex;
      align-items: center;
      gap: 9px;
      box-sizing: border-box;
      width: 100%;
      min-height: 36px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--app-text);
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      font-weight: 650;
      padding: 0 10px;
      text-align: left;
      text-decoration: none;
      white-space: nowrap;
    }

    .account-menu-panel a:hover,
    .account-menu-panel a.nav-active,
    .account-menu-panel button:hover {
      background: var(--app-primary-soft);
      color: var(--app-primary-strong);
    }

    .account-menu-panel .logout-link {
      color: #b65b5b;
    }

    .account-menu-panel .logout-link:hover {
      background: #fff1f1;
      color: #a54747;
    }

    .account-menu-separator {
      height: 1px;
      margin: 4px 2px;
      background: var(--app-border);
    }

    .language-picker {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      gap: 9px;
      padding: 6px 10px;
      color: var(--app-text);
      font-size: 13px;
      font-weight: 650;
    }

    .language-picker select {
      min-width: 0;
      border: 1px solid var(--app-border);
      border-radius: 6px;
      background: #ffffff;
      color: var(--app-text);
      font: inherit;
      font-size: 12px;
      padding: 5px 7px;
    }

    .account-menu-panel mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
      line-height: 18px;
    }

    @media (max-width: 720px) {
      .page-nav {
        justify-content: flex-start;
        flex-wrap: wrap;
        gap: 0.6rem;
        width: 100%;
        max-width: 100%;
        overflow: visible;
        padding-bottom: 2px;
        scrollbar-width: thin;
      }

      .page-nav .nav-control {
        width: 2.85rem;
        height: 2.85rem;
      }

      .nav-control mat-icon {
        width: 24px;
        height: 24px;
        font-size: 24px;
        line-height: 24px;
      }

      .church-select {
        flex: 0 1 220px;
        min-width: 0;
        max-width: min(220px, 100%);
        min-height: 2.85rem;
        order: 10;
      }

      .church-avatar {
        width: 30px;
        height: 30px;
      }

      .nav-group-panel {
        left: 0;
        right: auto;
        max-width: calc(100vw - 32px);
        min-width: min(220px, calc(100vw - 32px));
      }

      .account-menu-panel {
        left: auto;
        right: 0;
        max-width: calc(100vw - 32px);
      }
    }
  `],
  template: `
    <nav class="page-nav" [attr.aria-label]="language.t('nav.main')">
      <a class="nav-control nav-home" routerLink="/dashboard" routerLinkActive="nav-active" [routerLinkActiveOptions]="{ exact: true }" [attr.aria-label]="language.t('nav.dashboard') + ' Ctrl+D'" [title]="language.t('nav.dashboard') + ' (Ctrl+D)'">
        <mat-icon>home</mat-icon>
      </a>
      <a class="nav-control nav-calendar" routerLink="/calendar" routerLinkActive="nav-active" [routerLinkActiveOptions]="{ exact: true }" [attr.aria-label]="language.t('nav.calendar')" [title]="language.t('nav.calendar')">
        <mat-icon>calendar_month</mat-icon>
      </a>

      @if (managementTables().length > 0) {
        <details class="nav-group-menu" #closeableMenu>
          <summary class="nav-control nav-group-trigger" [attr.aria-label]="language.t('nav.tables')" [title]="language.t('nav.tables')">
            <mat-icon>table_chart</mat-icon>
          </summary>
          <div class="nav-group-panel">
            @for (item of managementTables(); track item.id) {
              <a class="nav-group-link" [class.nav-groups]="item.id === 'groups'" [class.nav-reports]="item.id === 'reports'" [class.nav-finance]="item.id === 'finance'" [routerLink]="item.route" routerLinkActive="nav-active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeAllMenus()">
                <mat-icon>{{ item.icon }}</mat-icon>
                <span class="nav-group-label">{{ language.tableLabel(item.id, item.label) }}</span>
                @if (shortcutLabel(item.id)) {
                  <span class="nav-shortcut">({{ shortcutLabel(item.id) }})</span>
                }
              </a>
            }
          </div>
        </details>
      }

      @if (pastoralTables().length > 0) {
        <details class="nav-group-menu" #closeableMenu>
          <summary class="nav-control nav-group-trigger" [attr.aria-label]="language.t('nav.pastoral')" [title]="language.t('nav.pastoral')">
            <mat-icon>volunteer_activism</mat-icon>
          </summary>
          <div class="nav-group-panel">
            @for (item of pastoralTables(); track item.id) {
              @if (item.disabled) {
                <span class="nav-group-link nav-disabled" [title]="language.t('common.inProgress')" aria-disabled="true">
                  <mat-icon>{{ item.icon }}</mat-icon>
                  <span class="nav-group-label">{{ language.tableLabel(item.id, item.label) }}</span>
                  <span class="nav-shortcut">{{ language.t('common.inProgress') }}</span>
                </span>
              } @else {
                <a class="nav-group-link" [routerLink]="item.route" routerLinkActive="nav-active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeAllMenus()">
                  <mat-icon>{{ item.icon }}</mat-icon>
                  <span class="nav-group-label">{{ language.tableLabel(item.id, item.label) }}</span>
                </a>
              }
            }
          </div>
        </details>
      }

      @if (church().churches.length > 0) {
        <label class="church-select" [title]="language.t('nav.activeChurch')">
          @if (activeAvatarUrl()) {
            <img class="church-avatar" [src]="activeAvatarUrl()!" alt="">
          } @else {
            <mat-icon>location_city</mat-icon>
          }
          <select [ngModel]="church().id" (ngModelChange)="selectChurch($event)" [attr.aria-label]="language.t('nav.activeChurch')">
            @for (item of church().churches; track item.id) {
              <option [ngValue]="item.id">{{ item.name }}</option>
            }
          </select>
        </label>
      }

      <ng-content select="[pageNavAfterChurch]" />

      <details class="account-menu" #closeableMenu>
        <summary class="nav-control account-trigger" [attr.aria-label]="language.t('nav.account')" [title]="language.t('nav.account')">
          <mat-icon>person</mat-icon>
        </summary>
        <div class="account-menu-panel">
          @if (hasPageMenuActions()) {
            <div class="account-menu-section">
              @for (action of pageMenuActions(); track action.id) {
                <button type="button" (click)="runPageAction(action.run)">
                  <mat-icon>{{ action.icon }}</mat-icon>
                  {{ action.label }}
                </button>
              }
              @if (pageMenuTemplate()) {
                <div class="account-menu-custom" (click)="$event.stopPropagation()">
                  <ng-container [ngTemplateOutlet]="pageMenuTemplate()"></ng-container>
                </div>
              }
            </div>
            <span class="account-menu-separator" aria-hidden="true"></span>
          }
          @if (auth.isAdmin()) {
            <div class="account-menu-section">
              <a routerLink="/users" routerLinkActive="nav-active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeAllMenus()">
                <mat-icon>manage_accounts</mat-icon>
                {{ language.t('nav.users') }}
              </a>
              <a routerLink="/settings" routerLinkActive="nav-active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeAllMenus()">
                <mat-icon>tune</mat-icon>
                {{ language.t('nav.settings') }}
              </a>
              <a routerLink="/settings/database" routerLinkActive="nav-active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeAllMenus()">
                <mat-icon>storage</mat-icon>
                {{ language.t('nav.database') }}
              </a>
            </div>
            <span class="account-menu-separator" aria-hidden="true"></span>
          }
          <div class="language-picker">
            <mat-icon>language</mat-icon>
            <select [ngModel]="language.language()" (ngModelChange)="language.setLanguage($event)" [attr.aria-label]="language.t('language.label')">
              <option value="ro">{{ language.t('language.ro') }}</option>
              <option value="en">{{ language.t('language.en') }}</option>
            </select>
          </div>
          <span class="account-menu-separator" aria-hidden="true"></span>
          <button class="logout-link" type="button" (click)="auth.logout()">
            <mat-icon>logout</mat-icon>
            {{ language.t('nav.logout') }}
          </button>
        </div>
      </details>

    </nav>
  `
})
export class PageNavComponent implements OnInit {
  auth = inject(AuthService);
  private churchSettingsService = inject(ChurchSettingsService);
  language = inject(LanguageService);
  private pageMenuActionsService = inject(PageMenuActionsService);
  private tablePreferencesService = inject(TablePreferencesService);
  church = this.churchSettingsService.settings;
  pageMenuActions = this.pageMenuActionsService.actions;
  pageMenuTemplate = this.pageMenuActionsService.template;

  @ViewChildren('closeableMenu') private closeableMenus?: QueryList<ElementRef<HTMLDetailsElement>>;

  ngOnInit(): void {
    this.tablePreferencesService.load().subscribe();
  }

  @HostListener('document:click', ['$event'])
  closeMenusOnOutsideClick(event: MouseEvent): void {
    this.closeableMenus?.forEach((item) => {
      const menu = item.nativeElement;
      if (menu.open && !menu.contains(event.target as Node)) {
        menu.open = false;
      }
    });
  }

  activeAvatarUrl(): string | null {
    return this.churchSettingsService.avatarContentUrl(this.church());
  }

  hasPageMenuActions(): boolean {
    return this.pageMenuActions().length > 0 || this.pageMenuTemplate() !== null;
  }

  managementTables(): TableNavigationItem[] {
    return this.visibleTables().filter((item) => item.group === 'management');
  }

  pastoralTables(): TableNavigationItem[] {
    return this.visibleTables().filter((item) => item.group === 'pastoral');
  }

  private visibleTables(): TableNavigationItem[] {
    return this.tablePreferencesService.orderedTables()
      .filter((item) => this.church().attendanceEnabled || !item.requiresAttendance);
  }

  shortcutLabel(itemId: string): string {
    return {
      events: 'Ctrl+E',
      finance: 'Ctrl+F',
      persons: 'Ctrl+P',
      reports: 'Ctrl+G'
    }[itemId] || '';
  }

  selectChurch(id: number | string): void {
    const churchId = Number(id);
    if (!Number.isFinite(churchId) || churchId === this.church().id) {
      return;
    }
    this.churchSettingsService.select(churchId).subscribe(() => window.location.reload());
  }

  runPageAction(action: () => void): void {
    action();
    this.closeAllMenus();
  }

  closeAllMenus(): void {
    this.closeableMenus?.forEach((item) => {
      item.nativeElement.open = false;
    });
  }

}
