import { Component, input, output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatToolbar } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [MatToolbar, MatIconButton, MatIcon, RouterLink],
  styleUrl: './header.scss',
  templateUrl: './header.html',
})
export class Header {
  readonly appName = input.required<string>();
  /** Id of the navigation element the menu button controls. */
  readonly navigationId = input.required<string>();
  readonly navigationOpen = input(false);

  readonly menuToggle = output<void>();
}
