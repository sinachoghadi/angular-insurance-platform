import { Component, computed, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../../core/auth/auth-store';
import { ROLE_LABELS } from '../../../../shared/models/role';

@Component({
  selector: 'app-access-denied-page',
  imports: [MatButton, MatIcon, RouterLink],
  styleUrl: './access-denied-page.scss',
  templateUrl: './access-denied-page.html',
})
export default class AccessDeniedPage {
  private readonly role = inject(AuthStore).role;

  protected readonly roleLabel = computed(() => {
    const role = this.role();
    return role ? ROLE_LABELS[role] : null;
  });
}
