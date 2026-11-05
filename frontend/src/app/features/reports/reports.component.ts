import { CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';

import { ChurchSettingsService } from '../../core/church-settings.service';
import { LanguageService } from '../../core/language.service';
import { apiErrorMessage } from '../../shared/api-error-message';
import { eventStatusLabel, eventTypeLabel, groupTypeLabel, memberTypeLabel } from '../../shared/display-labels';
import { PageMenuActionsService } from '../../shared/page-menu-actions.service';
import { PageNavComponent } from '../../shared/page-nav.component';
import { ToastService } from '../../shared/toast.service';
import { AttendanceSheet, AttendanceSummary } from '../attendance/attendance.model';
import { AttendanceService } from '../attendance/attendance.service';
import { EventItem } from '../events/event.model';
import { EventStatus, EventType } from '../events/event.model';
import { EventsService } from '../events/events.service';
import { FinanceOverview, FinancialTransaction } from '../finance/finance.model';
import { FinanceService } from '../finance/finance.service';
import { Family } from '../families/family.model';
import { FamiliesService } from '../families/families.service';
import { Group } from '../groups/group.model';
import { GroupType } from '../groups/group.model';
import { GroupsService } from '../groups/groups.service';
import { Person } from '../persons/person.model';
import { PersonsService } from '../persons/persons.service';

interface ChartRow {
  label: string;
  value: number;
  percent: number;
  tone: string;
  route: string;
  queryParams?: Record<string, string>;
}

interface DonutSegment extends ChartRow {
  offset: number;
  labelAnchor: 'start' | 'middle' | 'end';
  labelX: number;
  labelY: number;
}

interface FinanceMonthRow extends ChartRow {
  monthKey: string;
  income: number;
  expenses: number;
  balance: number;
}

type ReportTabId = 'people' | 'groups' | 'events' | 'attendance' | 'finance';
type PeopleChartMode = 'categories' | 'activity' | 'groups' | 'contacts';
type WidowChartMode = 'share' | 'gender' | 'activity';
type AttendanceChartMode = 'individual' | 'church';

interface ReportTab {
  id: ReportTabId;
  label: string;
  icon: string;
}

const CHART_COLORS = {
  blue: '#0072b2',
  sky: '#56b4e9',
  green: '#009e73',
  orange: '#e69f00',
  vermillion: '#d55e00',
  purple: '#cc79a7',
  gray: '#6b7280',
  red: '#b91c1c'
} as const;

const CATEGORICAL_PALETTE = [
  CHART_COLORS.blue,
  CHART_COLORS.orange,
  CHART_COLORS.green,
  CHART_COLORS.purple,
  CHART_COLORS.sky,
  CHART_COLORS.vermillion,
  CHART_COLORS.gray
];

const STATUS_COLORS: Record<EventStatus, string> = {
  PLANNED: CHART_COLORS.blue,
  ACTIVE: CHART_COLORS.green,
  DONE: CHART_COLORS.gray,
  CANCELED: CHART_COLORS.red
};

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, MatIconModule, PageNavComponent, RouterLink],
  styles: [`
    .reports-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .report-tabs {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px;
      overflow-x: auto;
      padding-bottom: 2px;
    }

    .report-tab {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-height: 40px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.88);
      color: var(--app-text);
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      line-height: 1;
      padding: 0 13px;
      white-space: nowrap;
    }

    .report-tab.active,
    .report-tab:hover,
    .report-tab:focus-visible {
      border-color: var(--app-primary);
      background: var(--app-primary-soft);
      color: var(--app-primary-strong);
      outline: none;
    }

    .report-tab mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
      line-height: 18px;
    }

    .chart-mode-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: -4px 0 16px;
      padding: 10px 12px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
    }

    .chart-mode-title {
      color: var(--app-muted);
      font-size: 13px;
      font-weight: 700;
    }

    .chart-mode-switch {
      display: inline-flex;
      gap: 6px;
      padding: 4px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface-muted);
    }

    .chart-mode-switch button {
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

    .chart-mode-switch button.active,
    .chart-mode-switch button:hover {
      background: #ffffff;
      color: var(--app-primary-strong);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
    }

    .chart-card {
      display: grid;
      gap: 14px;
      min-height: 280px;
      padding: 18px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: #ffffff;
      box-shadow: var(--app-shadow);
    }

    .chart-card.wide {
      grid-column: 1 / -1;
    }

    .chart-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .chart-header h2 {
      margin: 0;
      color: var(--app-text);
      font-size: 17px;
      font-weight: 800;
    }

    .chart-controls {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      flex-wrap: wrap;
    }

    .chart-select {
      min-width: 188px;
      height: 34px;
      box-sizing: border-box;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: #ffffff;
      color: var(--app-text);
      font: inherit;
      font-size: 12px;
      font-weight: 700;
      padding: 0 30px 0 10px;
    }

    .chart-kicker {
      margin: 4px 0 0;
      color: var(--app-muted);
      font-size: 12px;
      font-weight: 650;
    }

    .chart-total {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 30px;
      padding: 0 10px;
      border-radius: 999px;
      background: var(--app-primary-soft);
      color: var(--app-primary-strong);
      font-size: 13px;
      font-weight: 800;
      white-space: nowrap;
    }

    .bar-list {
      display: grid;
      gap: 7px;
      align-content: start;
    }

    .chart-legend {
      width: min(100%, 386px);
      justify-self: stretch;
      row-gap: 15px;
    }

    .chart-body {
      display: grid;
      grid-template-columns: minmax(190px, 240px) minmax(250px, 1fr);
      gap: 22px;
      align-items: center;
      min-width: 0;
    }

    .donut-wrap {
      position: relative;
      display: grid;
      place-items: center;
      width: min(100%, 240px);
      justify-self: center;
      aspect-ratio: 1;
    }

    .donut-chart {
      width: 100%;
      height: 100%;
      overflow: visible;
      filter: drop-shadow(0 14px 18px rgba(15, 23, 42, 0.1));
    }

    .donut-ring {
      fill: none;
      stroke: #edf2f7;
      stroke-width: 24;
    }

    .donut-segment {
      fill: none;
      stroke-width: 24;
      stroke-linecap: butt;
      cursor: pointer;
      transition: stroke-dasharray 0.2s ease;
    }

    .donut-segment:hover {
      filter: brightness(1.08);
      stroke-width: 26;
    }

    .donut-center {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      display: grid;
      place-items: center;
      width: 78px;
      aspect-ratio: 1;
      border-radius: 999px;
      background: #ffffff;
      box-shadow: inset 0 0 0 1px #e5e7eb, 0 8px 18px rgba(15, 23, 42, 0.08);
      color: var(--app-text);
      font-size: 22px;
      font-weight: 850;
      line-height: 1;
    }

    .donut-segment-label {
      cursor: pointer;
      fill: #6b7280;
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 0;
      dominant-baseline: middle;
    }

    .bar-row {
      display: grid;
      grid-template-columns: minmax(96px, 0.55fr) minmax(56px, 1fr) max-content;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .bar-label {
      overflow: hidden;
      color: var(--app-text);
      font-size: 14px;
      font-weight: 750;
      line-height: 1.25;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .bar-track {
      overflow: hidden;
      height: 10px;
      border-radius: 999px;
      background: #edf2f7;
      cursor: pointer;
    }

    .chart-legend .bar-row {
      grid-template-columns: minmax(150px, 1fr) 36px 58px;
      column-gap: 5px;
      width: 100%;
    }

    .chart-legend .bar-label {
      overflow: visible;
      text-overflow: clip;
      white-space: nowrap;
    }

    .legend-swatch {
      display: inline-block;
      justify-self: end;
      width: 36px;
      height: 20px;
      border-radius: 5px;
      box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.14);
      cursor: pointer;
    }

    .bar-fill {
      display: block;
      height: 100%;
      min-width: 3px;
      border-radius: inherit;
      background: var(--bar-color, var(--app-primary));
    }

    .bar-value {
      display: inline-flex;
      gap: 4px;
      justify-content: flex-end;
      color: var(--app-text);
      font-size: 13px;
      font-weight: 800;
      line-height: 1.25;
      text-align: right;
      text-decoration: none;
      white-space: nowrap;
    }

    .bar-value-muted {
      color: #9ca3af;
      font-weight: 750;
    }

    .chart-legend .bar-value {
      justify-content: flex-start;
      text-align: left;
    }

    .bar-value:hover,
    .bar-label-link:hover {
      color: var(--app-primary-strong);
      text-decoration: underline;
    }

    .bar-label-link {
      color: inherit;
      text-decoration: none;
    }

    .legend-count {
      color: var(--app-muted);
      font-weight: 650;
    }

    .summary-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .summary-tile {
      display: grid;
      gap: 4px;
      padding: 14px 16px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
    }

    .summary-tile span {
      color: var(--app-muted);
      font-size: 12px;
      font-weight: 700;
    }

    .summary-tile strong {
      color: var(--app-text);
      font-size: 22px;
      font-weight: 850;
      line-height: 1.1;
    }

    .finance-bars {
      display: grid;
      gap: 12px;
    }

    .finance-row {
      display: grid;
      grid-template-columns: 96px minmax(0, 1fr) 118px;
      gap: 12px;
      align-items: center;
    }

    .finance-stack {
      display: grid;
      gap: 4px;
    }

    .finance-stack .income {
      --bar-color: #009e73;
    }

    .finance-stack .expense {
      --bar-color: var(--app-danger);
    }

    .empty-chart {
      display: grid;
      place-items: center;
      min-height: 160px;
      color: var(--app-muted);
      font-size: 13px;
      text-align: center;
    }

    .print-report {
      display: none;
    }

    .print-header,
    .print-info-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 14px;
    }

    .print-header {
      align-items: start;
      padding-bottom: 12px;
      border-bottom: 1px solid #d1d5db;
    }

    .print-title {
      margin: 0 0 5px;
      color: #111827;
      font-size: 23px;
      font-weight: 850;
    }

    .print-subtitle,
    .print-meta,
    .print-data-row dt,
    .print-summary-tile span {
      color: #6b7280;
      font-size: 11px;
      font-weight: 700;
    }

    .print-meta {
      display: grid;
      gap: 3px;
      text-align: right;
    }

    .print-info-card {
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: #ffffff;
      break-inside: avoid;
      padding: 12px;
    }

    .print-info-card h2 {
      margin: 0 0 8px;
      color: #111827;
      font-size: 14px;
      font-weight: 850;
    }

    .print-data-list {
      display: grid;
      gap: 5px;
      margin: 0;
    }

    .print-data-row {
      display: grid;
      grid-template-columns: 104px minmax(0, 1fr);
      gap: 8px;
      color: #111827;
      font-size: 11px;
      line-height: 1.35;
    }

    .print-data-row dd {
      margin: 0;
      font-weight: 750;
    }

    .print-summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 14px;
    }

    .print-summary-tile {
      display: grid;
      gap: 3px;
      padding: 9px 10px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: #f9fafb;
    }

    .print-summary-tile strong {
      color: #111827;
      font-size: 16px;
      font-weight: 850;
      line-height: 1.1;
    }

    @media (max-width: 900px) {
      .reports-grid,
      .summary-strip,
      .chart-body {
        grid-template-columns: 1fr;
      }

      .donut-wrap {
        justify-self: center;
      }

      .chart-card.wide {
        grid-column: auto;
      }
    }

    @media (max-width: 640px) {
      .summary-strip {
        display: none;
      }

      .chart-mode-toolbar {
        align-items: stretch;
        flex-direction: column;
      }

      .chart-mode-switch {
        width: 100%;
      }

      .chart-mode-switch button {
        flex: 1 1 0;
      }

      .finance-row {
        grid-template-columns: 1fr;
      }

      .bar-row {
        grid-template-columns: minmax(90px, 0.8fr) minmax(44px, 1fr) max-content;
        gap: 6px;
      }

      .chart-legend .bar-row {
        grid-template-columns: minmax(150px, 1fr) 32px 54px;
      }

      .legend-swatch {
        width: 32px;
        height: 18px;
      }

      .bar-value {
        text-align: left;
      }
    }

    @media print {
      :host {
        display: block;
        color: #111827;
        background: #ffffff;
      }

      @page {
        size: A4;
        margin: 12mm;
      }

      .page {
        display: flex !important;
        flex-direction: column;
        padding: 0 !important;
        background: #ffffff !important;
      }

      .page-header,
      .summary-strip,
      .report-tabs {
        display: none !important;
      }

      .print-report {
        display: block;
        order: -1;
      }

      .reports-grid {
        order: 0;
        grid-template-columns: 1fr;
        gap: 10px;
      }

      .chart-card {
        min-height: 0;
        padding: 10px;
        border-color: #d1d5db;
        box-shadow: none;
        break-inside: avoid;
      }

      .chart-body {
        grid-template-columns: 160px minmax(0, 1fr);
      }

      .donut-wrap {
        width: 156px;
      }

      .donut-chart {
        filter: none;
      }

      .donut-segment,
      .legend-swatch,
      .bar-fill,
      .print-summary-tile {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .chart-select {
        display: none;
      }
    }
  `],
  template: `
    <main class="page">
      <header class="page-header">
        <div class="page-header-main">
          <h1 class="page-title page-title-offset">{{ language.t('page.reports') }}</h1>
          <p class="page-subtitle" aria-hidden="true">&nbsp;</p>
        </div>
        <div class="page-header-actions">
          <button class="toolbar-button toolbar-secondary-button" type="button" (click)="printReportsPdf()">
            <mat-icon>print</mat-icon>
            {{ reportText('Tipărește PDF', 'Print PDF') }}
          </button>
          <app-page-nav />
        </div>
      </header>

      <section class="summary-strip" [attr.aria-label]="reportText('Sumar rapoarte', 'Report summary')">
        <article class="summary-tile">
          <span>{{ language.t('table.persons') }}</span>
          <strong>{{ persons().length }}</strong>
        </article>
        <article class="summary-tile">
          <span>{{ language.t('table.groups') }}</span>
          <strong>{{ groups().length }}</strong>
        </article>
        <article class="summary-tile">
          <span>{{ language.t('table.events') }}</span>
          <strong>{{ events().length }}</strong>
        </article>
        <article class="summary-tile">
          <span>{{ reportText('Sold curent', 'Current balance') }}</span>
          <strong>{{ finance().summary.currentBalance | currency:'RON':'symbol-narrow':'1.2-2':currencyLocale() }}</strong>
        </article>
      </section>

      <nav class="report-tabs" [attr.aria-label]="reportText('Secțiuni grafice', 'Report sections')">
        @for (tab of reportTabs; track tab.id) {
          <button
            class="report-tab"
            type="button"
            [class.active]="activeReportTab() === tab.id"
            [attr.aria-pressed]="activeReportTab() === tab.id"
            (click)="activeReportTab.set(tab.id)">
            <mat-icon>{{ tab.icon }}</mat-icon>
            {{ tab.label }}
          </button>
        }
      </nav>

      @if (activeReportTab() === 'attendance') {
        <div class="chart-mode-toolbar">
          <span class="chart-mode-title">{{ attendanceChartSubtitle() }}</span>
          <span class="chart-mode-switch" role="group" [attr.aria-label]="reportText('Tip grafic prezență', 'Attendance chart type')">
            <button type="button" [class.active]="attendanceChartMode() === 'individual'" (click)="attendanceChartMode.set('individual')">{{ language.t('table.persons') }}</button>
            <button type="button" [class.active]="attendanceChartMode() === 'church'" (click)="attendanceChartMode.set('church')">{{ reportText('Biserică', 'Church') }}</button>
          </span>
        </div>
      }

      <section class="reports-grid" [attr.aria-label]="activeReportTabLabel()">
        @switch (activeReportTab()) {
          @case ('people') {
        <article class="chart-card">
          <div class="chart-header">
            <div>
              <h2>{{ language.t('table.persons') }}</h2>
              <p class="chart-kicker">{{ peopleChartSubtitle() }}</p>
            </div>
            <div class="chart-controls">
              <select class="chart-select" [(ngModel)]="peopleChartMode" [attr.aria-label]="reportText('Selectează raport persoane', 'Select people report')">
                @for (option of peopleChartOptions; track option.value) {
                  <option [ngValue]="option.value">{{ option.label }}</option>
                }
              </select>
              <span class="chart-total">{{ peopleChartTotalLabel() }}</span>
            </div>
          </div>
          <div class="chart-body">
            @if (selectedPeopleRows().length > 0) {
              <div class="donut-wrap" role="img" [attr.aria-label]="peopleChartSubtitle()">
                <svg class="donut-chart" viewBox="0 0 160 160">
                  <circle class="donut-ring" cx="80" cy="80" r="54"></circle>
                  @for (segment of donutSegments(selectedPeopleRows()); track segment.label) {
                    <circle
                      class="donut-segment"
                      cx="80"
                      cy="80"
                      r="54"
                      pathLength="100"
                      tabindex="0"
                      transform="rotate(-90 80 80)"
                      [attr.stroke]="segment.tone"
                      [attr.stroke-dasharray]="segment.percent + ' ' + (100 - segment.percent)"
                      [attr.stroke-dashoffset]="-segment.offset"
                      (click)="openChartRow(segment)"
                      (keyup.enter)="openChartRow(segment)"></circle>
                    <text
                      class="donut-segment-label"
                      tabindex="0"
                      [attr.text-anchor]="segment.labelAnchor"
                      [attr.x]="segment.labelX"
                      [attr.y]="segment.labelY"
                      (click)="openChartRow(segment)"
                      (keyup.enter)="openChartRow(segment)">
                      {{ segment.percent }}%
                    </text>
                  }
                </svg>
                <span class="donut-center">{{ peopleChartCenterLabel() }}</span>
              </div>
              <div class="bar-list chart-legend" [attr.aria-label]="reportText('Legendă persoane', 'People legend')">
                @for (item of selectedPeopleRows(); track item.label) {
                  <div class="bar-row">
                    <a class="bar-label bar-label-link" [routerLink]="item.route" [queryParams]="item.queryParams">{{ item.label }}</a>
                    <span class="legend-swatch" [style.background-color]="item.tone" (click)="openChartRow(item)" (keyup.enter)="openChartRow(item)" tabindex="0"></span>
                    <a class="bar-value" [routerLink]="item.route" [queryParams]="item.queryParams">{{ item.value }}</a>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-chart">{{ reportText('Nu există persoane pentru grafic.', 'There are no people for this chart.') }}</div>
            }
          </div>
        </article>

        <article class="chart-card">
          <div class="chart-header">
            <div>
              <h2>{{ reportText('Văduvi', 'Widowed members') }}</h2>
              <p class="chart-kicker">{{ widowChartSubtitle() }}</p>
            </div>
            <div class="chart-controls">
              <select class="chart-select" [(ngModel)]="widowChartMode" [attr.aria-label]="reportText('Selectează raport văduvi', 'Select widowed members report')">
                @for (option of widowChartOptions; track option.value) {
                  <option [ngValue]="option.value">{{ option.label }}</option>
                }
              </select>
              <span class="chart-total">{{ widowChartTotalLabel() }}</span>
            </div>
          </div>
          @if (widowChartMode === 'gender') {
            <div class="empty-chart">{{ reportText('În lucru.', 'In progress.') }}</div>
          } @else {
            <div class="chart-body">
              @if (selectedWidowRows().length > 0) {
              <div class="donut-wrap" role="img" [attr.aria-label]="widowChartSubtitle()">
                <svg class="donut-chart" viewBox="0 0 160 160">
                  <circle class="donut-ring" cx="80" cy="80" r="54"></circle>
                  @for (segment of donutSegments(selectedWidowRows()); track segment.label) {
                    <circle
                      class="donut-segment"
                      cx="80"
                      cy="80"
                      r="54"
                      pathLength="100"
                      tabindex="0"
                      transform="rotate(-90 80 80)"
                      [attr.stroke]="segment.tone"
                      [attr.stroke-dasharray]="segment.percent + ' ' + (100 - segment.percent)"
                      [attr.stroke-dashoffset]="-segment.offset"
                      (click)="openChartRow(segment)"
                      (keyup.enter)="openChartRow(segment)"></circle>
                    <text
                      class="donut-segment-label"
                      tabindex="0"
                      [attr.text-anchor]="segment.labelAnchor"
                      [attr.x]="segment.labelX"
                      [attr.y]="segment.labelY"
                      (click)="openChartRow(segment)"
                      (keyup.enter)="openChartRow(segment)">
                      {{ segment.percent }}%
                    </text>
                  }
                </svg>
                <span class="donut-center">{{ widowChartCenterLabel() }}</span>
              </div>
              <div class="bar-list chart-legend" [attr.aria-label]="reportText('Legendă văduvi', 'Widowed members legend')">
                @for (item of selectedWidowRows(); track item.label) {
                  <div class="bar-row">
                    <a class="bar-label bar-label-link" [routerLink]="item.route" [queryParams]="item.queryParams">{{ item.label }}</a>
                    <span class="legend-swatch" [style.background-color]="item.tone" (click)="openChartRow(item)" (keyup.enter)="openChartRow(item)" tabindex="0"></span>
                    <a class="bar-value" [routerLink]="item.route" [queryParams]="item.queryParams">{{ item.value }}</a>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-chart">{{ reportText('Nu există date pentru grafic.', 'There is no data for this chart.') }}</div>
            }
          </div>
          }
        </article>

        <article class="chart-card wide">
          <div class="chart-header">
            <div>
              <h2>{{ reportText('Catch up persoane', 'People follow-up') }}</h2>
              <p class="chart-kicker">{{ reportText('Număr de interacțiuni în', 'Number of interactions in') }} {{ currentYear() }}</p>
            </div>
            <span class="chart-total">{{ catchUpInteractionTotal() }} {{ reportText('interacțiuni', 'interactions') }}</span>
          </div>
          <div class="bar-list">
            @for (item of catchUpByPerson(); track item.label) {
              <div class="bar-row">
                <a class="bar-label bar-label-link" [routerLink]="item.route" [queryParams]="item.queryParams">{{ item.label }}</a>
                <span class="bar-track" (click)="openChartRow(item)" (keyup.enter)="openChartRow(item)" tabindex="0"><span class="bar-fill" [style.width.%]="item.percent" [style.background-color]="item.tone"></span></span>
                <a class="bar-value" [routerLink]="item.route" [queryParams]="item.queryParams">
                  <span>{{ item.value }}</span>
                  <span class="bar-value-muted">/ {{ catchUpInteractionPercent(item.value) }}%</span>
                </a>
              </div>
            } @empty {
              <div class="empty-chart">{{ reportText('Nu există persoane pentru graficul de catch up.', 'There are no people for the follow-up chart.') }}</div>
            }
          </div>
        </article>

          }
          @case ('groups') {
        <article class="chart-card">
          <div class="chart-header">
            <div>
              <h2>{{ reportText('Grupuri după tip', 'Groups by type') }}</h2>
              <p class="chart-kicker">{{ reportText('Structura grupurilor active', 'Structure of active groups') }}</p>
            </div>
            <span class="chart-total">{{ groups().length }}</span>
          </div>
          <div class="chart-body">
            @if (groupsByType().length > 0) {
              <div class="donut-wrap" role="img" [attr.aria-label]="reportText('Grupuri după tip', 'Groups by type')">
                <svg class="donut-chart" viewBox="0 0 160 160">
                  <circle class="donut-ring" cx="80" cy="80" r="54"></circle>
                  @for (segment of donutSegments(groupsByType()); track segment.label) {
                    <circle
                      class="donut-segment"
                      cx="80"
                      cy="80"
                      r="54"
                      pathLength="100"
                      tabindex="0"
                      transform="rotate(-90 80 80)"
                      [attr.stroke]="segment.tone"
                      [attr.stroke-dasharray]="segment.percent + ' ' + (100 - segment.percent)"
                      [attr.stroke-dashoffset]="-segment.offset"
                      (click)="openChartRow(segment)"
                      (keyup.enter)="openChartRow(segment)"></circle>
                    <text
                      class="donut-segment-label"
                      tabindex="0"
                      [attr.text-anchor]="segment.labelAnchor"
                      [attr.x]="segment.labelX"
                      [attr.y]="segment.labelY"
                      (click)="openChartRow(segment)"
                      (keyup.enter)="openChartRow(segment)">
                      {{ segment.percent }}%
                    </text>
                  }
                </svg>
                <span class="donut-center">{{ groups().length }}</span>
              </div>
              <div class="bar-list chart-legend" [attr.aria-label]="reportText('Legendă grupuri', 'Groups legend')">
                @for (item of groupsByType(); track item.label) {
                  <div class="bar-row">
                    <a class="bar-label bar-label-link" [routerLink]="item.route" [queryParams]="item.queryParams">{{ item.label }}</a>
                    <span class="legend-swatch" [style.background-color]="item.tone" (click)="openChartRow(item)" (keyup.enter)="openChartRow(item)" tabindex="0"></span>
                    <a class="bar-value" [routerLink]="item.route" [queryParams]="item.queryParams">{{ item.value }}</a>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-chart">{{ reportText('Nu există grupuri pentru grafic.', 'There are no groups for this chart.') }}</div>
            }
          </div>
        </article>

          }
          @case ('events') {
        <article class="chart-card">
          <div class="chart-header">
            <div>
              <h2>{{ reportText('Progresie evenimente', 'Event progress') }}</h2>
              <p class="chart-kicker">{{ reportText('Planificat, activ, finalizat sau anulat', 'Planned, active, completed or canceled') }}</p>
            </div>
            <span class="chart-total">{{ events().length }}</span>
          </div>
          <div class="chart-body">
            @if (eventsByStatus().length > 0) {
              <div class="donut-wrap" role="img" [attr.aria-label]="reportText('Evenimente după status', 'Events by status')">
                <svg class="donut-chart" viewBox="0 0 160 160">
                  <circle class="donut-ring" cx="80" cy="80" r="54"></circle>
                  @for (segment of donutSegments(eventsByStatus()); track segment.label) {
                    <circle
                      class="donut-segment"
                      cx="80"
                      cy="80"
                      r="54"
                      pathLength="100"
                      tabindex="0"
                      transform="rotate(-90 80 80)"
                      [attr.stroke]="segment.tone"
                      [attr.stroke-dasharray]="segment.percent + ' ' + (100 - segment.percent)"
                      [attr.stroke-dashoffset]="-segment.offset"
                      (click)="openChartRow(segment)"
                      (keyup.enter)="openChartRow(segment)"></circle>
                    <text
                      class="donut-segment-label"
                      tabindex="0"
                      [attr.text-anchor]="segment.labelAnchor"
                      [attr.x]="segment.labelX"
                      [attr.y]="segment.labelY"
                      (click)="openChartRow(segment)"
                      (keyup.enter)="openChartRow(segment)">
                      {{ segment.percent }}%
                    </text>
                  }
                </svg>
                <span class="donut-center">{{ events().length }}</span>
              </div>
              <div class="bar-list chart-legend" [attr.aria-label]="reportText('Legendă status evenimente', 'Event status legend')">
                @for (item of eventsByStatus(); track item.label) {
                  <div class="bar-row">
                    <a class="bar-label bar-label-link" [routerLink]="item.route" [queryParams]="item.queryParams">{{ item.label }}</a>
                    <span class="legend-swatch" [style.background-color]="item.tone" (click)="openChartRow(item)" (keyup.enter)="openChartRow(item)" tabindex="0"></span>
                    <a class="bar-value" [routerLink]="item.route" [queryParams]="item.queryParams">{{ item.value }}</a>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-chart">{{ reportText('Nu există evenimente pentru grafic.', 'There are no events for this chart.') }}</div>
            }
          </div>
        </article>

        <article class="chart-card">
          <div class="chart-header">
            <div>
              <h2>{{ language.t('table.events') }}</h2>
              <p class="chart-kicker">{{ reportText('Top tipuri în lista curentă', 'Top types in the current list') }}</p>
            </div>
            <span class="chart-total">{{ events().length }}</span>
          </div>
          <div class="chart-body">
            @if (eventsByType().length > 0) {
              <div class="donut-wrap" role="img" [attr.aria-label]="reportText('Evenimente după tip', 'Events by type')">
                <svg class="donut-chart" viewBox="0 0 160 160">
                  <circle class="donut-ring" cx="80" cy="80" r="54"></circle>
                  @for (segment of donutSegments(eventsByType()); track segment.label) {
                    <circle
                      class="donut-segment"
                      cx="80"
                      cy="80"
                      r="54"
                      pathLength="100"
                      tabindex="0"
                      transform="rotate(-90 80 80)"
                      [attr.stroke]="segment.tone"
                      [attr.stroke-dasharray]="segment.percent + ' ' + (100 - segment.percent)"
                      [attr.stroke-dashoffset]="-segment.offset"
                      (click)="openChartRow(segment)"
                      (keyup.enter)="openChartRow(segment)"></circle>
                    <text
                      class="donut-segment-label"
                      tabindex="0"
                      [attr.text-anchor]="segment.labelAnchor"
                      [attr.x]="segment.labelX"
                      [attr.y]="segment.labelY"
                      (click)="openChartRow(segment)"
                      (keyup.enter)="openChartRow(segment)">
                      {{ segment.percent }}%
                    </text>
                  }
                </svg>
                <span class="donut-center">{{ events().length }}</span>
              </div>
              <div class="bar-list chart-legend" [attr.aria-label]="reportText('Legendă tipuri evenimente', 'Event type legend')">
                @for (item of eventsByType(); track item.label) {
                  <div class="bar-row">
                    <a class="bar-label bar-label-link" [routerLink]="item.route" [queryParams]="item.queryParams">{{ item.label }}</a>
                    <span class="legend-swatch" [style.background-color]="item.tone" (click)="openChartRow(item)" (keyup.enter)="openChartRow(item)" tabindex="0"></span>
                    <a class="bar-value" [routerLink]="item.route" [queryParams]="item.queryParams">{{ item.value }}</a>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-chart">{{ reportText('Nu există evenimente pentru grafic.', 'There are no events for this chart.') }}</div>
            }
          </div>
        </article>

          }
          @case ('attendance') {
        <article class="chart-card wide">
          <div class="chart-header">
            <div>
              <h2>{{ attendanceChartTitle() }}</h2>
              <p class="chart-kicker">{{ attendanceChartSubtitle() }}</p>
            </div>
            <span class="chart-total">{{ attendanceRate() }}%</span>
          </div>
          <div class="bar-list">
            @for (item of selectedAttendanceRows(); track item.label) {
              <div class="bar-row">
                <a class="bar-label bar-label-link" [routerLink]="item.route" [queryParams]="item.queryParams">{{ item.label }}</a>
                <span class="bar-track" (click)="openChartRow(item)" (keyup.enter)="openChartRow(item)" tabindex="0"><span class="bar-fill" [style.width.%]="item.percent" [style.background-color]="item.tone"></span></span>
                <a class="bar-value" [routerLink]="item.route" [queryParams]="item.queryParams">{{ item.percent }}%</a>
              </div>
            } @empty {
              <div class="empty-chart">{{ reportText('Nu există sesiuni de prezență pentru grafic.', 'There are no attendance sessions for this chart.') }}</div>
            }
          </div>
        </article>

          }
          @case ('finance') {
        <article class="chart-card wide">
          <div class="chart-header">
            <div>
              <h2>{{ reportText('Finanțe pe lună', 'Finance by month') }}</h2>
              <p class="chart-kicker">{{ reportText('Venituri, cheltuieli și balanță lunară', 'Income, expenses and monthly balance') }}</p>
            </div>
            <span class="chart-total">{{ finance().summary.transactionCount }}</span>
          </div>
          <div class="finance-bars">
            @for (row of financeByMonth(); track row.label) {
              <div class="finance-row">
                <a class="bar-label bar-label-link" [routerLink]="row.route" [queryParams]="row.queryParams">{{ row.label }}</a>
                <span class="finance-stack">
                  <span class="bar-track" (click)="openChartRow(row)" (keyup.enter)="openChartRow(row)" tabindex="0"><span class="bar-fill income" [style.width.%]="row.incomePercent" style="background-color: #009e73"></span></span>
                  <span class="bar-track" (click)="openChartRow(row)" (keyup.enter)="openChartRow(row)" tabindex="0"><span class="bar-fill expense" [style.width.%]="row.expensePercent" style="background-color: #b91c1c"></span></span>
                </span>
                <a class="bar-value" [routerLink]="row.route" [queryParams]="row.queryParams">{{ row.balance | currency:'RON':'symbol-narrow':'1.2-2':currencyLocale() }}</a>
              </div>
            } @empty {
              <div class="empty-chart">{{ reportText('Nu există tranzacții pentru grafic.', 'There are no transactions for this chart.') }}</div>
            }
          </div>
        </article>
          }
        }
      </section>

      <section class="print-report" [attr.aria-label]="reportText('Raport grafice pentru PDF', 'Chart report for PDF')">
        <header class="print-header">
          <div>
            <h1 class="print-title">{{ reportText('Raport grafice', 'Chart report') }}</h1>
            <p class="print-subtitle">{{ churchSubtitle() }}</p>
          </div>
          <div class="print-meta">
            <span>{{ reportText('Generat:', 'Generated:') }} {{ generatedAtLabel() }}</span>
            <span>{{ reportText('Total persoane:', 'Total people:') }} {{ persons().length }}</span>
          </div>
        </header>

        @if (churchInfoRows().length > 0 || committeeRows().length > 0) {
          <section class="print-info-grid">
            @if (churchInfoRows().length > 0) {
              <article class="print-info-card">
                <h2>{{ reportText('Date biserică', 'Church information') }}</h2>
                <dl class="print-data-list">
                  @for (row of churchInfoRows(); track row.label) {
                    <div class="print-data-row">
                      <dt>{{ row.label }}</dt>
                      <dd>{{ row.value }}</dd>
                    </div>
                  }
                </dl>
              </article>
            }

            @if (committeeRows().length > 0) {
              <article class="print-info-card">
                <h2>{{ reportText('Comitet', 'Leadership') }}</h2>
                <dl class="print-data-list">
                  @for (row of committeeRows(); track row.label) {
                    <div class="print-data-row">
                      <dt>{{ row.label }}</dt>
                      <dd>{{ row.value }}</dd>
                    </div>
                  }
                </dl>
              </article>
            }
          </section>
        }

        <section class="print-summary-grid" [attr.aria-label]="reportText('Sumar raport', 'Report summary')">
          <article class="print-summary-tile">
            <span>{{ language.t('table.persons') }}</span>
            <strong>{{ persons().length }}</strong>
          </article>
          <article class="print-summary-tile">
            <span>{{ language.t('table.groups') }}</span>
            <strong>{{ groups().length }}</strong>
          </article>
          <article class="print-summary-tile">
            <span>{{ language.t('table.events') }}</span>
            <strong>{{ events().length }}</strong>
          </article>
          <article class="print-summary-tile">
            <span>{{ reportText('Sold curent', 'Current balance') }}</span>
            <strong>{{ finance().summary.currentBalance | currency:'RON':'symbol-narrow':'1.2-2':currencyLocale() }}</strong>
          </article>
        </section>

      </section>
    </main>
  `
})
export class ReportsComponent implements OnInit, OnDestroy {
  language = inject(LanguageService);
  private personsService = inject(PersonsService);
  private groupsService = inject(GroupsService);
  private familiesService = inject(FamiliesService);
  private eventsService = inject(EventsService);
  private attendanceService = inject(AttendanceService);
  private financeService = inject(FinanceService);
  private churchSettingsService = inject(ChurchSettingsService);
  private pageMenuActions = inject(PageMenuActionsService);
  private toast = inject(ToastService);
  private router = inject(Router);
  church = this.churchSettingsService.settings;

  reportTabs: ReportTab[] = [
    { id: 'people', label: this.reportText('Persoane', 'People'), icon: 'groups' },
    { id: 'groups', label: this.reportText('Grupuri', 'Groups'), icon: 'diversity_3' },
    { id: 'events', label: this.reportText('Evenimente', 'Events'), icon: 'event' },
    { id: 'attendance', label: this.reportText('Prezență', 'Attendance'), icon: 'fact_check' },
    { id: 'finance', label: this.reportText('Finanțe', 'Finance'), icon: 'payments' }
  ];
  activeReportTab = signal<ReportTabId>('people');
  peopleChartOptions: Array<{ value: PeopleChartMode; label: string }> = [
    { value: 'categories', label: this.reportText('Categorii persoane', 'People categories') },
    { value: 'activity', label: this.reportText('Membri activi', 'Active members') },
    { value: 'groups', label: this.reportText('Membri fără grup/activitate', 'Members without group/activity') },
    { value: 'contacts', label: this.reportText('Contacte incomplete', 'Incomplete contacts') }
  ];
  peopleChartMode: PeopleChartMode = 'categories';
  widowChartOptions: Array<{ value: WidowChartMode; label: string }> = [
    { value: 'share', label: this.reportText('Procent văduvi', 'Widowed member share') },
    { value: 'gender', label: this.reportText('Procent bărbați/femei', 'Men/women share') },
    { value: 'activity', label: this.reportText('Văduvi în activitate', 'Widowed members by activity') }
  ];
  widowChartMode: WidowChartMode = 'share';
  attendanceChartMode = signal<AttendanceChartMode>('church');

  persons = signal<Person[]>([]);
  families = signal<Family[]>([]);
  groups = signal<Group[]>([]);
  events = signal<EventItem[]>([]);
  attendance = signal<AttendanceSummary[]>([]);
  attendanceSheets = signal<AttendanceSheet[]>([]);
  finance = signal<FinanceOverview>({
    summary: { currentBalance: 0, totalIncome: 0, totalExpenses: 0, transactionCount: 0 },
    transactions: []
  });

  peopleByType = computed(() => this.countRows(this.persons(), (person) => memberTypePluralLabel(person.memberType), this.palette(),
    (label) => ({ route: '/persons', queryParams: { memberType: memberTypeByPluralLabel(label) } })));
  peopleByStatus = computed(() => this.statusRows(this.persons()));
  peopleByGroupAssignment = computed(() => this.groupAssignmentRows());
  peopleByContactCompleteness = computed(() => this.contactCompletenessRows());
  widowsByStatus = computed(() => this.widowRows());
  widowsFromMembers = computed(() => this.widowShareRows());
  activePeopleCount = computed(() => this.persons().filter((person) => this.isActivePerson(person)).length);
  activePeoplePercent = computed(() => this.persons().length > 0
    ? Math.round((this.activePeopleCount() / this.persons().length) * 100)
    : 0);
  peopleWithoutGroupCount = computed(() => this.peopleWithoutGroup().length);
  peopleWithoutGroupPercent = computed(() => this.persons().length > 0
    ? Math.round((this.peopleWithoutGroupCount() / this.persons().length) * 100)
    : 0);
  incompleteContactCount = computed(() => this.persons().filter((person) => !this.hasCompleteContact(person)).length);
  incompleteContactPercent = computed(() => this.persons().length > 0
    ? Math.round((this.incompleteContactCount() / this.persons().length) * 100)
    : 0);
  memberPeopleCount = computed(() => this.memberPeople().length);
  widowPeopleCount = computed(() => this.widowPeople().length);
  widowMemberPercent = computed(() => this.memberPeopleCount() > 0
    ? Math.round((this.widowPeopleCount() / this.memberPeopleCount()) * 100)
    : 0);
  activeWidowPercent = computed(() => this.widowPeopleCount() > 0
    ? Math.round((this.widowPeople().filter((person) => this.isActivePerson(person)).length / this.widowPeopleCount()) * 100)
    : 0);
  catchUpInteractionCounts = computed(() => this.catchUpInteractionsByPerson());
  catchUpByPerson = computed(() => this.catchUpPersonRows());
  groupsByType = computed(() => this.countRows(this.groups(), (group) => groupTypePluralLabel(group.type), this.palette(),
    (label) => ({ route: '/groups', queryParams: { type: groupTypeByPluralLabel(label) } })));
  eventsByStatus = computed(() => this.eventStatusRows());
  eventsByType = computed(() => this.countRows(this.events(), (event) => eventTypeLabel(event.eventType), this.palette(),
    (label) => ({ route: '/events', queryParams: { type: eventTypeByLabel(label) } })).slice(0, 7));
  recentAttendance = computed(() => this.attendance().slice(0, 10).map((item) => {
    const percent = item.totalCount > 0 ? Math.round((item.presentCount / item.totalCount) * 100) : 0;
    return {
      label: `${formatShortDate(item.attendanceDate)} · ${sessionLabel(item.session)}`,
      value: percent,
      percent,
      tone: percent >= 75 ? CHART_COLORS.green : percent >= 50 ? CHART_COLORS.orange : CHART_COLORS.red,
      route: '/attendance',
      queryParams: { q: item.attendanceDate }
    };
  }));
  attendanceByPerson = computed(() => this.personAttendanceRows());
  attendanceRate = computed(() => {
    const totals = this.attendance().reduce((acc, item) => ({
      present: acc.present + item.presentCount,
      total: acc.total + item.totalCount
    }), { present: 0, total: 0 });
    return totals.total > 0 ? Math.round((totals.present / totals.total) * 100) : 0;
  });
  financeByMonth = computed(() => this.monthlyFinanceRows(this.finance().transactions));

  ngOnInit(): void {
    this.pageMenuActions.setActions([
      {
        id: 'export-reports-pdf',
        label: 'Export PDF',
        icon: 'picture_as_pdf',
        run: () => this.printReportsPdf()
      }
    ]);

    forkJoin({
      persons: this.personsService.list(),
      families: this.familiesService.list(),
      groups: this.groupsService.list(),
      events: this.eventsService.list(),
      attendance: this.attendanceService.sessions(),
      finance: this.financeService.overview()
    }).subscribe({
      next: ({ persons, families, groups, events, attendance, finance }) => {
        this.persons.set(persons);
        this.families.set(families);
        this.groups.set(groups);
        this.events.set(events);
        this.attendance.set(attendance);
        this.loadAttendanceSheets(attendance);
        this.finance.set(finance);
      },
      error: (error) => this.toast.error(apiErrorMessage(error, this.reportText('Nu s-au putut încărca graficele.', 'The charts could not be loaded.')))
    });
  }

  ngOnDestroy(): void {
    this.pageMenuActions.clear();
  }

  printReportsPdf(): void {
    window.setTimeout(() => window.print(), 0);
  }

  reportText(ro: string, en: string): string {
    return this.language.language() === 'en' ? en : ro;
  }

  currencyLocale(): string {
    return this.language.language() === 'en' ? 'en-US' : 'ro-RO';
  }

  generatedAtLabel(): string {
    return new Intl.DateTimeFormat(this.currencyLocale(), {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date());
  }

  churchSubtitle(): string {
    const church = this.church();
    return [church.name, church.denomination].filter((value) => this.hasText(value)).join(' · ');
  }

  churchInfoRows(): Array<{ label: string; value: string }> {
    const church = this.church();
    return [
      { label: this.reportText('Nume', 'Name'), value: church.name },
      { label: this.reportText('Cult', 'Denomination'), value: church.denomination },
      { label: this.reportText('Adresă', 'Address'), value: church.address }
    ].filter((row): row is { label: string; value: string } => this.hasText(row.value));
  }

  committeeRows(): Array<{ label: string; value: string }> {
    const church = this.church();
    return [
      { label: this.reportText('Pastor', 'Pastor'), value: church.pastorName },
      { label: this.reportText('Trezorier', 'Treasurer'), value: church.treasurerName },
      { label: this.reportText('Secretar', 'Secretary'), value: church.secretaryName },
      { label: this.reportText('Contact', 'Contact'), value: church.contactPerson }
    ].filter((row): row is { label: string; value: string } => this.hasText(row.value));
  }

  donutSegments(rows: ChartRow[]): DonutSegment[] {
    let offset = 0;
    return rows.map((row) => {
      const angle = ((offset + row.percent / 2) / 100) * Math.PI * 2 - Math.PI / 2;
      const labelRadius = 73;
      const labelX = 80 + Math.cos(angle) * labelRadius;
      const labelY = 80 + Math.sin(angle) * labelRadius;
      const labelAnchor: DonutSegment['labelAnchor'] =
        Math.cos(angle) > 0.2 ? 'start' : Math.cos(angle) < -0.2 ? 'end' : 'middle';
      const segment = {
        ...row,
        offset,
        labelAnchor,
        labelX,
        labelY
      };
      offset += row.percent;
      return segment;
    });
  }

  openChartRow(row: ChartRow): void {
    void this.router.navigate([row.route], { queryParams: row.queryParams || {} });
  }

  activeReportTabLabel(): string {
    return this.reportTabs.find((tab) => tab.id === this.activeReportTab())?.label || this.reportText('Grafice', 'Charts');
  }

  selectedPeopleRows(): ChartRow[] {
    if (this.peopleChartMode === 'activity') {
      return this.peopleByStatus();
    }
    if (this.peopleChartMode === 'groups') {
      return this.peopleByGroupAssignment();
    }
    if (this.peopleChartMode === 'contacts') {
      return this.peopleByContactCompleteness();
    }
    return this.peopleByType();
  }

  peopleChartSubtitle(): string {
    if (this.peopleChartMode === 'activity') {
      return this.reportText('Membri activi și inactivi', 'Active and inactive members');
    }
    if (this.peopleChartMode === 'groups') {
      return this.reportText('Membri alocați sau nealocați în grupuri', 'Members assigned or unassigned to groups');
    }
    if (this.peopleChartMode === 'contacts') {
      return this.reportText('Complet înseamnă nume, prenume, data nașterii și telefon', 'Complete means first name, last name, birth date and phone');
    }
    return this.reportText('Distribuția după tipul persoanei', 'Distribution by person type');
  }

  peopleChartTotalLabel(): string {
    if (this.peopleChartMode === 'activity') {
      return `${this.activePeopleCount()} ${this.reportText('activi', 'active')}`;
    }
    if (this.peopleChartMode === 'groups') {
      return `${this.peopleWithoutGroupCount()} ${this.reportText('fără grup', 'without a group')}`;
    }
    if (this.peopleChartMode === 'contacts') {
      return `${this.incompleteContactCount()} ${this.reportText('incomplete', 'incomplete')}`;
    }
    return `${this.persons().length} ${this.reportText('persoane', 'people')}`;
  }

  peopleChartCenterLabel(): string {
    if (this.peopleChartMode === 'activity') {
      return `${this.activePeoplePercent()}%`;
    }
    if (this.peopleChartMode === 'groups') {
      return `${this.peopleWithoutGroupPercent()}%`;
    }
    if (this.peopleChartMode === 'contacts') {
      return `${this.incompleteContactPercent()}%`;
    }
    return '100%';
  }

  selectedWidowRows(): ChartRow[] {
    if (this.widowChartMode === 'activity') {
      return this.widowsByStatus();
    }
    if (this.widowChartMode === 'share') {
      return this.widowsFromMembers();
    }
    return [];
  }

  widowChartSubtitle(): string {
    if (this.widowChartMode === 'activity') {
      return this.reportText('Văduvi activi și inactivi', 'Active and inactive widowed members');
    }
    if (this.widowChartMode === 'gender') {
      return this.reportText('Distribuție bărbați/femei', 'Men/women distribution');
    }
    return this.reportText('Procentul de văduvi din totalul membrilor', 'Widowed members as a share of all members');
  }

  widowChartTotalLabel(): string {
    if (this.widowChartMode === 'activity') {
      return `${this.widowPeopleCount()} ${this.reportText('văduvi', 'widowed members')}`;
    }
    if (this.widowChartMode === 'gender') {
      return this.reportText('în lucru', 'in progress');
    }
    return `${this.widowPeopleCount()} / ${this.memberPeopleCount()}`;
  }

  widowChartCenterLabel(): string {
    if (this.widowChartMode === 'activity') {
      return `${this.activeWidowPercent()}%`;
    }
    return `${this.widowMemberPercent()}%`;
  }

  selectedAttendanceRows(): ChartRow[] {
    return this.attendanceChartMode() === 'individual' ? this.attendanceByPerson() : this.recentAttendance();
  }

  attendanceChartTitle(): string {
    return this.attendanceChartMode() === 'individual'
      ? this.reportText('Prezență pe persoane', 'Attendance by person')
      : this.reportText('Prezență pe ultimele întâlniri', 'Attendance for recent meetings');
  }

  attendanceChartSubtitle(): string {
    return this.attendanceChartMode() === 'individual'
      ? this.reportText('Toate persoanele după procentul de prezență din totalul întâlnirilor', 'All people ranked by attendance percentage across meetings')
      : this.reportText('Prezența totală a bisericii pentru fiecare întâlnire', 'Overall church attendance for each meeting');
  }

  currentYear(): number {
    return new Date().getFullYear();
  }

  catchUpInteractionTotal(): number {
    return [...this.catchUpInteractionCounts().values()].reduce((sum, count) => sum + count, 0);
  }

  catchUpInteractionPercent(value: number): number {
    const max = this.catchUpMaxInteractionCount();
    return max > 0 ? Math.round((value / max) * 100) : 0;
  }

  catchUpMaxInteractionCount(): number {
    return Math.max(...[...this.catchUpInteractionCounts().values()], 0);
  }

  private loadAttendanceSheets(sessions: AttendanceSummary[]): void {
    if (sessions.length === 0) {
      this.attendanceSheets.set([]);
      return;
    }
    forkJoin(sessions.map((session) => this.attendanceService
      .sheet(session.attendanceDate, session.session)
      .pipe(catchError(() => of(null)))))
      .subscribe((sheets) => this.attendanceSheets.set(sheets.filter((sheet): sheet is AttendanceSheet => sheet !== null)));
  }

  private statusRows(people: Person[]): ChartRow[] {
    const active = people.filter((person) => this.isActivePerson(person)).length;
    const inactive = people.length - active;
    return this.fixedRows([
      { label: this.reportText('activi', 'active'), value: active, tone: CHART_COLORS.green, queryParams: { active: 'true' } },
      { label: this.reportText('inactivi', 'inactive'), value: inactive, tone: CHART_COLORS.orange, queryParams: { active: 'false' } }
    ], people.length);
  }

  private groupAssignmentRows(): ChartRow[] {
    const withoutGroup = this.peopleWithoutGroup().length;
    const withGroup = this.persons().length - withoutGroup;
    return this.fixedRows([
      { label: this.reportText('cu grup', 'with group'), value: withGroup, tone: CHART_COLORS.green, queryParams: { group: 'assigned' } },
      { label: this.reportText('fără grup', 'without group'), value: withoutGroup, tone: CHART_COLORS.orange, queryParams: { group: 'none' } }
    ], this.persons().length);
  }

  private contactCompletenessRows(): ChartRow[] {
    const complete = this.persons().filter((person) => this.hasCompleteContact(person)).length;
    const incomplete = this.persons().length - complete;
    return this.fixedRows([
      { label: 'complete', value: complete, tone: CHART_COLORS.green, queryParams: { contact: 'complete' } },
      { label: 'incomplete', value: incomplete, tone: CHART_COLORS.orange, queryParams: { contact: 'incomplete' } }
    ], this.persons().length);
  }

  private widowRows(): ChartRow[] {
    const widows = this.widowPeople();
    const active = widows.filter((person) => this.isActivePerson(person)).length;
    const inactive = widows.length - active;
    return this.fixedRows([
      { label: this.reportText('văduvi activi', 'active widowed members'), value: active, tone: CHART_COLORS.green, queryParams: { memberType: 'WIDOWED', active: 'true' } },
      { label: this.reportText('văduvi inactivi', 'inactive widowed members'), value: inactive, tone: CHART_COLORS.orange, queryParams: { memberType: 'WIDOWED', active: 'false' } }
    ], widows.length);
  }

  private widowShareRows(): ChartRow[] {
    const members = this.memberPeople();
    const widowPersonIds = new Set(this.widowPeople().map((person) => person.id));
    const widows = members.filter((person) => widowPersonIds.has(person.id)).length;
    const otherMembers = members.length - widows;
    return this.fixedRows([
      { label: this.reportText('văduvi', 'widowed members'), value: widows, tone: CHART_COLORS.purple, queryParams: { memberType: 'WIDOWED' } },
      { label: this.reportText('alți membri', 'other members'), value: otherMembers, tone: CHART_COLORS.blue, queryParams: { memberType: 'ALL_MEMBERS' } }
    ], members.length);
  }

  private eventStatusRows(): ChartRow[] {
    const statuses: EventStatus[] = ['PLANNED', 'ACTIVE', 'DONE', 'CANCELED'];
    const counts = new Map<EventStatus, number>();
    this.events().forEach((event) => counts.set(event.status, (counts.get(event.status) || 0) + 1));
    const total = this.events().length;
    return statuses
      .map((status) => ({
        label: eventStatusLabel(status),
        value: counts.get(status) || 0,
        percent: total > 0 ? Math.max(1, Math.round(((counts.get(status) || 0) / total) * 100)) : 0,
        tone: STATUS_COLORS[status],
        route: '/events',
        queryParams: { status }
      }))
      .filter((row) => row.value > 0);
  }

  private personAttendanceRows(): ChartRow[] {
    const totalMeetings = this.attendance().length;
    if (totalMeetings === 0) {
      return [];
    }
    const counts = new Map<number, { name: string; presentCount: number }>();
    this.attendanceSheets().forEach((sheet) => {
      sheet.rows.forEach((row) => {
        const current = counts.get(row.personId) || { name: row.fullName, presentCount: 0 };
        if (row.present) {
          current.presentCount += 1;
        }
        counts.set(row.personId, current);
      });
    });
    return [...counts.entries()]
      .map(([personId, row]) => ({
        label: row.name,
        value: row.presentCount,
        percent: Math.round((row.presentCount / totalMeetings) * 100),
        tone: row.presentCount / totalMeetings >= 0.75 ? CHART_COLORS.green : row.presentCount / totalMeetings >= 0.5 ? CHART_COLORS.orange : CHART_COLORS.red,
        route: '/persons',
        queryParams: { q: row.name }
      }))
      .sort((left, right) => right.percent - left.percent || right.value - left.value || left.label.localeCompare(right.label, 'ro'));
  }

  private catchUpInteractionsByPerson(): Map<number, number> {
    const counts = new Map<number, number>();
    const year = this.currentYear();
    this.events()
      .filter((event) => event.eventType === 'MEETING' && this.eventYear(event) === year)
      .forEach((event) => {
        this.contactedPersonIds(event).forEach((personId) => {
          counts.set(personId, (counts.get(personId) || 0) + 1);
        });
      });
    return counts;
  }

  private contactedPersonIds(event: EventItem): number[] {
    if (event.contactedPersonIds?.length) {
      return [...new Set(event.contactedPersonIds)];
    }
    return event.contactedPersonId ? [event.contactedPersonId] : [];
  }

  private catchUpPersonRows(): ChartRow[] {
    const counts = this.catchUpInteractionCounts();
    const max = Math.max(...[...counts.values()], 0);
    return this.persons()
      .map((person) => {
        const count = counts.get(person.id) || 0;
        return {
          label: this.personName(person),
          value: count,
          percent: max > 0 && count > 0 ? Math.max(3, Math.round((count / max) * 100)) : 0,
          tone: count > 0 ? CHART_COLORS.green : CHART_COLORS.gray,
          route: '/persons',
          queryParams: { q: this.personName(person) }
        };
      })
      .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label, 'ro'));
  }

  private eventYear(event: EventItem): number | null {
    const date = event.openDate || event.endDate;
    if (!date) {
      return null;
    }
    const year = Number(date.slice(0, 4));
    return Number.isFinite(year) ? year : null;
  }

  private fixedRows(
      rows: Array<{ label: string; value: number; tone: string; queryParams: Record<string, string> }>,
      total: number): ChartRow[] {
    return rows
      .filter((row) => row.value > 0)
      .map((row) => ({
        ...row,
        percent: total > 0 ? Math.max(1, Math.round((row.value / total) * 100)) : 0,
        route: '/persons'
      }));
  }

  private widowPeople(): Person[] {
    const widowPersonIds = new Set(this.families().flatMap((family) =>
      family.members
        .filter((member) => member.role === 'WIDOWED')
        .map((member) => member.personId)));
    return this.persons().filter((person) => widowPersonIds.has(person.id));
  }

  private memberPeople(): Person[] {
    const memberTypes: Person['memberType'][] = ['MEMBER', 'CHILD', 'ADHERENT', 'PASTOR', 'LEADER'];
    return this.persons().filter((person) => memberTypes.includes(person.memberType));
  }

  private peopleWithoutGroup(): Person[] {
    const groupedPersonIds = new Set(this.groups().flatMap((group) => group.memberIds));
    return this.persons().filter((person) => !groupedPersonIds.has(person.id));
  }

  private hasCompleteContact(person: Person): boolean {
    return this.hasText(person.firstName)
      && this.hasText(person.lastName)
      && this.hasText(person.birthDate)
      && this.hasText(person.phone);
  }

  private personName(person: Person): string {
    return [person.lastName, person.firstName].filter(Boolean).join(' ').trim() || person.fullName;
  }

  private hasText(value?: string | null): boolean {
    return value !== null && value !== undefined && value.trim().length > 0;
  }

  private isActivePerson(person: Person): boolean {
    return person.active === true;
  }

  private countRows<T>(
      items: T[],
      labelOf: (item: T) => string,
      palette: string[],
      linkOf: (label: string) => { route: string; queryParams?: Record<string, string> }): ChartRow[] {
    const counts = new Map<string, number>();
    items.forEach((item) => counts.set(labelOf(item), (counts.get(labelOf(item)) || 0) + 1));
    const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([label, value], index) => ({
        label,
        value,
        percent: total > 0 ? Math.max(1, Math.round((value / total) * 100)) : 0,
        tone: palette[index % palette.length],
        ...linkOf(label)
      }));
  }

  private monthlyFinanceRows(transactions: FinancialTransaction[]): Array<FinanceMonthRow & { incomePercent: number; expensePercent: number }> {
    const rows = new Map<string, FinanceMonthRow>();
    transactions.forEach((transaction) => {
      if (transaction.amount === null) {
        return;
      }
      const key = transaction.transactionDate.slice(0, 7);
      const row = rows.get(key) || {
        label: monthLabel(key),
        monthKey: key,
        value: 0,
        percent: 0,
        tone: CHART_COLORS.blue,
        route: '/finance',
        queryParams: { month: key },
        income: 0,
        expenses: 0,
        balance: 0
      };
      if (transaction.type === 'INCOME') {
        row.income += transaction.amount;
      } else {
        row.expenses += transaction.amount;
      }
      row.balance = row.income - row.expenses;
      row.value = Math.abs(row.balance);
      rows.set(key, row);
    });
    const max = Math.max(...[...rows.values()].flatMap((row) => [row.income, row.expenses]), 0);
    return [...rows.entries()]
      .sort((left, right) => right[0].localeCompare(left[0]))
      .slice(0, 8)
      .map(([, row]) => ({
        ...row,
        incomePercent: max > 0 ? Math.max(3, Math.round((row.income / max) * 100)) : 0,
        expensePercent: max > 0 ? Math.max(3, Math.round((row.expenses / max) * 100)) : 0
      }));
  }

  private palette(): string[] {
    return CATEGORICAL_PALETTE;
  }
}

function sessionLabel(session: string): string {
  const english = document.documentElement.lang === 'en';
  if (session === 'MORNING') {
    return english ? 'morning' : 'dimineața';
  }
  if (session === 'EVENING') {
    return english ? 'evening' : 'seara';
  }
  return english ? 'default' : 'implicit';
}

function formatShortDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const locale = document.documentElement.lang === 'en' ? 'en-US' : 'ro-RO';
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(new Date(year, month - 1, day));
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  const locale = document.documentElement.lang === 'en' ? 'en-US' : 'ro-RO';
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

function groupTypePluralLabel(type: GroupType): string {
  const english = document.documentElement.lang === 'en';
  const labels: Record<GroupType, string> = {
    SMALL_GROUP: english ? 'small groups' : 'grupuri mici',
    MINISTRY: english ? 'ministries' : 'lucrări',
    TEAM: english ? 'teams' : 'echipe',
    CLASS: english ? 'classes' : 'clase',
    OTHER: english ? 'other types' : 'alte tipuri'
  };
  return labels[type] || groupTypeLabel(type);
}

function groupTypeByPluralLabel(label: string): GroupType {
  const values: GroupType[] = ['SMALL_GROUP', 'MINISTRY', 'TEAM', 'CLASS', 'OTHER'];
  return values.find((value) => groupTypePluralLabel(value) === label) || 'OTHER';
}

function memberTypePluralLabel(type: Person['memberType']): string {
  const english = document.documentElement.lang === 'en';
  const labels: Record<Person['memberType'], string> = {
    MEMBER: english ? 'Members' : 'Membri',
    CHILD: english ? 'Children' : 'Copii',
    ADHERENT: english ? 'Adherents' : 'Apartenenți',
    OCCASIONAL_VISITOR: english ? 'Occasional visitors' : 'Vizitatori ocazionali',
    VISITOR: english ? 'Visitors' : 'Vizitatori',
    PASTOR: english ? 'Pastors' : 'Pastori',
    LEADER: english ? 'Leaders' : 'Lideri'
  };
  return labels[type];
}

function memberTypeByPluralLabel(label: string): Person['memberType'] {
  const values: Person['memberType'][] = ['MEMBER', 'CHILD', 'ADHERENT', 'OCCASIONAL_VISITOR', 'VISITOR', 'PASTOR', 'LEADER'];
  return values.find((value) => memberTypePluralLabel(value) === label) || 'MEMBER';
}

function eventStatusByLabel(label: string): EventStatus {
  const values: EventStatus[] = ['PLANNED', 'ACTIVE', 'DONE', 'CANCELED'];
  return values.find((value) => eventStatusLabel(value) === label) || 'PLANNED';
}

function eventTypeByLabel(label: string): EventType {
  const values: EventType[] = ['OTHER', 'SERVICE', 'MEETING', 'EVENT', 'STUDY', 'ACT_DE_CULT', 'EVANGELISM', 'FELLOWSHIP', 'FUNERAL', 'IT', 'MUSIC', 'ADMINISTRATION', 'MAINTENANCE', 'SOCIAL_MEDIA_PUBLISHING', 'RENOVATION'];
  return values.find((value) => eventTypeLabel(value) === label) || 'OTHER';
}
