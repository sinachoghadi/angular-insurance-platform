import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { RouterOutlet } from '@angular/router';
import { APP_NAME } from '../../core/services/app-title-strategy';
import { Viewport } from '../../core/services/viewport';
import { Header } from '../header/header';
import { NAV_ITEMS } from '../navigation';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-shell',
  imports: [MatSidenavContainer, MatSidenav, MatSidenavContent, RouterOutlet, Header, Sidebar],
  styleUrl: './app-shell.scss',
  templateUrl: './app-shell.html',
})
export class AppShell {
  protected readonly appName = APP_NAME;
  protected readonly navItems = NAV_ITEMS;
  protected readonly navigationId = 'app-navigation';

  protected readonly isCompact = inject(Viewport).isCompact;

  // Desktop and compact layouts keep independent open state, so resizing the
  // window never leaves a mobile overlay open or a collapsed desktop sidebar.
  private readonly desktopOpen = signal(true);
  private readonly compactOpen = signal(false);

  protected readonly sidenavMode = computed(() => (this.isCompact() ? 'over' : 'side'));
  protected readonly sidenavOpen = computed(() =>
    this.isCompact() ? this.compactOpen() : this.desktopOpen(),
  );

  private readonly mainContent = viewChild.required<ElementRef<HTMLElement>>('mainContent');

  protected toggleSidenav(): void {
    this.activeOpenState().update((open) => !open);
  }

  /** Keeps state in sync when the drawer closes itself (backdrop click, Escape key). */
  protected onSidenavClosed(): void {
    this.activeOpenState().set(false);
  }

  protected onNavigated(): void {
    if (this.isCompact()) {
      this.compactOpen.set(false);
    }
  }

  protected skipToContent(): void {
    this.mainContent().nativeElement.focus();
  }

  private activeOpenState() {
    return this.isCompact() ? this.compactOpen : this.desktopOpen;
  }
}
