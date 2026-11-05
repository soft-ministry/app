import { Injectable, TemplateRef, signal } from '@angular/core';

export interface PageMenuAction {
  id: string;
  label: string;
  icon: string;
  run: () => void;
}

@Injectable({ providedIn: 'root' })
export class PageMenuActionsService {
  actions = signal<PageMenuAction[]>([]);
  template = signal<TemplateRef<unknown> | null>(null);

  setActions(actions: PageMenuAction[]): void {
    this.actions.set(actions);
  }

  setTemplate(template: TemplateRef<unknown> | null): void {
    this.template.set(template);
  }

  clear(): void {
    this.actions.set([]);
    this.template.set(null);
  }
}
