import { Injectable, computed, inject, signal, effect, isSignal } from '@angular/core';

import { PageCode } from '../models/rbac.model';
import { AuthService } from './auth.service';
import {  RbacPageDto } from '../models/backend-api.model';
import {
  asPageCode,
  GROUP_ICON_MAP,
  ICON_MAP,
  PAGE_ROUTE_MAP,
  resolveIcon,
} from './rbac.mapper';
import { RbacService } from './rbac.service';

export interface MenuItem {
  label: string;
  icon?: string;
  route?: string;
  children?: MenuItem[];
  badge?: string;
  page?: PageCode;
}

interface Grouped {
  group: string;
  icon: string;
  order: number;
  items: (RbacPageDto & { code: PageCode; route: string; resolvedIcon: string })[];
}

@Injectable({ providedIn: 'root' })
export class MenuService {

  private readonly auth = inject(AuthService);
  private readonly rbac = inject(RbacService);
  private readonly _rawBackend = computed(() => this.rbac.myPages());

  private readonly _tree = computed<MenuItem[]>(() => {
    const pages = this._rawBackend();
    const grouped = this.groupByGroupName(pages);
    const flat = this.buildTree(grouped);
    const allowed = this.auth.authorizedPages();
    return this.filterRecursive(flat, allowed);
  });

  readonly items = computed<MenuItem[]>(() => this._tree());

  constructor() {
   
  }

  getAllItems(): MenuItem[] { return this._tree(); }


  private groupByGroupName(pages: RbacPageDto[]): Grouped[] {
    const map = new Map<string, Grouped>();
    const notAuthOnly = pages.filter(p => (p.groupName ?? '') !== 'auth');
    for (const dto of notAuthOnly) {
      const code = asPageCode(dto.pageCode);
      const route = PAGE_ROUTE_MAP[code] ?? '/404';
      const resolvedIcon = resolveIcon(dto.icon);
      const g = dto.groupName ?? 'Autres';
      const existing = map.get(g);
      const child = { ...dto, code, route, resolvedIcon };
      if (existing) {
        existing.items.push(child);
        existing.order = Math.min(existing.order, dto.displayOrder);
      } else {
        map.set(g, {
          group: g,
          icon: GROUP_ICON_MAP[g] ?? resolvedIcon,
          order: dto.displayOrder,
          items: [child],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }

  private buildTree(groups: Grouped[]): MenuItem[] {
    const out: MenuItem[] = [];
    for (const g of groups) {
      const sorted = [...g.items].sort((a, b) => a.displayOrder - b.displayOrder);
      const children: MenuItem[] = sorted.map(p => ({
        label: p.label,
        icon: p.resolvedIcon,
        route: p.route,
        page: p.code,
      }));

      if (children.length === 0) continue;
      if (children.length === 1) {
        const only = children[0];
        out.push({
          label: only.label,
          icon: g.icon,
          route: only.route,
          page: only.page,
        });
      } else {
        // Groupe avec plusieurs enfants — afficher le groupe + enfants.
        // Sauf pour "general" qui contient dashboard — si 1 enfant c'est déjà pris en compte ci-dessus.
        out.push({
          label: this.friendlyGroupName(g.group, children.map(c => c.label)[0]),
          icon: g.icon,
          children,
        });
      }
    }
    return out;
  }

  private friendlyGroupName(raw: string, fallbackFirstChildLabel: string): string {
    switch (raw) {
      case 'general': return 'Général';
      case 'administration': return 'Administration';
      case 'assurance.vie': return 'Assurance Vie';
      case 'assurance': return 'Assurances';
      case 'bureau-ordre': return "Bureau d'ordre";
      case 'reassurance': return 'Réassurance';
      case 'sinistres': return 'Sinistres';
      case 'partenaires': return 'Partenaires';
      case 'reporting': return 'Reporting';
      case 'documents': return 'Documents';
      default: return fallbackFirstChildLabel;
    }
  }

  private filterRecursive(nodes: readonly MenuItem[], allowed: Set<string>): MenuItem[] {
    const result: MenuItem[] = [];
    for (const n of nodes) {
      if (!n.children || n.children.length === 0) {
        const canShow = !n.page || allowed.has(n.page);
        if (canShow) result.push(n);
        continue;
      }
      const filteredChildren = this.filterRecursive(n.children, allowed);
      if (filteredChildren.length > 0) {
        result.push({ ...n, children: filteredChildren });
      }
    }
    return result;
  }
}
