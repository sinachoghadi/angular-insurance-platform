import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthStore } from '../../../../core/auth/auth-store';
import { PolicyDetails } from './policy-details';
describe('PolicyDetails', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'policies/:id', component: PolicyDetails }]),
        { provide: AuthStore, useValue: { role: () => 'AGENT' } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => http.verify());
  it('loads details with a pending indicator and retains list state in back navigation', async () => {
    await harness.navigateByUrl('/policies/p-1001?page=2&status=ACTIVE');
    expect(harness.routeNativeElement?.textContent).toContain('Loading policy');
    http.expectOne('/api/policies/p-1001').flush({
      id: 'p-1001',
      policyNumber: 'INS-001',
      customerName: 'Demo Customer',
      customerNationalId: 'DEMO-001',
      insuranceType: 'Life',
      premium: 200,
      startDate: '2025-01-01',
      endDate: '2026-01-01',
      status: 'ACTIVE',
      agentId: 'u-1002',
      agentName: 'Jordan Agent',
      createdAt: '2025-01-01T09:00:00Z',
      updatedAt: '2025-01-01T12:00:00Z',
    });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Demo Customer');
    expect(harness.routeNativeElement?.querySelector('a')?.getAttribute('href')).toContain(
      'page=2',
    );
  });
  it.each([
    [403, 'permission'],
    [404, 'not found'],
    [500, 'Unable to load'],
  ])('renders HTTP %s clearly', async (status, message) => {
    await harness.navigateByUrl('/policies/p-1002');
    http
      .expectOne('/api/policies/p-1002')
      .flush({}, { status: Number(status), statusText: 'Error' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain(
      String(message),
    );
    expect(harness.routeNativeElement?.querySelector('button') !== null).toBe(status === 500);
  });
  it('handles invalid IDs locally and cancels an old detail request when the route changes', async () => {
    await harness.navigateByUrl('/policies/invalid');
    expect(harness.routeNativeElement?.textContent).toContain('not found');
    http.expectNone((r) => r.url.startsWith('/api/policies'));
    await harness.navigateByUrl('/policies/p-1001');
    const first = http.expectOne('/api/policies/p-1001');
    await harness.navigateByUrl('/policies/p-1002');
    expect(first.cancelled).toBe(true);
    http.expectOne('/api/policies/p-1002').flush({}, { status: 404, statusText: 'Missing' });
  });
});
