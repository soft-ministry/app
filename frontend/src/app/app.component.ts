import { Component, HostListener, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from './core/auth.service';
import { ChurchSettingsService } from './core/church-settings.service';
import { LanguageService } from './core/language.service';
import { AppearanceThemeService } from './core/theme/appearance-theme.service';
import { Person } from './features/persons/person.model';
import { PersonsService } from './features/persons/persons.service';
import { TablePreferencesService } from './shared/table-preferences.service';

interface BirthdayNotification {
  id: number;
  name: string;
  dateLabel: string;
  daysUntil: number;
  age: number | null;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  styles: [`
    .app-shell {
      min-height: 100vh;
    }

    .content {
      min-width: 0;
    }

    .login-only {
      display: block;
    }

    .birthday-notifications {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 3000;
      display: grid;
      width: min(360px, calc(100vw - 32px));
      gap: 10px;
      pointer-events: none;
    }

    .birthday-notification {
      display: grid;
      grid-template-columns: 36px minmax(0, 1fr) auto;
      gap: 10px;
      align-items: start;
      padding: 12px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface);
      color: var(--app-text);
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
      pointer-events: auto;
    }

    .birthday-icon {
      display: grid;
      width: 36px;
      aspect-ratio: 1;
      place-items: center;
      border-radius: 999px;
      background: var(--app-primary-soft);
      color: var(--app-primary-strong);
      font-size: 20px;
      font-weight: 800;
      line-height: 1;
    }

    .birthday-copy {
      display: grid;
      gap: 3px;
      min-width: 0;
    }

    .birthday-copy strong,
    .birthday-copy span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .birthday-copy strong {
      font-size: 14px;
      font-weight: 800;
    }

    .birthday-copy span {
      color: var(--app-muted);
      font-size: 13px;
      font-weight: 600;
    }

    .birthday-dismiss {
      display: grid;
      width: 28px;
      aspect-ratio: 1;
      place-items: center;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: var(--app-muted);
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
    }

    .birthday-dismiss:hover {
      background: var(--app-surface-muted);
      color: var(--app-text);
    }

  `],
  template: `
    @if (auth.isAuthenticated()) {
      <div class="app-shell">
        <section class="content">
          <router-outlet />
        </section>
        @if (birthdayNotifications().length > 0) {
          <aside class="birthday-notifications" [attr.aria-label]="language.t('notifications.birthdays')">
            @for (notification of birthdayNotifications(); track notification.id) {
              <section class="birthday-notification">
                <span class="birthday-icon" aria-hidden="true">ZN</span>
                <span class="birthday-copy">
                  <strong>{{ notification.name }}</strong>
                  <span>{{ birthdayNotificationText(notification) }}</span>
                </span>
                <button class="birthday-dismiss" type="button" [attr.aria-label]="language.t('notifications.close')" [title]="language.t('notifications.close')" (click)="dismissBirthdayNotification(notification.id)">x</button>
              </section>
            }
          </aside>
        }
      </div>
    } @else {
      <main class="login-only">
        <router-outlet />
      </main>
    }
  `
})
export class AppComponent implements OnInit {
  birthdayNotifications = signal<BirthdayNotification[]>([]);

  constructor(
    public auth: AuthService,
    private themeService: AppearanceThemeService,
    private churchSettingsService: ChurchSettingsService,
    private tablePreferencesService: TablePreferencesService,
    private personsService: PersonsService,
    public language: LanguageService,
    private router: Router) {}

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.themeService.load().subscribe(() => this.loadBirthdayNotifications());
      this.churchSettingsService.load().subscribe();
      this.tablePreferencesService.load().subscribe();
    }
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      setTimeout(() => this.churchSettingsService.applyBrowserTitle(), 0);
      const navigation = event as NavigationEnd;
      if (this.auth.isAuthenticated() && navigation.urlAfterRedirects.startsWith('/persons')) {
        this.loadBirthdayNotifications();
      }
    });
  }

  dismissBirthdayNotification(id: number): void {
    this.birthdayNotifications.update((notifications) => notifications.filter((item) => item.id !== id));
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    if (!this.auth.isAuthenticated() || !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) {
      return;
    }
    const routeByShortcut: Record<string, string> = {
      d: '/dashboard',
      e: '/events',
      f: '/finance',
      g: '/reports',
      p: '/persons'
    };
    const route = routeByShortcut[event.key.toLowerCase()];
    if (!route) {
      return;
    }
    event.preventDefault();
    void this.router.navigate([route]);
  }

  birthdayNotificationText(notification: BirthdayNotification): string {
    const agePart = notification.age == null ? '' : ` · ${notification.age} ani`;
    if (this.language.language() === 'en') {
      const englishAgePart = notification.age == null ? '' : ` · age ${notification.age}`;
      if (notification.daysUntil === 0) {
        return `${notification.dateLabel} · Today${englishAgePart}`;
      }
      if (notification.daysUntil === 1) {
        return `${notification.dateLabel} · Tomorrow${englishAgePart}`;
      }
      return `${notification.dateLabel} · in ${notification.daysUntil} days${englishAgePart}`;
    }
    if (notification.daysUntil === 0) {
      return `${notification.dateLabel} · Azi${agePart}`;
    }
    if (notification.daysUntil === 1) {
      return `${notification.dateLabel} · Mâine${agePart}`;
    }
    return `${notification.dateLabel} · peste ${notification.daysUntil} zile${agePart}`;
  }

  private loadBirthdayNotifications(): void {
    const theme = this.themeService.current();
    if (theme.birthdayNotificationsEnabled !== 'true') {
      this.birthdayNotifications.set([]);
      return;
    }
    const daysBefore = Math.max(0, Math.min(90, Number(theme.birthdayNotificationDaysBefore) || 0));
    this.personsService.list().subscribe({
      next: (people) => this.birthdayNotifications.set(upcomingBirthdays(people, daysBefore)),
      error: () => this.birthdayNotifications.set([])
    });
  }

}

function upcomingBirthdays(people: Person[], daysBefore: number): BirthdayNotification[] {
  const today = startOfDay(new Date());
  return people
    .map((person) => birthdayNotification(person, today))
    .filter((notification): notification is BirthdayNotification => notification != null)
    .filter((notification) => notification.daysUntil >= 0 && notification.daysUntil <= daysBefore)
    .sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name, 'ro'));
}

function birthdayNotification(person: Person, today: Date): BirthdayNotification | null {
  if (!person.birthDate) {
    return null;
  }
  const birthDate = parseDate(person.birthDate);
  if (!birthDate) {
    return null;
  }
  let nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (nextBirthday < today) {
    nextBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
  }
  const daysUntil = Math.round((nextBirthday.getTime() - today.getTime()) / 86400000);
  const age = nextBirthday.getFullYear() - birthDate.getFullYear();
  return {
    id: person.id,
    name: person.fullName,
    dateLabel: `${String(nextBirthday.getDate()).padStart(2, '0')}.${String(nextBirthday.getMonth() + 1).padStart(2, '0')}`,
    daysUntil,
    age
  };
}

function parseDate(value: string): Date | null {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
