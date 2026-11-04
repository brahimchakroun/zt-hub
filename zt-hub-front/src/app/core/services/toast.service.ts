import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  severity: 'success' | 'info' | 'warn' | 'error';
  summary: string;
  detail?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  show(severity: Toast['severity'], summary: string, detail?: string): void {
    const toast: Toast = { id: this.nextId++, severity, summary, detail };
    this.toasts.update(list => [...list, toast]);
    setTimeout(() => this.remove(toast.id), 4000);
  }

  success(summary: string, detail?: string): void {
    this.show('success', summary, detail);
  }

  error(summary: string, detail?: string): void {
    this.show('error', summary, detail);
  }

  info(summary: string, detail?: string): void {
    this.show('info', summary, detail);
  }

  warn(summary: string, detail?: string): void {
    this.show('warn', summary, detail);
  }

  remove(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}
