import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import {
  ADMIN_USER,
  AGENT_USER,
  UNAUTHORIZED,
  sessionFor,
} from './core/auth/testing/auth-fixtures';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';
import { AppTitleStrategy } from './core/services/app-title-strategy';
import { User } from './shared/models/user';

describe('App routing', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        { provide: TitleStrategy, useClass: AppTitleStrategy },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  const currentUrl = () => TestBed.inject(Router).url;
  const root = () => harness.routeNativeElement as HTMLElement;
  const heading = () => root().querySelector('h1')?.textContent?.trim();
  const navLinks = () =>
    Array.from(root().querySelectorAll('nav a')).map((link) => link.getAttribute('href'));

  /** Navigates while answering the initial session-restore request. */
  async function navigateAs(user: User | null, url: string): Promise<void> {
    const navigation = harness.navigateByUrl(url);
    const restore = await vi.waitFor(() => http.expectOne('/api/auth/me'));
    if (user) {
      restore.flush(sessionFor(user));
    } else {
      restore.flush(null, UNAUTHORIZED);
    }
    await navigation;
  }

  describe('unauthenticated users', () => {
    it('are redirected to login with the intended destination', async () => {
      await navigateAs(null, '/policies');

      expect(currentUrl()).toBe('/login?returnUrl=%2Fpolicies');
      expect(heading()).toBe('Sign in');
      expect(TestBed.inject(Title).getTitle()).toBe('Sign in | Insurance Portal');
    });

    it('cannot reach the admin-only Users page', async () => {
      await navigateAs(null, '/users');

      expect(currentUrl()).toBe('/login?returnUrl=%2Fusers');
    });
  });

  describe('as an admin', () => {
    it('restores the session and lands on the dashboard', async () => {
      await navigateAs(ADMIN_USER, '/');

      expect(currentUrl()).toBe('/dashboard');
      expect(heading()).toBe('Dashboard');
      expect(TestBed.inject(Title).getTitle()).toBe('Dashboard | Insurance Portal');
    });

    it('sees every navigation item', async () => {
      await navigateAs(ADMIN_USER, '/dashboard');

      expect(navLinks()).toEqual(['/dashboard', '/policies', '/claims', '/users']);
    });

    it('can open Users Management', async () => {
      await navigateAs(ADMIN_USER, '/users');
      http.expectOne('/api/users').flush({ data: [ADMIN_USER] });

      expect(currentUrl()).toBe('/users');
      expect(heading()).toBe('Users');
    });

    it.each([
      ['/policies', 'Policies'],
      ['/claims', 'Claims'],
    ])('lazy-loads %s', async (url, expectedHeading) => {
      await navigateAs(ADMIN_USER, url);
      if (url === '/policies') {
        http.expectOne('/api/users').flush({ data: [ADMIN_USER] });
        http
          .expectOne((request) => request.url === '/api/policies')
          .flush({ items: [], total: 0, page: 1, pageSize: 10 });
      }

      expect(heading()).toBe(expectedHeading);
    });

    it('is redirected away from login', async () => {
      await navigateAs(ADMIN_USER, '/login');

      expect(currentUrl()).toBe('/dashboard');
    });

    it('renders the not found page for unknown URLs', async () => {
      await navigateAs(ADMIN_USER, '/does-not-exist');

      expect(heading()).toBe('Page not found');
    });
  });

  describe('as an agent', () => {
    it('does not see the Users navigation item', async () => {
      await navigateAs(AGENT_USER, '/dashboard');

      expect(navLinks()).toEqual(['/dashboard', '/policies', '/claims']);
    });

    it('is shown Access Denied when entering the Users URL directly', async () => {
      await navigateAs(AGENT_USER, '/users');

      expect(currentUrl()).toBe('/access-denied');
      expect(heading()).toBe('Access denied');
      expect(root().textContent).toContain('Agent');
      // The Users page never loaded, so it never called the admin-only endpoint.
      http.expectNone('/api/users');
    });

    it('keeps access to the sections the role allows', async () => {
      await navigateAs(AGENT_USER, '/claims');

      expect(heading()).toBe('Claims');
    });
  });
});
