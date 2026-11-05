import { Routes } from '@angular/router';

import { LoginComponent } from './core/login.component';
import { adminGuard, authGuard } from './core/auth.guard';
import { inProgressGuard } from './core/feature.guard';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { PersonsComponent } from './features/persons/persons.component';
import { GroupsComponent } from './features/groups/groups.component';
import { EventsComponent } from './features/events/events.component';
import { CalendarComponent } from './features/calendar/calendar.component';
import { AttendanceComponent } from './features/attendance/attendance.component';
import { FinanceComponent } from './features/finance/finance.component';
import { ReportsComponent } from './features/reports/reports.component';
import { FamiliesComponent } from './features/families/families.component';
import { FamilyReportComponent } from './features/families/family-report.component';
import { SocialSupportComponent } from './features/social-support/social-support.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, title: 'Biserică · Autentificare' },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard], title: 'Biserică · Dashboard' },
  { path: 'persons', component: PersonsComponent, canActivate: [authGuard], title: 'Biserică · Persoane' },
  { path: 'groups', component: GroupsComponent, canActivate: [authGuard], title: 'Biserică · Grupuri' },
  { path: 'events', component: EventsComponent, canActivate: [authGuard], title: 'Biserică · Evenimente' },
  { path: 'calendar', component: CalendarComponent, canActivate: [authGuard], title: 'Biserică · Calendar' },
  { path: 'attendance', component: AttendanceComponent, canActivate: [authGuard], title: 'Biserică · Prezență' },
  { path: 'finance', component: FinanceComponent, canActivate: [authGuard], title: 'Biserică · Finanțe' },
  { path: 'reports', component: ReportsComponent, canActivate: [authGuard], title: 'Biserică · Grafice' },
  { path: 'social-support', component: SocialSupportComponent, canActivate: [authGuard], title: 'Biserică · Sprijin social' },
  { path: 'families', component: FamiliesComponent, canActivate: [authGuard, inProgressGuard], title: 'Biserică · Familii' },
  { path: 'families/report', component: FamilyReportComponent, canActivate: [authGuard, inProgressGuard], title: 'Biserică · Raport familii' },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then((module) => module.SettingsComponent),
    canActivate: [adminGuard],
    title: 'Biserică · Setări'
  },
  {
    path: 'settings/database',
    loadComponent: () => import('./features/settings/database-export.component').then((module) => module.DatabaseExportComponent),
    canActivate: [adminGuard],
    title: 'Biserică · Bază de date'
  },
  {
    path: 'users',
    loadComponent: () => import('./features/users/users.component').then((module) => module.UsersComponent),
    canActivate: [adminGuard],
    title: 'Biserică · Utilizatori'
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];
