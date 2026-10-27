import { Component, input, output } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatListItem, MatListItemIcon, MatListItemTitle, MatNavList } from '@angular/material/list';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavItem } from '../../shared/models/nav-item';

@Component({
  selector: 'app-sidebar',
  imports: [
    MatNavList,
    MatListItem,
    MatListItemIcon,
    MatListItemTitle,
    MatIcon,
    RouterLink,
    RouterLinkActive,
  ],
  styleUrl: './sidebar.scss',
  templateUrl: './sidebar.html',
})
export class Sidebar {
  readonly items = input.required<readonly NavItem[]>();

  /** Emits after the user activates a navigation link. */
  readonly navigated = output<void>();
}
