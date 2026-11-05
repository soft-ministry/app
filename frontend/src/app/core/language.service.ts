import { Injectable, signal } from '@angular/core';

export type AppLanguage = 'ro' | 'en';

const LANGUAGE_STORAGE_KEY = 'modern-ministry.language';

const translations: Record<AppLanguage, Record<string, string>> = {
  ro: {
    'language.label': 'Limbă',
    'language.ro': 'Română',
    'language.en': 'Engleză',
    'nav.main': 'Navigare principală',
    'nav.dashboard': 'Dashboard',
    'nav.calendar': 'Calendar',
    'nav.tables': 'Tabele',
    'nav.pastoral': 'Pastoral',
    'nav.activeChurch': 'Biserica activă',
    'nav.account': 'Cont',
    'nav.users': 'Utilizatori',
    'nav.settings': 'Setări',
    'nav.database': 'Bază de date',
    'nav.version': 'Versiune',
    'nav.logout': 'Ieșire',
    'table.persons': 'Persoane',
    'table.events': 'Evenimente',
    'table.groups': 'Grupuri',
    'table.attendance': 'Prezență',
    'table.reports': 'Rapoarte',
    'table.finance': 'Finanțe',
    'table.social-support': 'Sprijin social',
    'table.families': 'Familii',
    'table.family-report': 'Raport familii',
    'login.title': 'Autentificare',
    'login.subtitle': 'Conectează-te cu contul de lucru pentru a continua.',
    'login.username': 'Username',
    'login.password': 'Parolă',
    'login.hidePassword': 'Ascunde parola',
    'login.showPassword': 'Arată parola',
    'login.submitting': 'Se conectează...',
    'login.submit': 'Intră în aplicație',
    'login.error': 'Nu s-a putut face autentificarea. Verifică dacă serverul API rulează și dacă datele sunt corecte.',
    'common.search': 'Caută',
    'common.add': 'Adaugă',
    'common.edit': 'Editează',
    'common.delete': 'Șterge',
    'common.save': 'Salvează',
    'common.cancel': 'Anulează',
    'common.close': 'Închide',
    'common.all': 'Toate',
    'common.name': 'Nume',
    'common.type': 'Tip',
    'common.status': 'Status',
    'common.date': 'Dată',
    'common.period': 'Perioadă',
    'common.responsible': 'Responsabil',
    'common.priority': 'Prioritate',
    'common.description': 'Descriere',
    'common.amount': 'Sumă',
    'common.actions': 'Acțiuni',
    'common.noResults': 'Nu există rezultate pentru filtrul curent.',
    'common.noData': 'Nu există date.',
    'common.export': 'Export',
    'common.download': 'Descarcă',
    'common.view': 'Vezi',
    'common.inProgress': 'In progress',
    'finance.currentBalance': 'Sold curent',
    'finance.income': 'Venituri',
    'finance.expenses': 'Cheltuieli',
    'finance.transactions': 'Tranzacții',
    'finance.balance': 'Balanță',
    'finance.privateAmount': 'privat',
    'finance.noDescription': 'Fără descriere',
    'finance.noTransactions': 'Nu există tranzacții salvate momentan.',
    'finance.amountPrivate': 'Sumă privată',
    'finance.transaction': 'tranzacția',
    'finance.newTransaction': 'Tranzacție nouă',
    'common.moreEvents': 'evenimente',
    'calendar.previousMonth': 'Luna anterioară',
    'calendar.nextMonth': 'Luna următoare',
    'calendar.today': 'Azi',
    'calendar.selectedDay': 'Evenimente zi selectată',
    'calendar.noSelectedDayEvents': 'Nu sunt evenimente pentru ziua selectată.',
    'calendar.birthday': 'Zi de naștere',
    'notifications.birthdays': 'Notificări zile de naștere',
    'notifications.close': 'Închide notificarea',
    'page.dashboard': 'Dashboard',
    'page.persons': 'Persoane',
    'page.groups': 'Grupuri',
    'page.events': 'Evenimente',
    'page.calendar': 'Calendar',
    'page.attendance': 'Prezență',
    'page.finance': 'Finanțe',
    'page.reports': 'Grafice',
    'page.social': 'Sprijin social',
    'page.families': 'Familii',
    'page.family-report': 'Raport familii',
    'page.users': 'Utilizatori',
    'page.settings': 'Setări',
    'page.database': 'Bază de date',
    'page.login': 'Autentificare'
  },
  en: {
    'language.label': 'Language',
    'language.ro': 'Romanian',
    'language.en': 'English',
    'nav.main': 'Main navigation',
    'nav.dashboard': 'Dashboard',
    'nav.calendar': 'Calendar',
    'nav.tables': 'Tables',
    'nav.pastoral': 'Pastoral',
    'nav.activeChurch': 'Active church',
    'nav.account': 'Account',
    'nav.users': 'Users',
    'nav.settings': 'Settings',
    'nav.database': 'Database',
    'nav.version': 'Version',
    'nav.logout': 'Sign out',
    'table.persons': 'People',
    'table.events': 'Events',
    'table.groups': 'Groups',
    'table.attendance': 'Attendance',
    'table.reports': 'Reports',
    'table.finance': 'Finance',
    'table.social-support': 'Social support',
    'table.families': 'Families',
    'table.family-report': 'Family report',
    'login.title': 'Sign in',
    'login.subtitle': 'Sign in with your work account to continue.',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.hidePassword': 'Hide password',
    'login.showPassword': 'Show password',
    'login.submitting': 'Signing in...',
    'login.submit': 'Sign in',
    'login.error': 'Sign in failed. Check that the API server is running and that the credentials are correct.',
    'common.search': 'Search',
    'common.add': 'Add',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.all': 'All',
    'common.name': 'Name',
    'common.type': 'Type',
    'common.status': 'Status',
    'common.date': 'Date',
    'common.period': 'Period',
    'common.responsible': 'Responsible',
    'common.priority': 'Priority',
    'common.description': 'Description',
    'common.amount': 'Amount',
    'common.actions': 'Actions',
    'common.noResults': 'There are no results for the current filter.',
    'common.noData': 'There is no data.',
    'common.export': 'Export',
    'common.download': 'Download',
    'common.view': 'View',
    'common.inProgress': 'In progress',
    'finance.currentBalance': 'Current balance',
    'finance.income': 'Income',
    'finance.expenses': 'Expenses',
    'finance.transactions': 'Transactions',
    'finance.balance': 'Balance',
    'finance.privateAmount': 'private',
    'finance.noDescription': 'No description',
    'finance.noTransactions': 'No transactions have been saved yet.',
    'finance.amountPrivate': 'Private amount',
    'finance.transaction': 'transaction',
    'finance.newTransaction': 'New transaction',
    'common.moreEvents': 'events',
    'calendar.previousMonth': 'Previous month',
    'calendar.nextMonth': 'Next month',
    'calendar.today': 'Today',
    'calendar.selectedDay': 'Selected day events',
    'calendar.noSelectedDayEvents': 'There are no events for the selected day.',
    'calendar.birthday': 'Birthday',
    'notifications.birthdays': 'Birthday notifications',
    'notifications.close': 'Close notification',
    'page.dashboard': 'Dashboard',
    'page.persons': 'People',
    'page.groups': 'Groups',
    'page.events': 'Events',
    'page.calendar': 'Calendar',
    'page.attendance': 'Attendance',
    'page.finance': 'Finance',
    'page.reports': 'Reports',
    'page.social': 'Social support',
    'page.families': 'Families',
    'page.family-report': 'Family report',
    'page.users': 'Users',
    'page.settings': 'Settings',
    'page.database': 'Database',
    'page.login': 'Sign in'
  }
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly language = signal<AppLanguage>(this.loadLanguage());

  constructor() {
    this.applyDocumentLanguage(this.language());
  }

  t(key: string): string {
    return translations[this.language()][key] || translations.ro[key] || key;
  }

  setLanguage(value: AppLanguage | string): void {
    const next: AppLanguage = value === 'en' ? 'en' : 'ro';
    if (next === this.language()) {
      return;
    }
    this.language.set(next);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    this.applyDocumentLanguage(next);
    window.location.reload();
  }

  tableLabel(id: string, fallback: string): string {
    return this.t(`table.${id}`) === `table.${id}` ? fallback : this.t(`table.${id}`);
  }

  private loadLanguage(): AppLanguage {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'ro';
  }

  private applyDocumentLanguage(language: AppLanguage): void {
    document.documentElement.lang = language;
  }
}
