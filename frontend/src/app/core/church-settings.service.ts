import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';

import { environment } from './environment';
import { LanguageService } from './language.service';
import { ChurchSettings, ChurchSettingsRequest } from './church-settings.model';

@Injectable({ providedIn: 'root' })
export class ChurchSettingsService {
  private readonly defaultSettings: ChurchSettings = {
    id: 1,
    name: 'Biserica Betania',
    avatarUrl: null,
    pastorName: null,
    denomination: null,
    address: null,
    treasurerName: null,
    secretaryName: null,
    contactPerson: null,
    attendanceEnabled: true,
    churches: []
  };
  readonly settings = signal<ChurchSettings>(this.defaultSettings);

  constructor(private http: HttpClient, private language: LanguageService) {}

  load(): Observable<ChurchSettings> {
    return this.http.get<ChurchSettings>(`${environment.apiUrl}/settings/church`).pipe(
      tap((settings) => this.apply(settings)),
      catchError(() => of(this.settings()))
    );
  }

  save(settings: ChurchSettings): Observable<ChurchSettings> {
    return this.http.put<ChurchSettings>(`${environment.apiUrl}/settings/church`, {
      name: settings.name,
      pastorName: settings.pastorName,
      denomination: settings.denomination,
      address: settings.address,
      treasurerName: settings.treasurerName,
      secretaryName: settings.secretaryName,
      contactPerson: settings.contactPerson,
      attendanceEnabled: settings.attendanceEnabled
    }).pipe(
      tap((saved) => this.apply(saved))
    );
  }

  create(request: ChurchSettingsRequest): Observable<ChurchSettings> {
    return this.http.post<ChurchSettings>(`${environment.apiUrl}/settings/church/churches`, request).pipe(
      tap((saved) => this.apply(saved))
    );
  }

  select(id: number): Observable<ChurchSettings> {
    return this.http.post<ChurchSettings>(`${environment.apiUrl}/settings/church/churches/${id}/select`, {}).pipe(
      tap((saved) => this.apply(saved))
    );
  }

  delete(id: number): Observable<ChurchSettings> {
    return this.http.delete<ChurchSettings>(`${environment.apiUrl}/settings/church/churches/${id}`).pipe(
      tap((saved) => this.apply(saved))
    );
  }

  uploadAvatar(file: File): Observable<ChurchSettings> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ChurchSettings>(`${environment.apiUrl}/settings/church/avatar`, formData).pipe(
      tap((saved) => this.apply(saved))
    );
  }

  deleteAvatar(): Observable<ChurchSettings> {
    return this.http.delete<ChurchSettings>(`${environment.apiUrl}/settings/church/avatar`).pipe(
      tap((saved) => this.apply(saved))
    );
  }

  avatarContentUrl(settings = this.settings()): string | null {
    if (!settings.avatarUrl) {
      return null;
    }
    return `${environment.apiUrl.replace(/\/api$/, '')}${settings.avatarUrl}`;
  }

  apply(settings: ChurchSettings): void {
    const next = { ...this.defaultSettings, ...settings, name: settings.name?.trim() || this.defaultSettings.name };
    this.settings.set(next);
    this.applyFavicon(next);
    this.applyBrowserTitle();
  }

  applyBrowserTitle(pageTitle = document.title): void {
    const page = this.localizedPageTitle(pageTitle);
    document.title = `${this.settings().name} · ${page || 'Modern Ministry'}`;
  }

  private localizedPageTitle(fallbackTitle: string): string {
    const routeLabels: Record<string, string> = {
      '/dashboard': 'page.dashboard',
      '/persons': 'page.persons',
      '/groups': 'page.groups',
      '/events': 'page.events',
      '/calendar': 'page.calendar',
      '/attendance': 'page.attendance',
      '/finance': 'page.finance',
      '/reports': 'page.reports',
      '/social-support': 'page.social',
      '/families': 'page.families',
      '/families/report': 'page.family-report',
      '/settings': 'page.settings',
      '/settings/database': 'page.database',
      '/users': 'page.users',
      '/login': 'page.login'
    };
    const key = routeLabels[window.location.pathname];
    if (key) {
      return this.language.t(key);
    }
    return fallbackTitle.includes('·') ? fallbackTitle.split('·').pop()?.trim() || fallbackTitle : fallbackTitle;
  }

  private applyFavicon(settings: ChurchSettings): void {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      return;
    }
    link.href = this.avatarContentUrl(settings) || 'assets/church-tab.svg';
  }
}
