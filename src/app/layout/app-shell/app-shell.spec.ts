import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthStore } from '../../core/auth/auth-store';
import { ADMIN_USER, AGENT_USER } from '../../core/auth/testing/auth-fixtures';
import { User } from '../../shared/models/user';
import { AppShell } from './app-shell';

describe('AppShell', () => {
  let fixture: ComponentFixture<AppShell>;
  let element: HTMLElement;
  const user = signal<User | null>(ADMIN_USER);
  const authStore: Pick<AuthStore, 'user' | 'hasAnyRole' | 'logout'> = {
    user,
    hasAnyRole: (roles) => {
      const current = user();
      return current !== null && roles.includes(current.role);
    },
    logout: vi.fn(() => of(undefined)),
  };

  beforeEach(async () => {
    user.set(ADMIN_USER);
    TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [provideRouter([]), { provide: AuthStore, useValue: authStore }],
    });

    fixture = TestBed.createComponent(AppShell);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  const navLabels = () =>
    Array.from(element.querySelectorAll('nav a [matListItemTitle]')).map((title) =>
      title.textContent?.trim(),
    );

  it('renders the header, navigation, and main landmark', () => {
    expect(element.querySelector('app-header')).not.toBeNull();
    expect(element.querySelector('nav[aria-label="Main navigation"]')).not.toBeNull();
    expect(element.querySelector('main')).not.toBeNull();
  });

  it('shows the signed-in user in the header', () => {
    expect(element.querySelector('app-header')?.textContent).toContain('Avery Admin');
  });

  it('shows admin-only navigation to admins and hides it from agents', async () => {
    expect(navLabels()).toContain('Users');

    user.set(AGENT_USER);
    await fixture.whenStable();

    expect(navLabels()).toEqual(['Dashboard', 'Policies', 'Claims']);
  });

  it('signs out through the header account menu', async () => {
    element.querySelector<HTMLButtonElement>('.header__account')!.click();
    await fixture.whenStable();

    const signOut = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[mat-menu-item]'),
    ).find((item) => item.textContent?.includes('Sign out'));
    signOut!.click();

    expect(authStore.logout).toHaveBeenCalled();
  });

  it('toggles the navigation from the header menu button', async () => {
    const menuButton = element.querySelector<HTMLButtonElement>('app-header button')!;
    expect(menuButton.getAttribute('aria-expanded')).toBe('true');

    menuButton.click();
    await fixture.whenStable();

    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('moves focus to the main content from the skip link', () => {
    element.querySelector<HTMLButtonElement>('.skip-link')!.click();

    expect(document.activeElement).toBe(element.querySelector('main'));
  });
});
