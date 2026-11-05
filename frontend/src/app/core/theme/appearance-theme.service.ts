import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';

import { environment } from '../environment';
import { AppearanceTheme, DEFAULT_APPEARANCE_THEME } from './appearance-theme.model';

@Injectable({ providedIn: 'root' })
export class AppearanceThemeService {
  private readonly storageKey = 'modern-ministry.appearance';
  private readonly fontFamilies: Record<string, string> = {
    system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    inter: 'Inter, system-ui, -apple-system, sans-serif',
    roboto: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    segoe: '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    arial: 'Arial, Helvetica, sans-serif',
    georgia: 'Georgia, "Times New Roman", serif',
    serif: '"Times New Roman", Times, serif',
    garamond: 'Garamond, Georgia, "Times New Roman", serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
  };
  private currentTheme: AppearanceTheme = DEFAULT_APPEARANCE_THEME;
  readonly theme = signal<AppearanceTheme>(DEFAULT_APPEARANCE_THEME);

  constructor(private http: HttpClient) {
    this.apply(this.readCachedTheme());
  }

  load(): Observable<AppearanceTheme> {
    return this.http.get<AppearanceTheme>(`${environment.apiUrl}/settings/appearance`).pipe(
      tap((theme) => this.apply(theme)),
      catchError(() => of(this.currentTheme))
    );
  }

  save(theme: AppearanceTheme): Observable<AppearanceTheme> {
    return this.http.put<AppearanceTheme>(`${environment.apiUrl}/settings/appearance`, theme).pipe(
      tap((savedTheme) => this.apply({ ...theme, ...savedTheme }))
    );
  }

  reset(): Observable<AppearanceTheme> {
    return this.http.delete<AppearanceTheme>(`${environment.apiUrl}/settings/appearance`).pipe(
      tap((theme) => this.apply(theme))
    );
  }

  preview(theme: AppearanceTheme): void {
    this.apply(theme, false);
  }

  current(): AppearanceTheme {
    return { ...this.currentTheme };
  }

  defaults(): AppearanceTheme {
    return { ...DEFAULT_APPEARANCE_THEME };
  }

  apply(theme: AppearanceTheme, persist = true): void {
    this.currentTheme = this.upgradeLegacyTableDefaults({ ...DEFAULT_APPEARANCE_THEME, ...theme });
    this.theme.set(this.current());
    const style = document.documentElement.style;
    style.setProperty('--app-bg-start', this.currentTheme.backgroundStart);
    style.setProperty('--app-bg-middle', this.currentTheme.backgroundMiddle);
    style.setProperty('--app-bg-end', this.currentTheme.backgroundEnd);
    style.setProperty('--app-bg', this.currentTheme.backgroundEnd);
    style.setProperty('--app-surface', this.currentTheme.surface);
    style.setProperty('--app-surface-muted', this.currentTheme.surfaceMuted);
    style.setProperty('--app-border', this.currentTheme.border);
    style.setProperty('--app-text', this.currentTheme.text);
    style.setProperty('--app-muted', this.currentTheme.muted);
    style.setProperty('--app-primary', this.currentTheme.primary);
    style.setProperty('--app-primary-strong', this.currentTheme.primaryStrong);
    style.setProperty('--app-primary-soft', this.currentTheme.primarySoft);
    style.setProperty('--app-accent', this.currentTheme.accent);
    style.setProperty('--app-info', this.currentTheme.info);
    style.setProperty('--app-danger', this.currentTheme.danger);
    style.setProperty('--app-toolbar-bg', this.currentTheme.toolbarBackground);
    style.setProperty('--app-table-header-start', this.currentTheme.tableHeaderStart);
    style.setProperty('--app-table-header-end', this.currentTheme.tableHeaderEnd);
    style.setProperty('--app-table-name-color', this.currentTheme.tableNameColor);
    style.setProperty('--app-table-body-color', this.currentTheme.tableBodyColor);
    style.setProperty('--app-table-name-font', this.fontFamily(this.currentTheme.tableNameFontFamily));
    style.setProperty('--app-table-body-font', this.fontFamily(this.currentTheme.tableBodyFontFamily));
    style.setProperty('--app-table-header-size', `${this.currentTheme.tableHeaderFontSize}px`);
    style.setProperty('--app-table-name-size', `${this.currentTheme.tableNameFontSize}px`);
    style.setProperty('--app-table-body-size', `${this.currentTheme.tableBodyFontSize}px`);
    style.setProperty('--app-calendar-event-color', this.currentTheme.calendarEventColor);
    style.setProperty('--app-calendar-event-font', this.fontFamily(this.currentTheme.calendarEventFontFamily));
    style.setProperty('--app-calendar-event-size', `${this.currentTheme.calendarEventFontSize}px`);
    style.setProperty('--app-calendar-event-weight', this.currentTheme.calendarEventBold === 'true' ? '600' : '400');
    style.setProperty('--app-calendar-event-style', this.currentTheme.calendarEventItalic === 'true' ? 'italic' : 'normal');
    style.setProperty('--app-event-status-planned', this.currentTheme.eventStatusPlannedColor);
    style.setProperty('--app-event-status-active', this.currentTheme.eventStatusActiveColor);
    style.setProperty('--app-event-status-done', this.currentTheme.eventStatusDoneColor);
    style.setProperty('--app-event-status-canceled', this.currentTheme.eventStatusCanceledColor);
    style.setProperty('--app-event-type-other', this.currentTheme.eventTypeOtherColor);
    style.setProperty('--app-event-type-service', this.currentTheme.eventTypeServiceColor);
    style.setProperty('--app-event-type-meeting', this.currentTheme.eventTypeMeetingColor);
    style.setProperty('--app-event-type-event', this.currentTheme.eventTypeEventColor);
    style.setProperty('--app-event-type-study', this.currentTheme.eventTypeStudyColor);
    style.setProperty('--app-event-type-act-de-cult', this.currentTheme.eventTypeActDeCultColor);
    style.setProperty('--app-event-type-evangelism', this.currentTheme.eventTypeEvangelismColor);
    style.setProperty('--app-event-type-fellowship', this.currentTheme.eventTypeFellowshipColor);
    style.setProperty('--app-event-type-funeral', this.currentTheme.eventTypeFuneralColor);
    style.setProperty('--app-event-type-it', this.currentTheme.eventTypeItColor);
    style.setProperty('--app-event-type-music', this.currentTheme.eventTypeMusicColor);
    style.setProperty('--app-event-type-administration', this.currentTheme.eventTypeAdministrationColor);
    style.setProperty('--app-event-type-maintenance', this.currentTheme.eventTypeMaintenanceColor);
    style.setProperty('--app-event-type-social-media-publishing', this.currentTheme.eventTypeSocialMediaPublishingColor);
    style.setProperty('--app-event-type-renovation', this.currentTheme.eventTypeRenovationColor);
    style.setProperty('--app-priority-low', this.currentTheme.priorityLowColor);
    style.setProperty('--app-priority-medium-low', this.currentTheme.priorityMediumLowColor);
    style.setProperty('--app-priority-medium', this.currentTheme.priorityMediumColor);
    style.setProperty('--app-priority-high-medium', this.currentTheme.priorityHighMediumColor);
    style.setProperty('--app-priority-high', this.currentTheme.priorityHighColor);
    const largeCalendar = this.currentTheme.calendarLayout !== 'default';
    style.setProperty('--app-calendar-page-width', largeCalendar ? 'min(1320px, 96%)' : 'min(1100px, 95%)');
    style.setProperty('--app-calendar-page-max-width', 'none');
    style.setProperty('--app-calendar-page-padding-x', '0px');
    style.setProperty('--app-calendar-page-tablet-padding-x', '0px');
    style.setProperty('--app-calendar-page-mobile-padding-x', '0px');
    style.setProperty('--app-calendar-header-actions-x', largeCalendar ? 'calc(-78px + 2.5rem)' : '0px');

    if (persist) {
      localStorage.setItem(this.storageKey, JSON.stringify(this.currentTheme));
    }
  }

  private readCachedTheme(): AppearanceTheme {
    const cached = localStorage.getItem(this.storageKey);
    if (!cached) {
      return DEFAULT_APPEARANCE_THEME;
    }

    try {
      return { ...DEFAULT_APPEARANCE_THEME, ...JSON.parse(cached) };
    } catch {
      return DEFAULT_APPEARANCE_THEME;
    }
  }

  private fontFamily(key: string): string {
    return this.fontFamilies[key] ?? this.fontFamilies['inter'];
  }

  private upgradeLegacyTableDefaults(theme: AppearanceTheme): AppearanceTheme {
    const hasLegacyTableDefaults =
      theme.tableNameColor === '#111111' &&
      theme.tableBodyColor === '#111111' &&
      theme.tableHeaderFontSize === '14' &&
      theme.tableNameFontSize === '14.5' &&
      theme.tableBodyFontSize === '14.5';

    if (!hasLegacyTableDefaults) {
      return theme;
    }

    return {
      ...theme,
      tableNameColor: DEFAULT_APPEARANCE_THEME.tableNameColor,
      tableBodyColor: DEFAULT_APPEARANCE_THEME.tableBodyColor,
      tableHeaderFontSize: DEFAULT_APPEARANCE_THEME.tableHeaderFontSize,
      tableNameFontSize: DEFAULT_APPEARANCE_THEME.tableNameFontSize,
      tableBodyFontSize: DEFAULT_APPEARANCE_THEME.tableBodyFontSize
    };
  }
}
