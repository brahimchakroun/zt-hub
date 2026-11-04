import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MenuService, MenuItem } from '../../core/services/menu.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { RbacService } from '../../core/services/rbac.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    ButtonModule, MenuModule, AvatarModule, BadgeModule, TooltipModule, RippleModule
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayoutComponent {
  private auth = inject(AuthService);
  private menuService = inject(MenuService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private rbac = inject(RbacService);


  readonly user = this.auth.currentUser;
  readonly myMenus = this.rbac.myMenus;
  readonly menuItems = this.menuService.items;
  sidebarCollapsed = signal(false);
  
  mobileMenuOpen = signal(false);
  expandedSections = signal<Set<string>>(new Set(['Dashboard']));
  isMobile = signal(window.innerWidth <= 768);

  showMenuText(): boolean {
    return !this.sidebarCollapsed() || this.mobileMenuOpen();
  }

  navigateMenu(): void {
  if (window.innerWidth <= 768) {
    this.mobileMenuOpen.set(false);
  }
}
  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);

      if (window.innerWidth <= 768) {
        this.mobileMenuOpen.update(v => !v);
      } else {
        this.sidebarCollapsed.update(v => !v);
      }
  }

  toggleSection(label: string): void {
    this.expandedSections.update(set => {
      const next = new Set(set);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }




  @HostListener('window:resize')
  onResize(): void {

    const mobile = window.innerWidth <= 768;

    if (mobile !== this.isMobile()) {

      this.isMobile.set(mobile);

      if (!mobile) {
        this.mobileMenuOpen.set(false);
        this.sidebarCollapsed.set(false);
      }
    }
  }
  isExpanded(label: string): boolean {
    return this.expandedSections().has(label);
  }

logout(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  goToProfile(): void {
    this.router.navigate(['/auth/profile']);
  }
}
