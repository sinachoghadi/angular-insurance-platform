import { Component, computed, input, output } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatToolbar } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';
import { ROLE_LABELS } from '../../shared/models/role';
import { User } from '../../shared/models/user';

@Component({
  selector: 'app-header',
  imports: [
    MatToolbar,
    MatButton,
    MatIconButton,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    RouterLink,
  ],
  styleUrl: './header.scss',
  templateUrl: './header.html',
})
export class Header {
  readonly appName = input.required<string>();
  /** Id of the navigation element the menu button controls. */
  readonly navigationId = input.required<string>();
  readonly navigationOpen = input(false);
  readonly user = input<User | null>(null);

  readonly menuToggle = output<void>();
  readonly logout = output<void>();

  protected readonly roleLabel = computed(() => {
    const user = this.user();
    return user ? ROLE_LABELS[user.role] : '';
  });

  protected readonly initials = computed(() =>
    (this.user()?.name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join(''),
  );
}
