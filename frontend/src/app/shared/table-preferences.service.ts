import { HttpClient } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { environment } from '../core/environment';

export type TableGroup = 'management' | 'pastoral';

export interface TableNavigationItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  group: TableGroup;
  requiresAttendance?: boolean;
  disabled?: boolean;
}

export interface TableLayoutPreference {
  visibleTables: string[];
  tableOrder: string[];
  defaultPageSize: number;
}

@Injectable({ providedIn: 'root' })
export class TablePreferencesService {
  private readonly storageKey = 'modern-ministry.table.defaultPageSize';
  private readonly visibleTablesStorageKey = 'modern-ministry.table.visibleTables';
  private readonly tableOrderStorageKey = 'modern-ministry.table.order';
  private readonly defaultPageSize = 7;
  private readonly basePageSizeOptions = [7, 10, 15, 25, 50, 100];
  readonly availableTables: TableNavigationItem[] = [
    { id: 'persons', label: 'Persoane', icon: 'groups', route: '/persons', group: 'management' },
    { id: 'events', label: 'Evenimente', icon: 'event', route: '/events', group: 'management' },
    { id: 'groups', label: 'Grupuri', icon: 'diversity_3', route: '/groups', group: 'management' },
    { id: 'attendance', label: 'Prezență', icon: 'how_to_reg', route: '/attendance', group: 'management', requiresAttendance: true },
    { id: 'reports', label: 'Rapoarte', icon: 'assessment', route: '/reports', group: 'management' },
    { id: 'finance', label: 'Finanțe', icon: 'account_balance_wallet', route: '/finance', group: 'management' },
    { id: 'social-support', label: 'Sprijin social', icon: 'volunteer_activism', route: '/social-support', group: 'pastoral' },
    { id: 'families', label: 'Familii', icon: 'family_restroom', route: '/families', group: 'pastoral' },
    { id: 'family-report', label: 'Raport familii', icon: 'account_tree', route: '/families/report', group: 'pastoral' }
  ];
  readonly pageSize = signal(this.loadPageSize());
  readonly visibleTables = signal<string[]>(this.loadStoredTableIds(this.visibleTablesStorageKey, this.availableTables.map((item) => item.id)));
  readonly tableOrder = signal<string[]>(this.loadStoredTableIds(this.tableOrderStorageKey, this.availableTables.map((item) => item.id)));
  readonly pageSizeOptions = computed(() => {
    const options = new Set([...this.basePageSizeOptions, this.pageSize()]);
    return [...options].sort((left, right) => left - right);
  });
  readonly orderedTables = computed(() => {
    const visible = new Set(this.visibleTables());
    return this.orderedTableIds()
      .filter((id) => visible.has(id))
      .map((id) => this.availableTables.find((item) => item.id === id))
      .filter((item): item is TableNavigationItem => !!item);
  });

  constructor(private http: HttpClient) {}

  load(): Observable<TableLayoutPreference> {
    return this.http.get<TableLayoutPreference>(`${environment.apiUrl}/settings/table-preferences/layout`).pipe(
      map((preference) => this.normalizeLayout(preference)),
      tap((preference) => this.applyLayout(preference)),
      catchError(() => of(this.currentLayout()))
    );
  }

  saveLayout(visibleTables: string[], tableOrder: string[], defaultPageSize = this.pageSize()): Observable<TableLayoutPreference> {
    const preference = this.normalizeLayout({ visibleTables, tableOrder, defaultPageSize });
    this.applyLayout(preference);
    return this.http.put<TableLayoutPreference>(`${environment.apiUrl}/settings/table-preferences/layout`, preference).pipe(
      map((response) => this.normalizeLayout(response)),
      tap((response) => this.applyLayout(response))
    );
  }

  setPageSize(value: number): Observable<TableLayoutPreference> {
    return this.saveLayout(this.visibleTables(), this.tableOrder(), value);
  }

  tablesForGroup(group: TableGroup, attendanceEnabled = true): TableNavigationItem[] {
    return this.orderedTables()
      .filter((item) => item.group === group)
      .filter((item) => attendanceEnabled || !item.requiresAttendance);
  }

  private loadPageSize(): number {
    return this.normalize(Number(localStorage.getItem(this.storageKey) || this.defaultPageSize));
  }

  private normalize(value: number): number {
    if (!Number.isFinite(value)) {
      return this.defaultPageSize;
    }
    return Math.min(500, Math.max(1, Math.round(value)));
  }

  private currentLayout(): TableLayoutPreference {
    return {
      visibleTables: this.visibleTables(),
      tableOrder: this.tableOrder(),
      defaultPageSize: this.pageSize()
    };
  }

  private applyLayout(preference: TableLayoutPreference): void {
    this.visibleTables.set(preference.visibleTables);
    this.tableOrder.set(preference.tableOrder);
    this.pageSize.set(preference.defaultPageSize);
    localStorage.setItem(this.visibleTablesStorageKey, JSON.stringify(preference.visibleTables));
    localStorage.setItem(this.tableOrderStorageKey, JSON.stringify(preference.tableOrder));
    localStorage.setItem(this.storageKey, String(preference.defaultPageSize));
  }

  private normalizeLayout(preference: Partial<TableLayoutPreference>): TableLayoutPreference {
    const allowed = new Set(this.availableTables.map((item) => item.id));
    const visibleTables = this.uniqueTableIds(preference.visibleTables || [], allowed);
    const tableOrder = this.uniqueTableIds(preference.tableOrder || [], allowed);
    const completeOrder = [
      ...tableOrder,
      ...this.availableTables.map((item) => item.id).filter((id) => !tableOrder.includes(id))
    ];
    return {
      visibleTables: visibleTables.length > 0 ? visibleTables : this.availableTables.map((item) => item.id),
      tableOrder: completeOrder,
      defaultPageSize: this.normalize(Number(preference.defaultPageSize || this.loadPageSize()))
    };
  }

  private orderedTableIds(): string[] {
    const current = this.tableOrder();
    return [
      ...current,
      ...this.availableTables.map((item) => item.id).filter((id) => !current.includes(id))
    ];
  }

  private uniqueTableIds(values: string[], allowed: Set<string>): string[] {
    return [...new Set(values)].filter((value) => allowed.has(value));
  }

  private loadStoredTableIds(key: string, fallback: string[]): string[] {
    const allowed = new Set(this.availableTables.map((item) => item.id));
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) {
        const stored = this.uniqueTableIds(parsed, allowed);
        if (stored.length > 0) {
          return [
            ...stored,
            ...fallback.filter((id) => !stored.includes(id))
          ];
        }
      }
    } catch {
      localStorage.removeItem(key);
    }
    return fallback;
  }
}
