import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ChurchSettings } from '../../core/church-settings.model';
import { LanguageService } from '../../core/language.service';
import { ChurchSettingsService } from '../../core/church-settings.service';
import { AppearanceTheme, APPEARANCE_PRESETS } from '../../core/theme/appearance-theme.model';
import { AppearanceThemeService } from '../../core/theme/appearance-theme.service';
import { apiErrorMessage } from '../../shared/api-error-message';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { PageNavComponent } from '../../shared/page-nav.component';
import { TableNavigationItem, TablePreferencesService } from '../../shared/table-preferences.service';
import { AttendanceSheet, AttendanceSummary } from '../attendance/attendance.model';
import { AttendanceService } from '../attendance/attendance.service';
import { ChurchCreateDialogComponent, ChurchCreateDialogResult } from './church-create-dialog.component';

interface ColorField {
  key: keyof AppearanceTheme;
  label: string;
}

interface FontOption {
  value: string;
  label: string;
  sample: string;
}

interface AttendanceChartRow {
  personId: number;
  name: string;
  presentCount: number;
  totalMeetings: number;
  percent: number;
}

interface AttendanceChurchChartRow {
  id: string;
  label: string;
  presentCount: number;
  totalCount: number;
  percent: number;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, MatIconModule, PageNavComponent],
  styles: [`
    .settings-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 340px;
      gap: 18px;
      align-items: start;
    }

    .settings-section {
      display: grid;
      gap: 14px;
    }

    .settings-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .settings-tab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 38px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface);
      color: var(--app-muted);
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      font-weight: 750;
      padding: 0 12px;
    }

    .settings-tab.active,
    .settings-tab:hover {
      border-color: var(--app-primary);
      background: var(--app-primary-soft);
      color: var(--app-primary-strong);
    }

    .settings-tab mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
      line-height: 18px;
    }

    .church-form {
      display: grid;
      grid-template-columns: 132px minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }

    .church-avatar-panel {
      display: grid;
      gap: 10px;
      justify-items: center;
    }

    .church-avatar {
      overflow: hidden;
      display: grid;
      width: 112px;
      height: 112px;
      place-items: center;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-primary-soft);
      color: var(--app-primary-strong);
      box-shadow: var(--app-shadow);
    }

    .church-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .church-avatar mat-icon {
      width: 40px;
      height: 40px;
      font-size: 40px;
      line-height: 40px;
    }

    .church-fields {
      display: grid;
      gap: 12px;
      min-width: 0;
    }

    .church-details {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      padding: 12px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface-muted);
    }

    .church-detail {
      display: grid;
      gap: 3px;
      min-width: 0;
    }

    .church-detail span {
      color: var(--app-muted);
      font-size: 12px;
      font-weight: 700;
    }

    .church-detail strong {
      overflow: hidden;
      color: var(--app-text);
      font-size: 14px;
      font-weight: 750;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .church-detail.wide {
      grid-column: 1 / -1;
    }

    .church-switch-row,
    .church-create-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: end;
    }

    .settings-field {
      display: grid;
      gap: 6px;
    }

    .settings-field span {
      color: var(--app-text);
      font-size: 13px;
      font-weight: 700;
    }

    .settings-input {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      padding: 9px 11px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface-muted);
      color: var(--app-text);
      font: inherit;
      font-size: 14px;
      outline: none;
    }

    .settings-input:focus {
      border-color: var(--app-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    .settings-toggle {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      color: var(--app-text);
      font-size: 13px;
      font-weight: 700;
    }

    .settings-toggle input {
      width: 18px;
      height: 18px;
      accent-color: var(--app-primary);
    }

    .church-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .attendance-chart {
      display: grid;
      gap: 12px;
    }

    .attendance-chart-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
      color: var(--app-muted);
      font-size: 13px;
      font-weight: 700;
    }

    .attendance-chart-heading strong {
      color: var(--app-text);
      font-size: 15px;
      font-weight: 850;
    }

    .attendance-chart-switch {
      display: inline-flex;
      gap: 6px;
      padding: 4px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface-muted);
      box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.02);
    }

    .attendance-chart-switch button {
      min-height: 32px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--app-muted);
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      font-weight: 750;
      padding: 0 12px;
    }

    .attendance-chart-switch button.active,
    .attendance-chart-switch button:hover {
      background: var(--app-surface);
      color: var(--app-primary-strong);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
    }

    .attendance-chart-row {
      display: grid;
      grid-template-columns: minmax(160px, 1fr) minmax(120px, 2fr) 92px;
      gap: 12px;
      align-items: center;
      min-width: 0;
    }

    .attendance-chart-name {
      overflow: hidden;
      color: var(--app-text);
      font-size: 14px;
      font-weight: 750;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .attendance-chart-track {
      overflow: hidden;
      height: 12px;
      border-radius: 999px;
      background: #edf2f7;
    }

    .attendance-chart-fill {
      display: block;
      height: 100%;
      min-width: 3px;
      border-radius: inherit;
      background: var(--app-primary);
    }

    .attendance-chart-value {
      color: var(--app-text);
      font-size: 13px;
      font-weight: 800;
      text-align: right;
      white-space: nowrap;
    }

    .preset-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .preset-card {
      display: grid;
      gap: 10px;
      padding: 14px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface);
      color: var(--app-text);
      text-align: left;
      cursor: pointer;
    }

    .preset-card:hover,
    .preset-card.selected {
      border-color: var(--app-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    .preset-preview {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      height: 28px;
      overflow: hidden;
      border: 1px solid var(--app-border);
      border-radius: 999px;
    }

    .preset-copy {
      display: grid;
      gap: 3px;
    }

    .preset-copy strong {
      font-size: 14px;
    }

    .preset-copy span {
      color: var(--app-muted);
      font-size: 12px;
      line-height: 1.35;
    }

    .quick-grid,
    .color-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .color-field {
      display: grid;
      grid-template-columns: 38px minmax(0, 1fr) 90px;
      align-items: center;
      gap: 9px;
      min-width: 0;
      padding: 9px 10px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface);
    }

    .color-field.compact {
      grid-template-columns: 42px minmax(0, 1fr);
      padding: 11px 12px;
    }

    .color-field input[type="color"] {
      width: 34px;
      height: 30px;
      padding: 0;
      border: 0;
      background: transparent;
      cursor: pointer;
    }

    .color-field span {
      overflow: hidden;
      color: var(--app-text);
      font-size: 13px;
      font-weight: 650;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .advanced-panel {
      margin-top: 12px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface-muted);
      overflow: hidden;
    }

    .advanced-panel summary {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 42px;
      padding: 0 12px;
      color: var(--app-text);
      cursor: pointer;
      font-size: 13px;
      font-weight: 750;
      list-style: none;
    }

    .advanced-panel summary::-webkit-details-marker {
      display: none;
    }

    .advanced-panel summary::before {
      content: "chevron_right";
      font-family: "Material Icons";
      color: var(--app-muted);
      font-size: 19px;
    }

    .advanced-panel[open] summary::before {
      content: "expand_more";
    }

    .advanced-content {
      display: grid;
      gap: 10px;
      padding: 0 12px 12px;
    }

    .hex-input {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      padding: 6px 7px;
      border: 1px solid var(--app-border);
      border-radius: 7px;
      color: var(--app-text);
      background: var(--app-surface-muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      text-transform: uppercase;
    }

    .font-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .table-layout-list {
      display: grid;
      gap: 8px;
    }

    .table-layout-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 8px;
      align-items: center;
      min-height: 42px;
      padding: 8px 10px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface);
    }

    .table-layout-row:hover {
      border-color: color-mix(in srgb, var(--app-primary) 38%, var(--app-border));
    }

    .table-layout-toggle {
      display: inline-flex;
      align-items: center;
      min-width: 0;
      gap: 10px;
      color: var(--app-text);
      font-size: 14px;
      font-weight: 700;
    }

    .table-layout-toggle input {
      width: 18px;
      height: 18px;
      accent-color: var(--app-primary);
    }

    .table-layout-toggle mat-icon {
      flex: 0 0 auto;
      width: 20px;
      height: 20px;
      color: var(--app-primary-strong);
      font-size: 20px;
      line-height: 20px;
    }

    .table-layout-button {
      display: inline-grid;
      place-items: center;
      width: 30px;
      min-height: 30px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface-muted);
      color: var(--app-text);
      cursor: pointer;
      padding: 0;
    }

    .table-layout-button:disabled {
      cursor: default;
      opacity: 0.35;
    }

    .table-layout-button mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
      line-height: 18px;
    }

    .font-field {
      display: grid;
      gap: 8px;
      padding: 12px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface);
    }

    .font-field span {
      color: var(--app-text);
      font-size: 13px;
      font-weight: 700;
    }

    .font-field select {
      width: 100%;
      min-height: 38px;
      padding: 0 10px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface-muted);
      color: var(--app-text);
      font: inherit;
    }

    .event-color-section {
      display: grid;
      gap: 10px;
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid var(--app-border);
    }

    .event-color-section:first-of-type {
      margin-top: 16px;
    }

    .event-color-section-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
    }

    .event-color-section-header h3 {
      margin: 0;
      color: var(--app-text);
      font-size: 14px;
      font-weight: 800;
    }

    .event-color-section-header span {
      color: var(--app-muted);
      font-size: 12px;
      font-weight: 600;
    }

    .font-color-control {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr) 90px;
      align-items: center;
      gap: 9px;
    }

    .font-color-control input[type="color"] {
      width: 34px;
      height: 30px;
      padding: 0;
      border: 0;
      background: transparent;
      cursor: pointer;
    }

    .size-control {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 72px;
      align-items: center;
      gap: 10px;
    }

    .size-control input[type="range"] {
      width: 100%;
      accent-color: var(--app-primary);
    }

    .size-control input[type="number"] {
      width: 100%;
      box-sizing: border-box;
      min-height: 34px;
      padding: 0 8px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      color: var(--app-text);
      background: var(--app-surface-muted);
      font: inherit;
      font-size: 13px;
    }

    .font-style-control {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }

    .font-sample {
      color: var(--app-muted);
      font-size: 13px;
      line-height: 1.35;
    }

    .settings-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      flex-wrap: wrap;
    }

    .preview-panel {
      position: sticky;
      top: 20px;
      display: grid;
      gap: 14px;
    }

    .preview-window {
      overflow: hidden;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface);
      box-shadow: var(--app-shadow);
    }

    .preview-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      background: linear-gradient(135deg, var(--app-table-header-start), var(--app-table-header-end));
      border-bottom: 1px solid #edf2f7;
      color: #374151;
      font-weight: 700;
    }

    .preview-body {
      display: grid;
      gap: 12px;
      padding: 14px;
      color: var(--app-text);
    }

    .preview-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid #edf2f7;
    }

    .preview-row:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }

    .preview-title {
      color: var(--app-table-name-color);
      font-family: var(--app-table-name-font);
      font-size: var(--app-table-name-size);
      font-weight: 700;
    }

    .preview-muted {
      color: var(--app-table-body-color);
      font-family: var(--app-table-body-font);
      font-size: var(--app-table-body-size);
    }

    .preview-badge {
      padding: 4px 9px;
      border-radius: 999px;
      background: var(--app-primary-soft);
      color: var(--app-primary-strong);
      font-family: var(--app-table-body-font);
      font-size: calc(var(--app-table-body-size) - 2px);
      font-weight: 700;
    }

    .preview-accent {
      color: var(--app-accent);
      font-weight: 800;
    }

    @media (max-width: 980px) {
      .settings-layout,
      .church-form,
      .church-details,
      .preset-grid,
      .quick-grid,
      .color-grid,
      .font-grid {
        grid-template-columns: 1fr;
      }

      .preview-panel {
        position: static;
      }

      .attendance-chart-row {
        grid-template-columns: 1fr;
        gap: 6px;
      }

      .attendance-chart-heading {
        align-items: flex-start;
        flex-direction: column;
      }

      .attendance-chart-value {
        text-align: left;
      }
    }
  `],
  template: `
    <main class="page">
      <header class="page-header">
        <div class="page-header-main">
          <h1 class="page-title page-title-offset">{{ language.language() === 'en' ? 'Settings' : 'Setări' }}</h1>
          <p class="page-subtitle" aria-hidden="true">&nbsp;</p>
        </div>
        <div class="page-header-actions">
          <app-page-nav />
        </div>
      </header>

      <div class="settings-tabs" role="tablist" [attr.aria-label]="text('Setări', 'Settings')">
        <button class="settings-tab" type="button" [class.active]="activeTab() === 'church'" (click)="activeTab.set('church')">
          <mat-icon>location_city</mat-icon>
          {{ text('Info. Biserică', 'Church info') }}
        </button>
        <button class="settings-tab" type="button" [class.active]="activeTab() === 'theme'" (click)="activeTab.set('theme')">
          <mat-icon>palette</mat-icon>
          {{ text('Culori și teme', 'Colors & themes') }}
        </button>
        <button class="settings-tab" type="button" [class.active]="activeTab() === 'tables'" (click)="activeTab.set('tables')">
          <mat-icon>table_chart</mat-icon>
          {{ text('Tabele', 'Tables') }}
        </button>
        <button class="settings-tab" type="button" [class.active]="activeTab() === 'eventsCalendar'" (click)="activeTab.set('eventsCalendar')">
          <mat-icon>event</mat-icon>
          {{ text('Evenimente și calendar', 'Events & calendar') }}
        </button>
        <button class="settings-tab" type="button" [class.active]="activeTab() === 'attendance'" (click)="activeTab.set('attendance')">
          <mat-icon>how_to_reg</mat-icon>
          {{ text('Prezență', 'Attendance') }}
        </button>
        <button class="settings-tab" type="button" [class.active]="activeTab() === 'plugins'" (click)="activeTab.set('plugins')">
          <mat-icon>extension</mat-icon>
          {{ text('Pluginuri', 'Plugins') }}
        </button>
      </div>

      @switch (activeTab()) {
        @case ('church') {
          <section class="surface">
            <div class="surface-header">
              <div>
                <h2 class="surface-title">{{ text('Biserică', 'Church') }}</h2>
                <p class="surface-kicker">{{ text('Numele și iconul folosite în bara browserului.', 'The name and icon used in the browser bar.') }}</p>
              </div>
            </div>
            <div class="surface-content">
              <div class="church-form">
                <div class="church-avatar-panel">
                  <div class="church-avatar">
                    @if (avatarPreviewUrl()) {
                      <img [src]="avatarPreviewUrl()!" alt="">
                    } @else {
                      <mat-icon>location_city</mat-icon>
                    }
                  </div>
                  <input #avatarInput type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden (change)="uploadChurchAvatar($event)">
                  <button class="toolbar-button toolbar-secondary-button" type="button" (click)="avatarInput.click()">
                    <mat-icon>upload</mat-icon>
                    {{ text('Încarcă', 'Upload') }}
                  </button>
                  <button class="toolbar-button toolbar-secondary-button" type="button" [disabled]="!church().avatarUrl" (click)="deleteChurchAvatar()">
                    <mat-icon>delete</mat-icon>
                    {{ text('Șterge icon', 'Delete icon') }}
                  </button>
                </div>

                <div class="church-fields">
                  <label class="settings-field">
                    <span>{{ text('Biserica activă', 'Active church') }}</span>
                    <select class="settings-input" [ngModel]="church().id" (ngModelChange)="selectChurch($event)">
                      @for (item of church().churches; track item.id) {
                        <option [ngValue]="item.id">{{ item.name }}</option>
                      }
                    </select>
                  </label>

                  @if (editingChurchInfo()) {
                    <label class="settings-field">
                      <span>{{ text('Numele bisericii', 'Church name') }}</span>
                      <input
                        class="settings-input"
                        type="text"
                        maxlength="120"
                        [ngModel]="church().name"
                        (ngModelChange)="changeChurchName($event)">
                    </label>

                    <label class="settings-field">
                      <span>{{ text('Pastor / responsabil', 'Pastor / leader') }}</span>
                      <input
                        class="settings-input"
                        type="text"
                        maxlength="160"
                        [ngModel]="church().pastorName || ''"
                        (ngModelChange)="changeChurchField('pastorName', $event)">
                    </label>

                    <label class="settings-field">
                      <span>{{ text('Confesiune', 'Denomination') }}</span>
                      <input
                        class="settings-input"
                        type="text"
                        maxlength="160"
                        [ngModel]="church().denomination || ''"
                        (ngModelChange)="changeChurchField('denomination', $event)">
                    </label>

                    <label class="settings-field">
                      <span>{{ text('Adresă', 'Address') }}</span>
                      <textarea
                        class="settings-input"
                        rows="3"
                        maxlength="600"
                        [ngModel]="church().address || ''"
                        (ngModelChange)="changeChurchField('address', $event)"></textarea>
                    </label>

                    <label class="settings-field">
                      <span>{{ text('Casier', 'Treasurer') }}</span>
                      <input
                        class="settings-input"
                        type="text"
                        maxlength="160"
                        [ngModel]="church().treasurerName || ''"
                        (ngModelChange)="changeChurchField('treasurerName', $event)">
                    </label>

                    <label class="settings-field">
                      <span>{{ text('Secretar', 'Secretary') }}</span>
                      <input
                        class="settings-input"
                        type="text"
                        maxlength="160"
                        [ngModel]="church().secretaryName || ''"
                        (ngModelChange)="changeChurchField('secretaryName', $event)">
                    </label>

                    <label class="settings-field">
                      <span>{{ text('Persoană de contact', 'Contact person') }}</span>
                      <input
                        class="settings-input"
                        type="text"
                        maxlength="160"
                        [ngModel]="church().contactPerson || ''"
                        (ngModelChange)="changeChurchField('contactPerson', $event)">
                    </label>
                  } @else {
                    <div class="church-details">
                      <div class="church-detail">
                        <span>{{ text('Nume', 'Name') }}</span>
                        <strong>{{ church().name || '-' }}</strong>
                      </div>
                      <div class="church-detail">
                        <span>{{ text('Pastor / responsabil', 'Pastor / leader') }}</span>
                        <strong>{{ church().pastorName || '-' }}</strong>
                      </div>
                      <div class="church-detail">
                        <span>{{ text('Confesiune', 'Denomination') }}</span>
                        <strong>{{ church().denomination || '-' }}</strong>
                      </div>
                      <div class="church-detail wide">
                        <span>{{ text('Adresă', 'Address') }}</span>
                        <strong>{{ church().address || '-' }}</strong>
                      </div>
                      <div class="church-detail">
                        <span>{{ text('Casier', 'Treasurer') }}</span>
                        <strong>{{ church().treasurerName || '-' }}</strong>
                      </div>
                      <div class="church-detail">
                        <span>{{ text('Secretar', 'Secretary') }}</span>
                        <strong>{{ church().secretaryName || '-' }}</strong>
                      </div>
                      <div class="church-detail wide">
                        <span>{{ text('Persoană de contact', 'Contact person') }}</span>
                        <strong>{{ church().contactPerson || '-' }}</strong>
                      </div>
                    </div>
                  }

                  <div class="church-actions">
                    <button class="toolbar-button toolbar-secondary-button" type="button" (click)="createChurch()">
                      <mat-icon>add</mat-icon>
                      {{ text('Adaugă biserică', 'Add church') }}
                    </button>
                    @if (editingChurchInfo()) {
                      <button class="toolbar-button toolbar-secondary-button" type="button" (click)="cancelChurchEdit()">
                        <mat-icon>close</mat-icon>
                        {{ text('Anulează', 'Cancel') }}
                      </button>
                      <button class="toolbar-button toolbar-primary-button" type="button" (click)="saveChurch()">
                        <mat-icon>save</mat-icon>
                        {{ text('Salvează biserica', 'Save church') }}
                      </button>
                    } @else {
                      <button class="toolbar-button toolbar-primary-button" type="button" (click)="editingChurchInfo.set(true)">
                        <mat-icon>edit</mat-icon>
                        {{ text('Editează', 'Edit') }}
                      </button>
                    }
                    @if (church().id !== 1) {
                      <button class="toolbar-button toolbar-danger-button" type="button" (click)="deleteChurch()">
                        <mat-icon>delete_forever</mat-icon>
                        {{ text('Șterge biserica', 'Delete church') }}
                      </button>
                    }
                  </div>
                </div>
              </div>
            </div>
          </section>
        }

        @case ('theme') {
          <section class="settings-layout">
            <div class="settings-section">
              <section class="surface">
                <div class="surface-header">
                  <div>
                    <h2 class="surface-title">{{ text('Preseturi', 'Presets') }}</h2>
                    <p class="surface-kicker">{{ text('Aplică rapid o paletă completă.', 'Quickly apply a complete palette.') }}</p>
                  </div>
                </div>
                <div class="surface-content">
                  <div class="preset-grid">
                    @for (preset of presets; track preset.id) {
                      <button
                        class="preset-card"
                        type="button"
                        [class.selected]="selectedPreset() === preset.id"
                        (click)="applyPreset(preset.id)">
                        <span class="preset-preview">
                          <span [style.background]="preset.theme.primary"></span>
                          <span [style.background]="preset.theme.primaryStrong"></span>
                          <span [style.background]="preset.theme.accent"></span>
                          <span [style.background]="preset.theme.tableHeaderStart"></span>
                          <span [style.background]="preset.theme.backgroundEnd"></span>
                        </span>
                        <span class="preset-copy">
                          <strong>{{ presetLabel(preset.name) }}</strong>
                          <span>{{ presetDescription(preset.description) }}</span>
                        </span>
                      </button>
                    }
                  </div>
                </div>
              </section>

              <section class="surface">
                <div class="surface-header">
                  <div>
                    <h2 class="surface-title">{{ text('Culori principale', 'Primary colors') }}</h2>
                    <p class="surface-kicker">{{ text('Setările folosite cel mai des.', 'The settings used most often.') }}</p>
                  </div>
                </div>
                <div class="surface-content">
                  <div class="quick-grid">
                    @for (field of quickColorFields; track field.key) {
                      <label class="color-field compact">
                        <input
                          type="color"
                          [ngModel]="theme()[field.key]"
                          (ngModelChange)="changeColor(field.key, $event)" />
                        <span>{{ fieldLabel(field) }}</span>
                      </label>
                    }
                  </div>

                  <details class="advanced-panel">
                    <summary>{{ text('Culori avansate', 'Advanced colors') }}</summary>
                    <div class="advanced-content">
                      <div class="color-grid">
                        @for (field of advancedColorFields; track field.key) {
                          <label class="color-field">
                            <input
                              type="color"
                              [ngModel]="theme()[field.key]"
                              (ngModelChange)="changeColor(field.key, $event)" />
                            <span>{{ fieldLabel(field) }}</span>
                            <input
                              class="hex-input"
                              maxlength="7"
                              [ngModel]="theme()[field.key]"
                              (ngModelChange)="changeColor(field.key, $event)" />
                          </label>
                        }
                      </div>
                    </div>
                  </details>
                </div>
              </section>

              <section class="surface">
                <div class="surface-header">
                  <div>
                    <h2 class="surface-title">{{ text('Tabele', 'Tables') }}</h2>
                    <p class="surface-kicker">{{ text('Font și dimensiune pentru nume și restul rândului.', 'Font and size for the name and the rest of the row.') }}</p>
                  </div>
                </div>
                <div class="surface-content">
                  <div class="font-grid">
                    <label class="font-field">
                      <span>{{ text('Label coloane', 'Column labels') }}</span>
                      <div class="size-control">
                        <input
                          type="range"
                          min="10"
                          max="24"
                          step="0.5"
                          [ngModel]="theme().tableHeaderFontSize"
                          (ngModelChange)="changeFontSize('tableHeaderFontSize', $event)" />
                        <input
                          type="number"
                          min="10"
                          max="24"
                          step="0.5"
                          [ngModel]="theme().tableHeaderFontSize"
                          (ngModelChange)="changeFontSize('tableHeaderFontSize', $event)" />
                      </div>
                      <small class="font-sample" [style.font-size.px]="theme().tableHeaderFontSize">
                        Nume · Tip · Telefon
                      </small>
                    </label>

                    <label class="font-field">
                      <span>{{ text('Prioritate evenimente', 'Event priority') }}</span>
                      <select
                        [ngModel]="theme().tablePriorityDisplay"
                        (ngModelChange)="changeTablePriorityDisplay($event)">
                        <option value="label">Label</option>
                        <option value="stars">{{ text('Steluțe', 'Stars') }}</option>
                      </select>
                      <small class="font-sample">
                        {{ text('Alege cum apare prioritatea în tabelul de evenimente.', 'Choose how priority appears in the events table.') }}
                      </small>
                    </label>

                    <label class="font-field">
                      <span>{{ text('Rânduri implicite', 'Default rows') }}</span>
                      <select
                        [ngModel]="tablePageSize()"
                        (ngModelChange)="changeTablePageSize($event)">
                        @for (option of tablePageSizeOptions(); track option) {
                          <option [ngValue]="option">{{ option }} {{ text('rânduri', 'rows') }}</option>
                        }
                      </select>
                      <div class="size-control">
                        <input
                          type="range"
                          min="1"
                          max="100"
                          step="1"
                          [ngModel]="tablePageSize()"
                          (ngModelChange)="changeTablePageSize($event)" />
                        <input
                          type="number"
                          min="1"
                          max="500"
                          step="1"
                          [ngModel]="tablePageSize()"
                          (ngModelChange)="changeTablePageSize($event)" />
                      </div>
                      <small class="font-sample">
                        {{ text('Poți alege un preset sau introduce o valoare între 1 și 500.', 'Choose a preset or enter a value between 1 and 500.') }}
                      </small>
                    </label>

                    <label class="font-field">
                      <span>{{ text('Nume', 'Name') }}</span>
                      <select
                        [ngModel]="theme().tableNameFontFamily"
                        (ngModelChange)="changeFont('tableNameFontFamily', $event)">
                        @for (font of fontOptions; track font.value) {
                          <option [value]="font.value">{{ fontLabel(font) }}</option>
                        }
                      </select>
                      <div class="font-color-control">
                        <input
                          type="color"
                          [ngModel]="theme().tableNameColor"
                          (ngModelChange)="changeColor('tableNameColor', $event)" />
                        <span>{{ text('Culoare', 'Color') }}</span>
                        <input
                          class="hex-input"
                          maxlength="7"
                          [ngModel]="theme().tableNameColor"
                          (ngModelChange)="changeColor('tableNameColor', $event)" />
                      </div>
                      <div class="size-control">
                        <input
                          type="range"
                          min="10"
                          max="24"
                          step="0.5"
                          [ngModel]="theme().tableNameFontSize"
                          (ngModelChange)="changeFontSize('tableNameFontSize', $event)" />
                        <input
                          type="number"
                          min="10"
                          max="24"
                          step="0.5"
                          [ngModel]="theme().tableNameFontSize"
                          (ngModelChange)="changeFontSize('tableNameFontSize', $event)" />
                      </div>
                      <small
                        class="font-sample"
                        [style.color]="theme().tableNameColor"
                        [style.font-family]="fontStack(theme().tableNameFontFamily)">
                        Daniel Cerna
                      </small>
                    </label>

                    <label class="font-field">
                      <span>{{ text('Rest rând', 'Row body') }}</span>
                      <select
                        [ngModel]="theme().tableBodyFontFamily"
                        (ngModelChange)="changeFont('tableBodyFontFamily', $event)">
                        @for (font of fontOptions; track font.value) {
                          <option [value]="font.value">{{ fontLabel(font) }}</option>
                        }
                      </select>
                      <div class="font-color-control">
                        <input
                          type="color"
                          [ngModel]="theme().tableBodyColor"
                          (ngModelChange)="changeColor('tableBodyColor', $event)" />
                        <span>{{ text('Culoare', 'Color') }}</span>
                        <input
                          class="hex-input"
                          maxlength="7"
                          [ngModel]="theme().tableBodyColor"
                          (ngModelChange)="changeColor('tableBodyColor', $event)" />
                      </div>
                      <div class="size-control">
                        <input
                          type="range"
                          min="10"
                          max="24"
                          step="0.5"
                          [ngModel]="theme().tableBodyFontSize"
                          (ngModelChange)="changeFontSize('tableBodyFontSize', $event)" />
                        <input
                          type="number"
                          min="10"
                          max="24"
                          step="0.5"
                          [ngModel]="theme().tableBodyFontSize"
                          (ngModelChange)="changeFontSize('tableBodyFontSize', $event)" />
                      </div>
                      <small
                        class="font-sample"
                        [style.color]="theme().tableBodyColor"
                        [style.font-family]="fontStack(theme().tableBodyFontFamily)">
                        membru activ · planificat
                      </small>
                    </label>
                  </div>
                </div>
              </section>

              <section class="surface">
                <div class="surface-header">
                  <div>
                    <h2 class="surface-title">{{ text('Calendar', 'Calendar') }}</h2>
                    <p class="surface-kicker">{{ text('Font, culoare și dimensiune pentru textul evenimentelor.', 'Font, color and size for event text.') }}</p>
                  </div>
                </div>
                <div class="surface-content">
                  <div class="font-grid">
                    <label class="font-field">
                      <span>{{ text('Layout', 'Layout') }}</span>
                      <select
                        [ngModel]="theme().calendarLayout"
                        (ngModelChange)="changeCalendarLayout($event)">
                        <option value="large">{{ text('Calendar mare', 'Large calendar') }}</option>
                        <option value="default">Default</option>
                      </select>
                      <small class="font-sample">
                        {{ text('Large păstrează calendarul lat. Default aliniază pagina cu restul aplicației.', 'Large keeps the calendar wide. Default aligns the page with the rest of the app.') }}
                      </small>
                    </label>

                    <label class="font-field">
                      <span>{{ text('Evenimente', 'Events') }}</span>
                      <select
                        [ngModel]="theme().calendarEventFontFamily"
                        (ngModelChange)="changeFont('calendarEventFontFamily', $event)">
                        @for (font of fontOptions; track font.value) {
                          <option [value]="font.value">{{ fontLabel(font) }}</option>
                        }
                      </select>
                      <div class="font-color-control">
                        <input
                          type="color"
                          [ngModel]="theme().calendarEventColor"
                          (ngModelChange)="changeColor('calendarEventColor', $event)" />
                        <span>{{ text('Culoare', 'Color') }}</span>
                        <input
                          class="hex-input"
                          maxlength="7"
                          [ngModel]="theme().calendarEventColor"
                          (ngModelChange)="changeColor('calendarEventColor', $event)" />
                      </div>
                      <div class="size-control">
                        <input
                          type="range"
                          min="10"
                          max="24"
                          step="0.5"
                          [ngModel]="theme().calendarEventFontSize"
                          (ngModelChange)="changeFontSize('calendarEventFontSize', $event)" />
                        <input
                          type="number"
                          min="10"
                          max="24"
                          step="0.5"
                          [ngModel]="theme().calendarEventFontSize"
                          (ngModelChange)="changeFontSize('calendarEventFontSize', $event)" />
                      </div>
                      <div class="font-style-control">
                        <label class="settings-toggle">
                          <input
                            type="checkbox"
                            [ngModel]="theme().calendarEventBold === 'true'"
                            (ngModelChange)="changeToggle('calendarEventBold', $event)" />
                          <span>Bold</span>
                        </label>
                        <label class="settings-toggle">
                          <input
                            type="checkbox"
                            [ngModel]="theme().calendarEventItalic === 'true'"
                            (ngModelChange)="changeToggle('calendarEventItalic', $event)" />
                          <span>{{ text('Înclinat', 'Italic') }}</span>
                        </label>
                      </div>
                      <small
                        class="font-sample"
                        [style.color]="theme().calendarEventColor"
                        [style.font-family]="fontStack(theme().calendarEventFontFamily)"
                        [style.font-size.px]="theme().calendarEventFontSize"
                        [style.font-weight]="theme().calendarEventBold === 'true' ? 600 : 400"
                        [style.font-style]="theme().calendarEventItalic === 'true' ? 'italic' : 'normal'">
                        {{ text('Întâlnire grup · 18:30', 'Group meeting · 18:30') }}
                      </small>
                    </label>
                  </div>
                </div>
              </section>

              <div class="settings-actions">
                <button class="toolbar-button toolbar-secondary-button" type="button" (click)="reload()">
                  <mat-icon>refresh</mat-icon>
                  {{ text('Reîncarcă', 'Reload') }}
                </button>
                <button class="toolbar-button toolbar-secondary-button" type="button" (click)="reset()">
                  <mat-icon>restart_alt</mat-icon>
                  {{ text('Resetare', 'Reset') }}
                </button>
                <button class="toolbar-button toolbar-primary-button" type="button" (click)="save()">
                  <mat-icon>save</mat-icon>
                  {{ text('Salvează', 'Save') }}
                </button>
              </div>
            </div>

            <aside class="preview-panel">
              <section class="preview-window">
                <div class="preview-top">
                  <span>{{ text('Preview tabel', 'Table preview') }}</span>
                  <span class="preview-accent">12</span>
                </div>
                <div class="preview-body">
                  <div class="preview-row">
                    <div>
                      <div class="preview-title">Daniel Cerna</div>
                      <div class="preview-muted">{{ text('membru activ', 'active member') }}</div>
                    </div>
                    <span class="preview-badge">{{ text('planificat', 'planned') }}</span>
                  </div>
                  <div class="preview-row">
                    <div>
                      <div class="preview-title">{{ text('Întâlnire grup', 'Group meeting') }}</div>
                      <div class="preview-muted">{{ text('calendar luna curentă', 'current month calendar') }}</div>
                    </div>
                    <span class="preview-badge">{{ text('info', 'info') }}</span>
                  </div>
                </div>
              </section>
            </aside>
          </section>
        }

        @case ('tables') {
          <section class="surface">
            <div class="surface-header">
              <div>
                <h2 class="surface-title">{{ text('Tabele afișate', 'Displayed tables') }}</h2>
                <p class="surface-kicker">{{ text('Alege modulele afișate în meniu și ordinea lor.', 'Choose the modules shown in the menu and their order.') }}</p>
              </div>
            </div>
            <div class="surface-content">
              <div class="font-grid">
                <label class="font-field">
                  <span>{{ text('Rânduri implicite', 'Default rows') }}</span>
                  <select
                    [ngModel]="tablePageSize()"
                    (ngModelChange)="changeTablePageSize($event)">
                    @for (option of tablePageSizeOptions(); track option) {
                      <option [ngValue]="option">{{ option }} {{ text('rânduri', 'rows') }}</option>
                    }
                  </select>
                  <div class="size-control">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      [ngModel]="tablePageSize()"
                      (ngModelChange)="changeTablePageSize($event)" />
                    <input
                      type="number"
                      min="1"
                      max="500"
                      step="1"
                      [ngModel]="tablePageSize()"
                      (ngModelChange)="changeTablePageSize($event)" />
                  </div>
                  <small class="font-sample">
                    {{ text('Valoarea este salvată în backend și folosită de tabelele cu paginare.', 'The value is saved in the backend and used by paginated tables.') }}
                  </small>
                </label>

                <div class="font-field">
                  <span>{{ text('Ordine și vizibilitate', 'Order and visibility') }}</span>
                  <div class="table-layout-list">
                    @for (table of orderedTableItems(); track table.id) {
                      <div class="table-layout-row">
                        <label class="table-layout-toggle">
                          <input
                            type="checkbox"
                            [checked]="isTableVisible(table.id)"
                            [disabled]="table.disabled || isLastVisibleTable(table.id)"
                            [title]="table.disabled ? language.t('common.inProgress') : ''"
                            (change)="toggleTable(table.id, $any($event.target).checked)" />
                          <mat-icon>{{ table.icon }}</mat-icon>
                          <span>{{ language.tableLabel(table.id, table.label) }}</span>
                        </label>
                        <button
                          class="table-layout-button"
                          type="button"
                          [attr.aria-label]="text('Mută tabelul mai sus', 'Move table up')"
                          [disabled]="!canMoveTable(table.id, -1)"
                          (click)="moveTable(table.id, -1)">
                          <mat-icon>keyboard_arrow_up</mat-icon>
                        </button>
                        <button
                          class="table-layout-button"
                          type="button"
                          [attr.aria-label]="text('Mută tabelul mai jos', 'Move table down')"
                          [disabled]="!canMoveTable(table.id, 1)"
                          (click)="moveTable(table.id, 1)">
                          <mat-icon>keyboard_arrow_down</mat-icon>
                        </button>
                      </div>
                    }
                  </div>
                  <small class="font-sample">
                    {{ text('Cel puțin un tabel rămâne vizibil.', 'At least one table remains visible.') }}
                  </small>
                </div>
              </div>
            </div>
          </section>

          <div class="settings-actions">
            <button class="toolbar-button toolbar-secondary-button" type="button" (click)="reloadTableLayout()">
              <mat-icon>refresh</mat-icon>
              {{ text('Reîncarcă', 'Reload') }}
            </button>
            <button class="toolbar-button toolbar-primary-button" type="button" (click)="saveTableLayout()">
              <mat-icon>save</mat-icon>
              {{ text('Salvează tabele', 'Save tables') }}
            </button>
          </div>
        }

        @case ('eventsCalendar') {
          <section class="surface">
            <div class="surface-header">
              <div>
                <h2 class="surface-title">{{ text('Evenimente și calendar', 'Events and calendar') }}</h2>
                <p class="surface-kicker">{{ text('Culori comune pentru statusurile evenimentelor.', 'Shared colors for event statuses.') }}</p>
              </div>
            </div>
            <div class="surface-content">
              <div class="font-grid">
                <label class="font-field">
                  <span>{{ text('Calendar colorează după', 'Calendar colors by') }}</span>
                  <select
                    [ngModel]="theme().calendarEventColorMode"
                    (ngModelChange)="changeCalendarEventColorMode($event)">
                    <option value="status">{{ text('Status', 'Status') }}</option>
                    <option value="type">{{ text('Tip', 'Type') }}</option>
                  </select>
                  <small class="font-sample">
                    {{ text('Alege dacă evenimentele din calendar folosesc culorile de status sau de tip.', 'Choose whether calendar events use status or type colors.') }}
                  </small>
                </label>
                <label class="font-field">
                  <span>{{ text('Zile de naștere', 'Birthdays') }}</span>
                  <label class="settings-toggle">
                    <input
                      type="checkbox"
                      [ngModel]="theme().calendarBirthdaysEnabled === 'true'"
                      (ngModelChange)="changeCalendarBirthdaysEnabled($event)" />
                    <span>{{ text('Afișează în calendar ziua de naștere a persoanelor', 'Show people’s birthdays in the calendar') }}</span>
                  </label>
                  <label class="settings-toggle">
                    <input
                      type="checkbox"
                      [ngModel]="theme().birthdayNotificationsEnabled === 'true'"
                      (ngModelChange)="changeBirthdayNotificationsEnabled($event)" />
                    <span>{{ text('Afișează notificări la pornirea aplicației', 'Show notifications when the app starts') }}</span>
                  </label>
                  <input
                    class="settings-input"
                    type="number"
                    min="0"
                    max="90"
                    step="1"
                    [disabled]="theme().birthdayNotificationsEnabled !== 'true'"
                    [ngModel]="theme().birthdayNotificationDaysBefore"
                    (ngModelChange)="changeBirthdayNotificationDaysBefore($event)" />
                  <small class="font-sample">
                    {{ text('Calendarul afișează persoanele cu data nașterii completată. Notificările apar după login sau când intri pe pagina Persoane, pentru intervalul ales.', 'The calendar shows people with a birth date. Notifications appear after login or when you open the People page, for the selected interval.') }}
                  </small>
                </label>
                <label class="font-field">
                  <span>{{ text('Căutare', 'Search') }}</span>
                  <label class="settings-toggle">
                    <input
                      type="checkbox"
                      [ngModel]="theme().searchIgnoreDiacritics === 'true'"
                      (ngModelChange)="changeSearchIgnoreDiacritics($event)" />
                    <span>{{ text('Ignoră diacriticele la căutare', 'Ignore diacritics when searching') }}</span>
                  </label>
                  <small class="font-sample">
                    {{ text('Când este activ, „a” găsește și „ă”, iar „i” găsește și „î”.', 'When enabled, “a” also matches “ă”, and “i” also matches “î”.') }}
                  </small>
                </label>
              </div>

              <div class="event-color-section">
                <div class="event-color-section-header">
                  <h3>Status</h3>
                  <span>{{ text('Planificat, activ, finalizat, anulat', 'Planned, active, completed, canceled') }}</span>
                </div>
                <div class="color-grid">
                  @for (field of eventStatusColorFields; track field.key) {
                    <label class="color-field">
                      <input
                        type="color"
                        [ngModel]="theme()[field.key]"
                        (ngModelChange)="changeColor(field.key, $event)" />
                          <span>{{ fieldLabel(field) }}</span>
                      <input
                        class="hex-input"
                        maxlength="7"
                        [ngModel]="theme()[field.key]"
                        (ngModelChange)="changeColor(field.key, $event)" />
                    </label>
                  }
                </div>
              </div>

              <div class="event-color-section">
                <div class="event-color-section-header">
                  <h3>Tip</h3>
                  <span>{{ text('Părtășie, catch up, administrare și celelalte tipuri', 'Fellowship, catch-up, administration and other types') }}</span>
                </div>
                <div class="color-grid">
                  @for (field of eventTypeColorFields; track field.key) {
                    <label class="color-field">
                      <input
                        type="color"
                        [ngModel]="theme()[field.key]"
                        (ngModelChange)="changeColor(field.key, $event)" />
                      <span>{{ fieldLabel(field) }}</span>
                      <input
                        class="hex-input"
                        maxlength="7"
                        [ngModel]="theme()[field.key]"
                        (ngModelChange)="changeColor(field.key, $event)" />
                    </label>
                  }
                </div>
              </div>

              <div class="event-color-section">
                <div class="event-color-section-header">
                  <h3>Prioritate</h3>
                  <span>{{ text('Scăzută, normală, ridicată, foarte ridicată, urgentă', 'Low, normal, high, very high, urgent') }}</span>
                </div>
                <div class="color-grid">
                  @for (field of priorityColorFields; track field.key) {
                    <label class="color-field">
                      <input
                        type="color"
                        [ngModel]="theme()[field.key]"
                        (ngModelChange)="changeColor(field.key, $event)" />
                      <span>{{ fieldLabel(field) }}</span>
                      <input
                        class="hex-input"
                        maxlength="7"
                        [ngModel]="theme()[field.key]"
                        (ngModelChange)="changeColor(field.key, $event)" />
                    </label>
                  }
                </div>
              </div>
            </div>
          </section>

          <div class="settings-actions">
            <button class="toolbar-button toolbar-secondary-button" type="button" (click)="reload()">
              <mat-icon>refresh</mat-icon>
              {{ text('Reîncarcă', 'Reload') }}
            </button>
            <button class="toolbar-button toolbar-secondary-button" type="button" (click)="reset()">
              <mat-icon>restart_alt</mat-icon>
              {{ text('Resetare', 'Reset') }}
            </button>
            <button class="toolbar-button toolbar-primary-button" type="button" (click)="save()">
              <mat-icon>save</mat-icon>
              {{ text('Salvează', 'Save') }}
            </button>
          </div>
        }

        @case ('attendance') {
          <section class="surface">
            <div class="surface-header">
              <div>
                <h2 class="surface-title">{{ text('Grafic prezență', 'Attendance chart') }}</h2>
                <p class="surface-kicker">{{ attendanceChartSubtitle() }}</p>
              </div>
              <div class="church-actions">
                <span class="attendance-chart-switch" role="group" [attr.aria-label]="text('Tip grafic prezență', 'Chart type')">
                  <button type="button" [class.active]="attendanceChartMode() === 'individual'" (click)="attendanceChartMode.set('individual')">{{ text('Persoane', 'People') }}</button>
                  <button type="button" [class.active]="attendanceChartMode() === 'church'" (click)="attendanceChartMode.set('church')">{{ text('Biserică', 'Church') }}</button>
                </span>
                <button class="toolbar-button toolbar-secondary-button" type="button" [disabled]="attendanceChartLoading()" (click)="loadAttendanceChart()">
                  <mat-icon>refresh</mat-icon>
                  {{ text('Reîncarcă', 'Reload') }}
                </button>
              </div>
            </div>
            <div class="surface-content">
              @if (!church().attendanceEnabled) {
                <div class="empty-state">
                  <mat-icon>how_to_reg</mat-icon>
                  <span>{{ text('Prezența este dezactivată pentru biserica activă.', 'Attendance is disabled for the active church.') }}</span>
                </div>
              } @else if (attendanceChartLoading()) {
                <div class="empty-state">
                  <mat-icon>hourglass_empty</mat-icon>
                  <span>{{ text('Se încarcă statisticile de prezență.', 'Loading attendance statistics.') }}</span>
                </div>
              } @else if (attendanceChartError()) {
                <div class="empty-state">
                  <mat-icon>error_outline</mat-icon>
                  <span>{{ attendanceChartError() }}</span>
                </div>
              } @else if (attendanceChartMode() === 'individual' && attendanceChartRows().length > 0) {
                <div class="attendance-chart-heading">
                  <strong>{{ text('Prezență pe persoane', 'Attendance by person') }}</strong>
                  <span>{{ attendanceChartRows().length }} {{ text('persoane afișate', 'people shown') }}</span>
                </div>
                <div class="attendance-chart" [attr.aria-label]="text('Prezență persoane', 'People attendance')">
                  @for (row of attendanceChartRows(); track row.personId) {
                    <div class="attendance-chart-row">
                      <span class="attendance-chart-name" [title]="row.name">{{ row.name }}</span>
                      <span class="attendance-chart-track" aria-hidden="true">
                        <span class="attendance-chart-fill" [style.width.%]="row.percent"></span>
                      </span>
                      <span class="attendance-chart-value">{{ row.percent }}% · {{ row.presentCount }}/{{ row.totalMeetings }}</span>
                    </div>
                  }
                </div>
              } @else if (attendanceChartMode() === 'church' && attendanceChurchChartRows().length > 0) {
                <div class="attendance-chart-heading">
                  <strong>{{ text('Prezență total biserică', 'Total church attendance') }}</strong>
                  <span>{{ attendanceChurchChartRows().length }} {{ text('întâlniri afișate', 'meetings shown') }}</span>
                </div>
                <div class="attendance-chart" [attr.aria-label]="text('Prezență total biserică', 'Total church attendance')">
                  @for (row of attendanceChurchChartRows(); track row.id) {
                    <div class="attendance-chart-row">
                      <span class="attendance-chart-name" [title]="row.label">{{ row.label }}</span>
                      <span class="attendance-chart-track" aria-hidden="true">
                        <span class="attendance-chart-fill" [style.width.%]="row.percent"></span>
                      </span>
                      <span class="attendance-chart-value">{{ row.percent }}% · {{ row.presentCount }}/{{ row.totalCount }}</span>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state">
                  <mat-icon>bar_chart</mat-icon>
                  <span>{{ text('Nu există încă întâlniri de prezență pentru grafic.', 'There are no attendance meetings for the chart yet.') }}</span>
                </div>
              }
            </div>
          </section>
        }

        @case ('plugins') {
          <section class="surface">
            <div class="surface-header">
              <div>
                <h2 class="surface-title">{{ text('Pluginuri', 'Plugins') }}</h2>
                <p class="surface-kicker">{{ text('Module opționale activate în aplicație.', 'Optional modules enabled in the app.') }}</p>
              </div>
            </div>
            <div class="surface-content">
              <div class="church-fields">
                <label class="settings-toggle">
                  <input
                    type="checkbox"
                    [ngModel]="church().attendanceEnabled"
                    (ngModelChange)="changeAttendanceEnabled($event)">
                  <span>{{ text('Folosește prezența', 'Use attendance') }}</span>
                </label>
                <div class="church-actions">
                  <button class="toolbar-button toolbar-primary-button" type="button" (click)="saveChurch()">
                    <mat-icon>save</mat-icon>
                    {{ text('Salvează pluginuri', 'Save plugins') }}
                  </button>
                </div>
              </div>
            </div>
          </section>
        }

      }
    </main>
  `
})
export class SettingsComponent implements OnInit {
  language = inject(LanguageService);
  private readonly themeService = inject(AppearanceThemeService);
  private readonly churchSettingsService = inject(ChurchSettingsService);
  private readonly tablePreferencesService = inject(TablePreferencesService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  presets = APPEARANCE_PRESETS;
  selectedPreset = signal<string | null>('classic-blue');
  theme = signal<AppearanceTheme>(this.themeService.current());
  church = signal<ChurchSettings>(this.churchSettingsService.settings());
  tablePageSize = this.tablePreferencesService.pageSize;
  tablePageSizeOptions = this.tablePreferencesService.pageSizeOptions;
  tableVisible = signal<string[]>(this.tablePreferencesService.visibleTables());
  tableOrder = signal<string[]>(this.tablePreferencesService.tableOrder());
  activeTab = signal<'church' | 'theme' | 'tables' | 'eventsCalendar' | 'attendance' | 'plugins'>('church');
  editingChurchInfo = signal(false);
  attendanceChartMode = signal<'individual' | 'church'>('individual');
  attendanceChartRows = signal<AttendanceChartRow[]>([]);
  attendanceChurchChartRows = signal<AttendanceChurchChartRow[]>([]);
  attendanceChartLoading = signal(false);
  attendanceChartError = signal<string | null>(null);

  text(ro: string, en: string): string {
    return this.language.language() === 'en' ? en : ro;
  }

  fieldLabel(field: ColorField): string {
    const labels: Record<string, [string, string]> = {
      backgroundStart: ['Fundal sus', 'Top background'],
      backgroundMiddle: ['Fundal mijloc', 'Middle background'],
      backgroundEnd: ['Fundal pagină', 'Page background'],
      surface: ['Suprafață', 'Surface'],
      surfaceMuted: ['Suprafață discretă', 'Muted surface'],
      border: ['Borduri', 'Borders'],
      text: ['Text principal', 'Primary text'],
      muted: ['Text secundar', 'Secondary text'],
      primary: ['Primary', 'Primary'],
      primaryStrong: ['Primary intens', 'Strong primary'],
      primarySoft: ['Primary soft', 'Soft primary'],
      accent: ['Accent', 'Accent'],
      info: ['Info', 'Info'],
      danger: ['Danger', 'Danger'],
      toolbarBackground: ['Fundal butoane', 'Button background'],
      tableHeaderStart: ['Header tabel', 'Table header'],
      tableHeaderEnd: ['Header tabel final', 'Table header end'],
      tableNameColor: ['Nume tabel', 'Table name'],
      tableBodyColor: ['Rest rând', 'Row body'],
      eventStatusPlannedColor: ['Planificat', 'Planned'],
      eventStatusActiveColor: ['Activ', 'Active'],
      eventStatusDoneColor: ['Finalizat', 'Completed'],
      eventStatusCanceledColor: ['Anulat', 'Canceled'],
      eventTypeServiceColor: ['Părtășie', 'Fellowship'],
      eventTypeMeetingColor: ['Catch up', 'Catch-up'],
      eventTypeStudyColor: ['Studiu', 'Study'],
      eventTypeAdministrationColor: ['Administrare', 'Administration'],
      eventTypeMaintenanceColor: ['Întreținere', 'Maintenance'],
      eventTypeSocialMediaPublishingColor: ['Publicare rețele sociale', 'Social media publishing'],
      eventTypeRenovationColor: ['Renovare', 'Renovation'],
      eventTypeEventColor: ['Eveniment', 'Event'],
      eventTypeActDeCultColor: ['Act de cult', 'Worship service'],
      eventTypeEvangelismColor: ['Evanghelizare', 'Evangelism'],
      eventTypeFuneralColor: ['Înmormântare', 'Funeral'],
      eventTypeItColor: ['IT', 'IT'],
      eventTypeMusicColor: ['Muzică', 'Music'],
      eventTypeOtherColor: ['Alt tip', 'Other type'],
      priorityLowColor: ['Scăzută', 'Low'],
      priorityMediumLowColor: ['Normală', 'Normal'],
      priorityMediumColor: ['Ridicată', 'High'],
      priorityHighMediumColor: ['Foarte ridicată', 'Very high'],
      priorityHighColor: ['Urgentă', 'Urgent']
    };
    const label = labels[String(field.key)];
    return label ? this.text(label[0], label[1]) : field.label;
  }

  fontLabel(font: FontOption): string {
    return font.value === 'serif' ? this.text('Serif clasic', 'Classic serif') : font.label;
  }

  presetLabel(value: string): string {
    const labels: Record<string, [string, string]> = {
      'Clasic albastru': ['Clasic albastru', 'Classic blue'],
      Forest: ['Forest', 'Forest'],
      'Violet soft': ['Violet soft', 'Soft violet']
    };
    const label = labels[value];
    return label ? this.text(label[0], label[1]) : value;
  }

  presetDescription(value: string): string {
    const descriptions: Record<string, [string, string]> = {
      'Apropiat de template-ul vechi.': ['Apropiat de template-ul vechi.', 'Close to the previous template.'],
      'Verde discret, potrivit pentru administrare.': ['Verde discret, potrivit pentru administrare.', 'A subtle green theme suited to administration.'],
      'Rece, modern, cu accente violet.': ['Rece, modern, cu accente violet.', 'Cool and modern, with violet accents.']
    };
    const description = descriptions[value];
    return description ? this.text(description[0], description[1]) : value;
  }

  fontOptions: FontOption[] = [
    {
      value: 'inter',
      label: 'Inter',
      sample: 'Inter, system-ui, -apple-system, sans-serif'
    },
    {
      value: 'system',
      label: 'System UI',
      sample: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    },
    {
      value: 'roboto',
      label: 'Roboto',
      sample: 'Roboto, "Helvetica Neue", Arial, sans-serif'
    },
    {
      value: 'segoe',
      label: 'Segoe UI',
      sample: '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
    },
    {
      value: 'arial',
      label: 'Arial',
      sample: 'Arial, Helvetica, sans-serif'
    },
    {
      value: 'georgia',
      label: 'Georgia',
      sample: 'Georgia, "Times New Roman", serif'
    },
    {
      value: 'serif',
      label: 'Serif clasic',
      sample: '"Times New Roman", Times, serif'
    },
    {
      value: 'garamond',
      label: 'Garamond',
      sample: 'Garamond, Georgia, "Times New Roman", serif'
    },
    {
      value: 'mono',
      label: 'Mono',
      sample: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    }
  ];

  quickColorFields: ColorField[] = [
    { key: 'backgroundEnd', label: 'Fundal pagină' },
    { key: 'primary', label: 'Primary' },
    { key: 'accent', label: 'Accent' },
    { key: 'toolbarBackground', label: 'Fundal butoane' },
    { key: 'tableHeaderStart', label: 'Header tabel' },
    { key: 'tableNameColor', label: 'Nume tabel' },
    { key: 'tableBodyColor', label: 'Rest rând' }
  ];

  advancedColorFields: ColorField[] = [
    { key: 'backgroundStart', label: 'Fundal sus' },
    { key: 'backgroundMiddle', label: 'Fundal mijloc' },
    { key: 'backgroundEnd', label: 'Fundal pagină' },
    { key: 'surface', label: 'Suprafață' },
    { key: 'surfaceMuted', label: 'Suprafață discretă' },
    { key: 'border', label: 'Borduri' },
    { key: 'text', label: 'Text principal' },
    { key: 'muted', label: 'Text secundar' },
    { key: 'primaryStrong', label: 'Primary intens' },
    { key: 'primarySoft', label: 'Primary soft' },
    { key: 'info', label: 'Info' },
    { key: 'danger', label: 'Danger' },
    { key: 'tableHeaderStart', label: 'Header tabel start' },
    { key: 'tableHeaderEnd', label: 'Header tabel final' }
  ];

  eventStatusColorFields: ColorField[] = [
    { key: 'eventStatusPlannedColor', label: 'Planificat' },
    { key: 'eventStatusActiveColor', label: 'Activ' },
    { key: 'eventStatusDoneColor', label: 'Finalizat' },
    { key: 'eventStatusCanceledColor', label: 'Anulat' }
  ];

  eventTypeColorFields: ColorField[] = [
    { key: 'eventTypeServiceColor', label: 'Părtășie' },
    { key: 'eventTypeMeetingColor', label: 'Catch up' },
    { key: 'eventTypeStudyColor', label: 'Studiu' },
    { key: 'eventTypeAdministrationColor', label: 'Administrare' },
    { key: 'eventTypeMaintenanceColor', label: 'Întreținere' },
    { key: 'eventTypeSocialMediaPublishingColor', label: 'Publicare rețele sociale' },
    { key: 'eventTypeRenovationColor', label: 'Renovare' },
    { key: 'eventTypeEventColor', label: 'Eveniment' },
    { key: 'eventTypeActDeCultColor', label: 'Act de cult' },
    { key: 'eventTypeEvangelismColor', label: 'Evanghelizare' },
    { key: 'eventTypeFuneralColor', label: 'Înmormântare' },
    { key: 'eventTypeItColor', label: 'IT' },
    { key: 'eventTypeMusicColor', label: 'Muzică' },
    { key: 'eventTypeOtherColor', label: 'Alt tip' }
  ];

  priorityColorFields: ColorField[] = [
    { key: 'priorityLowColor', label: 'Scăzută' },
    { key: 'priorityMediumLowColor', label: 'Normală' },
    { key: 'priorityMediumColor', label: 'Ridicată' },
    { key: 'priorityHighMediumColor', label: 'Foarte ridicată' },
    { key: 'priorityHighColor', label: 'Urgentă' }
  ];

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.churchSettingsService.load().subscribe((settings) => {
      this.church.set(settings);
      this.loadAttendanceChart();
    });
    this.themeService.load().subscribe((theme) => {
      this.theme.set(theme);
      this.selectedPreset.set(this.matchPreset(theme));
    });
    this.reloadTableLayout(false);
  }

  avatarPreviewUrl(): string | null {
    const url = this.churchSettingsService.avatarContentUrl(this.church());
    return url ? `${url}?v=${encodeURIComponent(this.church().name)}` : null;
  }

  changeChurchName(value: string): void {
    this.church.set({ ...this.church(), name: value });
  }

  changeChurchField(
      key: 'pastorName' | 'denomination' | 'address' | 'treasurerName' | 'secretaryName' | 'contactPerson',
      value: string): void {
    const trimmed = value.trim();
    this.church.set({ ...this.church(), [key]: trimmed || null });
  }

  changeAttendanceEnabled(value: boolean): void {
    this.church.set({ ...this.church(), attendanceEnabled: value });
    if (!value) {
      this.attendanceChartRows.set([]);
      this.attendanceChurchChartRows.set([]);
      this.attendanceChartError.set(null);
      this.attendanceChartLoading.set(false);
    }
  }

  selectChurch(id: number | string): void {
    const churchId = Number(id);
    if (!Number.isFinite(churchId) || churchId === this.church().id) {
      return;
    }
    this.churchSettingsService.select(churchId).subscribe({
      next: (settings) => {
        this.church.set(settings);
        this.loadAttendanceChart();
        this.snackBar.open(this.text(`Biserica activă este ${settings.name}.`, `${settings.name} is now the active church.`), 'OK', { duration: 2600, panelClass: 'toast-success' });
      },
      error: (error) => {
        this.snackBar.open(apiErrorMessage(error, this.text('Nu s-a putut selecta biserica.', 'The church could not be selected.')), 'OK', {
          duration: 3600,
          panelClass: 'toast-error'
        });
      }
    });
  }

  loadAttendanceChart(): void {
    if (!this.church().attendanceEnabled) {
      this.attendanceChartRows.set([]);
      this.attendanceChurchChartRows.set([]);
      this.attendanceChartError.set(null);
      this.attendanceChartLoading.set(false);
      return;
    }
    this.attendanceChartLoading.set(true);
    this.attendanceChartError.set(null);
    this.attendanceService.sessions().subscribe({
      next: (sessions) => {
        if (sessions.length === 0) {
          this.attendanceChartRows.set([]);
          this.attendanceChurchChartRows.set([]);
          this.attendanceChartLoading.set(false);
          return;
        }
        this.attendanceChurchChartRows.set(this.buildAttendanceChurchChartRows(sessions));
        forkJoin(sessions.map((session) => this.attendanceService
          .sheet(session.attendanceDate, session.session)
          .pipe(catchError(() => of(null)))))
          .subscribe({
            next: (sheets) => {
              this.attendanceChartRows.set(this.buildAttendanceChartRows(sheets, sessions.length));
              this.attendanceChartLoading.set(false);
            },
            error: (error) => {
              this.attendanceChartError.set(apiErrorMessage(error, this.text('Nu s-au putut încărca statisticile de prezență.', 'Attendance statistics could not be loaded.')));
              this.attendanceChartRows.set([]);
              this.attendanceChurchChartRows.set([]);
              this.attendanceChartLoading.set(false);
            }
          });
      },
      error: (error) => {
        this.attendanceChartError.set(apiErrorMessage(error, this.text('Nu s-au putut încărca întâlnirile de prezență.', 'Attendance meetings could not be loaded.')));
        this.attendanceChartRows.set([]);
        this.attendanceChurchChartRows.set([]);
        this.attendanceChartLoading.set(false);
      }
    });
  }

  attendanceChartSubtitle(): string {
    if (this.attendanceChartMode() === 'church') {
      return this.text('Prezența totală a bisericii pentru fiecare întâlnire.', 'Total church attendance for each meeting.');
    }
    return this.text('Toate persoanele după procentul de prezență din totalul întâlnirilor.', 'All people ranked by attendance percentage across meetings.');
  }

  private buildAttendanceChartRows(sheets: Array<AttendanceSheet | null>, totalMeetings: number): AttendanceChartRow[] {
    const people = new Map<number, { name: string; presentCount: number }>();
    sheets.forEach((sheet) => {
      sheet?.rows.forEach((row) => {
        const current = people.get(row.personId) || { name: row.fullName, presentCount: 0 };
        if (row.present) {
          current.presentCount += 1;
        }
        people.set(row.personId, current);
      });
    });
    return [...people.entries()]
      .map(([personId, value]) => ({
        personId,
        name: value.name,
        presentCount: value.presentCount,
        totalMeetings,
        percent: totalMeetings > 0 ? Math.round((value.presentCount / totalMeetings) * 100) : 0
      }))
      .sort((left, right) => right.percent - left.percent || right.presentCount - left.presentCount || left.name.localeCompare(right.name, 'ro'));
  }

  private buildAttendanceChurchChartRows(sessions: AttendanceSummary[]): AttendanceChurchChartRow[] {
    return sessions.map((session) => ({
      id: `${session.attendanceDate}-${session.session}`,
      label: `${this.formatAttendanceDate(session.attendanceDate)} · ${this.attendanceSessionLabel(session.session)}`,
      presentCount: session.presentCount,
      totalCount: session.totalCount,
      percent: session.totalCount > 0 ? Math.round((session.presentCount / session.totalCount) * 100) : 0
    }));
  }

  private attendanceSessionLabel(session: string): string {
    if (session === 'MORNING') {
      return this.text('dimineața', 'morning');
    }
    if (session === 'EVENING') {
      return this.text('seara', 'evening');
    }
    return this.text('implicit', 'default');
  }

  private formatAttendanceDate(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    return new Intl.DateTimeFormat(this.language.language() === 'en' ? 'en-US' : 'ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(year, month - 1, day));
  }

  createChurch(): void {
    const dialogRef = this.dialog.open(ChurchCreateDialogComponent, {
      width: '680px',
      maxWidth: 'calc(100vw - 32px)'
    });

    dialogRef.afterClosed().subscribe((result: ChurchCreateDialogResult | undefined) => {
      if (!result) {
        return;
      }
      this.churchSettingsService.create(result.request).subscribe({
        next: (settings) => {
          this.church.set(settings);
          if (result.avatarFile) {
            this.churchSettingsService.uploadAvatar(result.avatarFile).subscribe({
              next: (updatedSettings) => {
                this.church.set(updatedSettings);
                this.snackBar.open(this.text(`Biserica ${updatedSettings.name} a fost creată și selectată.`, `${updatedSettings.name} was created and selected.`), 'OK', {
                  duration: 2600,
                  panelClass: 'toast-success'
                });
              },
              error: (error) => {
                this.snackBar.open(apiErrorMessage(error, this.text('Biserica a fost creată, dar poza nu a putut fi încărcată.', 'The church was created, but the image could not be uploaded.')), 'OK', {
                  duration: 3600,
                  panelClass: 'toast-error'
                });
              }
            });
            return;
          }
          this.snackBar.open(this.text(`Biserica ${settings.name} a fost creată și selectată.`, `${settings.name} was created and selected.`), 'OK', {
            duration: 2600,
            panelClass: 'toast-success'
          });
        },
        error: (error) => {
          this.snackBar.open(apiErrorMessage(error, this.text('Nu s-a putut crea biserica.', 'The church could not be created.')), 'OK', {
            duration: 3600,
            panelClass: 'toast-error'
          });
        }
      });
    });
  }

  saveChurch(): void {
    const name = this.church().name.trim();
    if (!name) {
      this.snackBar.open(this.text('Numele bisericii este obligatoriu.', 'The church name is required.'), 'OK', { duration: 2600, panelClass: 'toast-error' });
      return;
    }

    this.churchSettingsService.save({ ...this.church(), name }).subscribe({
      next: (settings) => {
        this.church.set(settings);
        this.editingChurchInfo.set(false);
        this.loadAttendanceChart();
        this.snackBar.open(this.text('Setările bisericii au fost salvate.', 'Church settings were saved.'), 'OK', { duration: 2600, panelClass: 'toast-success' });
      },
      error: (error) => {
        this.snackBar.open(apiErrorMessage(error, this.text('Nu s-au putut salva setările bisericii.', 'Church settings could not be saved.')), 'OK', {
          duration: 3600,
          panelClass: 'toast-error'
        });
      }
    });
  }

  cancelChurchEdit(): void {
    this.editingChurchInfo.set(false);
    this.churchSettingsService.load().subscribe((settings) => this.church.set(settings));
  }

  uploadChurchAvatar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.churchSettingsService.uploadAvatar(file).subscribe({
      next: (settings) => {
        this.church.set(settings);
        input.value = '';
        this.snackBar.open(this.text('Iconul bisericii a fost actualizat.', 'Church icon was updated.'), 'OK', { duration: 2600, panelClass: 'toast-success' });
      },
      error: (error) => {
        input.value = '';
        this.snackBar.open(apiErrorMessage(error, this.text('Nu s-a putut încărca iconul.', 'The icon could not be uploaded.')), 'OK', {
          duration: 3600,
          panelClass: 'toast-error'
        });
      }
    });
  }

  deleteChurchAvatar(): void {
    this.churchSettingsService.deleteAvatar().subscribe({
      next: (settings) => {
        this.church.set(settings);
        this.snackBar.open(this.text('Iconul bisericii a fost șters.', 'Church icon was deleted.'), 'OK', { duration: 2600, panelClass: 'toast-success' });
      },
      error: (error) => {
        this.snackBar.open(apiErrorMessage(error, this.text('Nu s-a putut șterge iconul.', 'The icon could not be deleted.')), 'OK', {
          duration: 3600,
          panelClass: 'toast-error'
        });
      }
    });
  }

  deleteChurch(): void {
    const church = this.church();
    if (church.id === 1) {
      return;
    }
    this.dialog.open(ConfirmDialogComponent, {
      width: '520px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        title: this.text('Șterge biserica', 'Delete church'),
        message: this.text(
          `Biserica „${church.name}” și datele asociate vor fi șterse definitiv. Continui?`,
          `Church “${church.name}” and its associated data will be permanently deleted. Continue?`
        ),
        confirmLabel: this.text('Șterge', 'Delete'),
        cancelLabel: this.text('Anulează', 'Cancel')
      }
    }).afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.churchSettingsService.delete(church.id).subscribe({
        next: (settings) => {
          this.church.set(settings);
          this.editingChurchInfo.set(false);
          this.loadAttendanceChart();
          this.snackBar.open(this.text('Biserica a fost ștearsă.', 'Church was deleted.'), 'OK', {
            duration: 3000,
            panelClass: 'toast-success'
          });
        },
        error: (error) => {
          this.snackBar.open(apiErrorMessage(error, this.text('Nu s-a putut șterge biserica.', 'The church could not be deleted.')), 'OK', {
            duration: 4200,
            panelClass: 'toast-error'
          });
        }
      });
    });
  }

  applyPreset(id: string): void {
    const preset = this.presets.find((item) => item.id === id);
    if (!preset) {
      return;
    }

    const theme = { ...preset.theme };
    this.selectedPreset.set(id);
    this.theme.set(theme);
    this.themeService.preview(theme);
  }

  changeColor(key: keyof AppearanceTheme, value: string): void {
    const normalized = value.startsWith('#') ? value : `#${value}`;
    if (!/^#[0-9a-fA-F]{0,6}$/.test(normalized)) {
      return;
    }

    const next = {
      ...this.theme(),
      [key]: normalized,
      ...(key === 'tableHeaderStart' ? { tableHeaderEnd: normalized } : {})
    };
    this.theme.set(next);
    this.selectedPreset.set(this.matchPreset(next));
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      this.themeService.preview(next);
    }
  }

  changeFont(key: 'tableNameFontFamily' | 'tableBodyFontFamily' | 'calendarEventFontFamily', value: string): void {
    const next = { ...this.theme(), [key]: value };
    this.theme.set(next);
    this.selectedPreset.set(this.matchPreset(next));
    this.themeService.preview(next);
  }

  changeFontSize(
      key: 'tableHeaderFontSize' | 'tableNameFontSize' | 'tableBodyFontSize' | 'calendarEventFontSize',
      value: string | number): void {
    const size = this.normalizeFontSize(value);
    const next = { ...this.theme(), [key]: size };
    this.theme.set(next);
    this.selectedPreset.set(this.matchPreset(next));
    this.themeService.preview(next);
  }

  changeToggle(key: 'calendarEventBold' | 'calendarEventItalic', value: boolean): void {
    const next = { ...this.theme(), [key]: String(value) };
    this.theme.set(next);
    this.selectedPreset.set(this.matchPreset(next));
    this.themeService.preview(next);
  }

  changeCalendarLayout(value: string): void {
    const next = { ...this.theme(), calendarLayout: value === 'default' ? 'default' : 'large' };
    this.theme.set(next);
    this.selectedPreset.set(this.matchPreset(next));
    this.themeService.preview(next);
  }

  changeCalendarEventColorMode(value: string): void {
    const next = { ...this.theme(), calendarEventColorMode: value === 'type' ? 'type' : 'status' };
    this.theme.set(next);
    this.selectedPreset.set(this.matchPreset(next));
    this.themeService.preview(next);
  }

  changeCalendarBirthdaysEnabled(value: boolean): void {
    const next = { ...this.theme(), calendarBirthdaysEnabled: String(value) };
    this.theme.set(next);
    this.selectedPreset.set(this.matchPreset(next));
    this.themeService.preview(next);
  }

  changeBirthdayNotificationsEnabled(value: boolean): void {
    const next = { ...this.theme(), birthdayNotificationsEnabled: String(value) };
    this.theme.set(next);
    this.selectedPreset.set(this.matchPreset(next));
    this.themeService.preview(next);
  }

  changeBirthdayNotificationDaysBefore(value: string | number): void {
    const days = Math.max(0, Math.min(90, Number(value) || 0));
    const next = { ...this.theme(), birthdayNotificationDaysBefore: String(days) };
    this.theme.set(next);
    this.selectedPreset.set(this.matchPreset(next));
    this.themeService.preview(next);
  }

  changeSearchIgnoreDiacritics(value: boolean): void {
    const next = { ...this.theme(), searchIgnoreDiacritics: String(value) };
    this.theme.set(next);
    this.selectedPreset.set(this.matchPreset(next));
    this.themeService.preview(next);
  }

  changeTablePriorityDisplay(value: string): void {
    const next = { ...this.theme(), tablePriorityDisplay: value === 'stars' ? 'stars' : 'label' };
    this.theme.set(next);
    this.selectedPreset.set(this.matchPreset(next));
    this.themeService.preview(next);
  }

  changeTablePageSize(value: number | string): void {
    this.tablePreferencesService.setPageSize(Number(value)).subscribe({
      next: (preference) => {
        this.tableVisible.set(preference.visibleTables);
        this.tableOrder.set(preference.tableOrder);
        this.snackBar.open(this.text('Numărul implicit de rânduri a fost salvat.', 'Default row count was saved.'), 'OK', {
          duration: 2200,
          panelClass: 'toast-success'
        });
      },
      error: (error) => {
        this.snackBar.open(apiErrorMessage(error, this.text('Nu s-a putut salva numărul de rânduri.', 'Default row count could not be saved.')), 'OK', {
          duration: 3600,
          panelClass: 'toast-error'
        });
      }
    });
  }

  orderedTableItems(): TableNavigationItem[] {
    const order = [
      ...this.tableOrder(),
      ...this.tablePreferencesService.availableTables.map((item) => item.id).filter((id) => !this.tableOrder().includes(id))
    ];
    return order
      .map((id) => this.tablePreferencesService.availableTables.find((item) => item.id === id))
      .filter((item): item is TableNavigationItem => !!item);
  }

  isTableVisible(tableId: string): boolean {
    return this.tableVisible().includes(tableId);
  }

  isLastVisibleTable(tableId: string): boolean {
    return this.isTableVisible(tableId) && this.tableVisible().length === 1;
  }

  toggleTable(tableId: string, visible: boolean): void {
    if (!visible && this.isLastVisibleTable(tableId)) {
      return;
    }
    this.tableVisible.update((current) => visible
      ? [...new Set([...current, tableId])]
      : current.filter((id) => id !== tableId));
  }

  canMoveTable(tableId: string, direction: -1 | 1): boolean {
    const order = this.tableOrder();
    const index = order.indexOf(tableId);
    const target = index + direction;
    return index >= 0 && target >= 0 && target < order.length;
  }

  moveTable(tableId: string, direction: -1 | 1): void {
    if (!this.canMoveTable(tableId, direction)) {
      return;
    }
    const order = [...this.tableOrder()];
    const fromIndex = order.indexOf(tableId);
    const toIndex = fromIndex + direction;
    [order[fromIndex], order[toIndex]] = [order[toIndex], order[fromIndex]];
    this.tableOrder.set(order);
  }

  reloadTableLayout(showToast = true): void {
    this.tablePreferencesService.load().subscribe({
      next: (preference) => {
        this.tableVisible.set(preference.visibleTables);
        this.tableOrder.set(preference.tableOrder);
        if (showToast) {
          this.snackBar.open(this.text('Preferințele tabelelor au fost reîncărcate.', 'Table preferences were reloaded.'), 'OK', {
            duration: 2200,
            panelClass: 'toast-success'
          });
        }
      },
      error: (error) => {
        this.snackBar.open(apiErrorMessage(error, this.text('Nu s-au putut reîncărca preferințele tabelelor.', 'Table preferences could not be reloaded.')), 'OK', {
          duration: 3600,
          panelClass: 'toast-error'
        });
      }
    });
  }

  saveTableLayout(): void {
    this.tablePreferencesService.saveLayout(this.tableVisible(), this.tableOrder(), this.tablePageSize()).subscribe({
      next: (preference) => {
        this.tableVisible.set(preference.visibleTables);
        this.tableOrder.set(preference.tableOrder);
        this.snackBar.open(this.text('Preferințele tabelelor au fost salvate.', 'Table preferences were saved.'), 'OK', {
          duration: 2600,
          panelClass: 'toast-success'
        });
      },
      error: (error) => {
        this.snackBar.open(apiErrorMessage(error, this.text('Nu s-au putut salva preferințele tabelelor.', 'Table preferences could not be saved.')), 'OK', {
          duration: 3600,
          panelClass: 'toast-error'
        });
      }
    });
  }

  fontStack(value: string): string {
    return this.fontOptions.find((font) => font.value === value)?.sample ?? this.fontOptions[0].sample;
  }

  private normalizeFontSize(value: string | number): string {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return '14.5';
    }

    const bounded = Math.min(24, Math.max(10, parsed));
    return String(Math.round(bounded * 2) / 2);
  }

  save(): void {
    this.themeService.save(this.theme()).subscribe({
      next: (theme) => {
        this.theme.set(theme);
        this.selectedPreset.set(this.matchPreset(theme));
        this.snackBar.open(this.text('Setările au fost salvate.', 'Settings were saved.'), 'OK', { duration: 2600, panelClass: 'toast-success' });
      },
      error: (error) => {
        this.snackBar.open(apiErrorMessage(error, this.text('Nu s-au putut salva setările.', 'Settings could not be saved.')), 'OK', {
          duration: 3600,
          panelClass: 'toast-error'
        });
      }
    });
  }

  reset(): void {
    this.themeService.reset().subscribe({
      next: (theme) => {
        this.theme.set(theme);
        this.selectedPreset.set(this.matchPreset(theme));
        this.snackBar.open(this.text('Tema a fost resetată.', 'Theme was reset.'), 'OK', { duration: 2600, panelClass: 'toast-success' });
      },
      error: (error) => {
        this.snackBar.open(apiErrorMessage(error, this.text('Nu s-a putut reseta tema.', 'Theme could not be reset.')), 'OK', {
          duration: 3600,
          panelClass: 'toast-error'
        });
      }
    });
  }

  private matchPreset(theme: AppearanceTheme): string | null {
    return this.presets.find((preset) => JSON.stringify(preset.theme) === JSON.stringify(theme))?.id ?? null;
  }
}
