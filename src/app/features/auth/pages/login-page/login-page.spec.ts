import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthStore } from '../../../../core/auth/auth-store';
import { ADMIN_USER, UNAUTHORIZED, sessionFor } from '../../../../core/auth/testing/auth-fixtures';
import LoginPage from './login-page';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let element: HTMLElement;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(LoginPage);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  const emailInput = () => element.querySelector<HTMLInputElement>('input[type="email"]')!;
  const passwordInput = () =>
    element.querySelector<HTMLInputElement>('input[formcontrolname="password"]')!;
  const submitButton = () => element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const errors = () =>
    Array.from(element.querySelectorAll('mat-error')).map((node) => node.textContent?.trim());

  function type(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  }

  async function submit(email: string, password: string): Promise<void> {
    type(emailInput(), email);
    type(passwordInput(), password);
    submitButton().click();
    await fixture.whenStable();
  }

  describe('validation', () => {
    it('requires email and password and focuses the first invalid field', async () => {
      submitButton().click();
      await fixture.whenStable();

      expect(errors()).toEqual(['Email is required.', 'Password is required.']);
      expect(document.activeElement).toBe(emailInput());
      http.expectNone('/api/auth/login');
    });

    it('validates the email format', async () => {
      await submit('not-an-email', 'secret');

      expect(errors()).toEqual(['Enter a valid email address.']);
      http.expectNone('/api/auth/login');
    });
  });

  it('toggles password visibility with an accessible button', async () => {
    const toggle = element.querySelector<HTMLButtonElement>('button[aria-label="Show password"]')!;
    expect(passwordInput().type).toBe('password');

    toggle.click();
    await fixture.whenStable();

    expect(passwordInput().type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('signs in, shows a loading state, and returns to the requested page', async () => {
    fixture.componentRef.setInput('returnUrl', '/claims');
    await submit('admin@demo.com', 'Admin123!');

    const request = http.expectOne({ method: 'POST', url: '/api/auth/login' });
    expect(request.request.body).toEqual({ email: 'admin@demo.com', password: 'Admin123!' });
    expect(submitButton().textContent).toContain('Signing in');
    expect(submitButton().getAttribute('aria-disabled')).toBe('true');

    request.flush(sessionFor(ADMIN_USER));
    await fixture.whenStable();

    expect(TestBed.inject(AuthStore).user()).toEqual(ADMIN_USER);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/claims');
  });

  it('ignores unsafe return URLs', async () => {
    fixture.componentRef.setInput('returnUrl', 'https://evil.example');
    await submit('admin@demo.com', 'Admin123!');
    http.expectOne('/api/auth/login').flush(sessionFor(ADMIN_USER));
    await fixture.whenStable();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('shows an alert for invalid credentials and stays on the page', async () => {
    await submit('admin@demo.com', 'wrong-password');
    http.expectOne('/api/auth/login').flush({ message: 'Invalid' }, UNAUTHORIZED);
    await fixture.whenStable();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Invalid email or password.',
    );
    expect(submitButton().textContent).toContain('Sign in');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('explains why the user was signed out after session expiry', async () => {
    fixture.componentRef.setInput('reason', 'expired');
    await fixture.whenStable();

    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Your session has expired',
    );
  });

  it('fills in a demo account without submitting', async () => {
    element
      .querySelector<HTMLButtonElement>('[aria-label="Fill in the Agent demo account"]')!
      .click();
    await fixture.whenStable();

    expect(emailInput().value).toBe('agent@demo.com');
    http.expectNone('/api/auth/login');
  });
});
