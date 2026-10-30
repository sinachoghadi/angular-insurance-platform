import { provideHttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthStore } from '../../../../core/auth/auth-store';
import { PoliciesPage } from './policies-page';
describe('PoliciesPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideLocationMocks(),
        provideRouter([{ path: 'policies', component: PoliciesPage }]),
        { provide: AuthStore, useValue: { role: () => 'AGENT' } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    TestBed.inject(Router).setUpLocationChangeListener();
    await harness.navigateByUrl('/policies');
  });
  afterEach(() => http.verify());
  it('shows loading then an empty state and hides the admin filter', () => {
    expect(harness.routeNativeElement?.textContent).toContain('Loading policies');
    http
      .expectOne((r) => r.url === '/api/policies')
      .flush({ items: [], total: 0, page: 1, pageSize: 10 });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('No policies found');
    expect(harness.routeNativeElement?.textContent).not.toContain('Assigned agent');
    http.expectNone('/api/users');
  });
  it('renders a recoverable error and retries on click', () => {
    http
      .expectOne((r) => r.url === '/api/policies')
      .flush({}, { status: 500, statusText: 'Error' });
    harness.detectChanges();
    const alert = harness.routeNativeElement?.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Unable to load policies');
    (alert?.querySelector('button') as HTMLButtonElement).click();
    http
      .expectOne((r) => r.url === '/api/policies')
      .flush({ items: [], total: 0, page: 1, pageSize: 10 });
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')).toBeNull();
  });
  it('restores URL filters and pagination through browser Back and Forward', async () => {
    http
      .expectOne((r) => r.url === '/api/policies')
      .flush({ items: [], total: 0, page: 1, pageSize: 10 });
    await harness.navigateByUrl(
      '/policies?page=2&pageSize=25&status=ACTIVE&sortBy=premium&sortOrder=asc',
    );
    const pageTwo = http.expectOne(
      (r) => r.url === '/api/policies' && r.params.get('page') === '2',
    );
    expect(pageTwo.request.params.get('sortBy')).toBe('premium');
    pageTwo.flush({ items: [], total: 60, page: 2, pageSize: 25 });
    const location = TestBed.inject(Location);
    location.back();
    const back = await vi.waitFor(() => http.expectOne((r) => r.url === '/api/policies'));
    expect(back.request.params.get('status')).toBe('');
    expect(back.request.params.get('page')).toBe('1');
    back.flush({ items: [], total: 0, page: 1, pageSize: 10 });
    location.forward();
    const forward = await vi.waitFor(() => http.expectOne((r) => r.url === '/api/policies'));
    expect(forward.request.params.get('status')).toBe('ACTIVE');
    expect(forward.request.params.get('page')).toBe('2');
    forward.flush({ items: [], total: 60, page: 2, pageSize: 25 });
    harness.detectChanges();
    expect(
      harness.routeNativeElement?.querySelector('mat-select[formControlName="status"]')
        ?.textContent,
    ).toContain('ACTIVE');
  });
});
