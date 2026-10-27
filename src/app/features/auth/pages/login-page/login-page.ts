import { Component, DestroyRef, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthStore } from '../../../../core/auth/auth-store';
import { safeReturnUrl } from '../../../../core/auth/return-url';
import { APP_NAME } from '../../../../core/services/app-title-strategy';

interface DemoAccount {
  readonly label: string;
  readonly email: string;
  readonly password: string;
}

/** Fictional, publicly documented demo accounts. The API validates them; nothing here grants access. */
const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { label: 'Administrator', email: 'admin@demo.com', password: 'Admin123!' },
  { label: 'Agent', email: 'agent@demo.com', password: 'Agent123!' },
];

@Component({
  selector: 'app-login-page',
  imports: [
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatError,
    MatSuffix,
    MatInput,
    MatButton,
    MatIconButton,
    MatIcon,
    MatProgressSpinner,
  ],
  styleUrl: './login-page.scss',
  templateUrl: './login-page.html',
})
export default class LoginPage {
  /** Bound from the `?returnUrl=` query parameter. */
  readonly returnUrl = input<string>();
  /** Bound from the `?reason=` query parameter, e.g. `expired`. */
  readonly reason = input<string>();

  protected readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly appName = APP_NAME;
  protected readonly demoAccounts = DEMO_ACCOUNTS;
  protected readonly passwordVisible = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  private readonly emailInput = viewChild.required<ElementRef<HTMLInputElement>>('emailInput');
  private readonly passwordInput =
    viewChild.required<ElementRef<HTMLInputElement>>('passwordInput');

  constructor() {
    this.authStore.clearLoginError();
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected useDemoAccount(account: DemoAccount): void {
    this.form.setValue({ email: account.email, password: account.password });
    this.authStore.clearLoginError();
  }

  protected submit(): void {
    if (this.authStore.loginPending()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalidField();
      return;
    }

    this.authStore
      .login(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((success) => {
        if (success) {
          void this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
        }
      });
  }

  private focusFirstInvalidField(): void {
    const target = this.form.controls.email.invalid ? this.emailInput() : this.passwordInput();
    target.nativeElement.focus();
  }
}
