import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, map, of, switchMap, tap } from 'rxjs';

import { environment } from './environment';
import { AppearanceThemeService } from './theme/appearance-theme.service';
import { ChurchSettingsService } from './church-settings.service';
import { TablePreferencesService } from '../shared/table-preferences.service';

interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  username: string;
  roles: string[];
}

interface SessionUser {
  username: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'modern_ministry_token';
  private readonly userStorageKey = 'modern_ministry_user';

  constructor(
    private http: HttpClient,
    private router: Router,
    private themeService: AppearanceThemeService,
    private churchSettingsService: ChurchSettingsService,
    private tablePreferencesService: TablePreferencesService) {}

  login(username: string, password: string) {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { username, password })
      .pipe(tap((response) => {
        localStorage.setItem(this.storageKey, response.accessToken);
        localStorage.setItem(this.userStorageKey, JSON.stringify({
          username: response.username,
          roles: response.roles
        }));
      }),
      switchMap((response) => this.themeService.load().pipe(
        switchMap(() => this.churchSettingsService.load()),
        switchMap(() => this.tablePreferencesService.load()),
        map(() => response),
        catchError(() => of(response))
      )));
  }

  token(): string | null {
    return localStorage.getItem(this.storageKey);
  }

  isAuthenticated(): boolean {
    const token = this.token();
    if (!token) {
      return false;
    }
    if (this.isTokenExpired(token)) {
      this.clearSession();
      return false;
    }
    return true;
  }

  user(): SessionUser | null {
    const tokenUser = this.userFromToken();
    if (tokenUser) {
      localStorage.setItem(this.userStorageKey, JSON.stringify(tokenUser));
      return tokenUser;
    }
    const value = localStorage.getItem(this.userStorageKey);
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as SessionUser;
    } catch {
      localStorage.removeItem(this.userStorageKey);
      return null;
    }
  }

  hasRole(role: string): boolean {
    return this.user()?.roles.includes(role) ?? false;
  }

  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  logout(): void {
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  expireSession(): void {
    this.clearSession();
    if (!this.router.url.startsWith('/login')) {
      void this.router.navigate(['/login']);
    }
  }

  private clearSession(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.userStorageKey);
  }

  private userFromToken(): SessionUser | null {
    const token = this.token();
    if (!token) {
      return null;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || '')) as { sub?: string; roles?: string[] };
      return {
        username: payload.sub || '',
        roles: Array.isArray(payload.roles) ? payload.roles : []
      };
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || '')) as { exp?: number };
      if (typeof payload.exp !== 'number') {
        return false;
      }
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }
}
