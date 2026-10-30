import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ClaimsPage } from './claims-page';
import { CLAIM } from '../../testing/claim-fixtures';
describe('ClaimsPage', () => {
  let harness: RouterTestingHarness, http: HttpTestingController;
  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideLocationMocks(),
        provideRouter([{ path: 'claims', component: ClaimsPage }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    TestBed.inject(Router).setUpLocationChangeListener();
    await harness.navigateByUrl('/claims');
  });
  afterEach(() => http.verify());
  const req = () => http.expectOne((r) => r.url === '/api/claims');
  it('renders loading, a real table row and accessible detail links', () => {
    expect(harness.routeNativeElement?.textContent).toContain('Loading claims');
    req().flush({ items: [CLAIM], total: 1, page: 1, pageSize: 10 });
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('tbody')?.textContent).toContain(
      CLAIM.claimNumber,
    );
    expect(harness.routeNativeElement?.querySelector('tbody')?.textContent).toContain('$1,000.00');
    expect(
      harness.routeNativeElement?.querySelector(
        '[aria-label="View claim ' + CLAIM.claimNumber + '"]',
      ),
    ).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('a[href^="/claims/c-1001"]')).not.toBeNull();
  });
  it('shows a retryable error then an empty state', () => {
    req().flush({}, { status: 500, statusText: 'Error' });
    harness.detectChanges();
    const alert = harness.routeNativeElement?.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Unable');
    (alert?.querySelector('button') as HTMLButtonElement).click();
    req().flush({ items: [], total: 0, page: 1, pageSize: 10 });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('No claims found');
  });
  it('restores pagination/filters via browser Back and Forward', async () => {
    req().flush({ items: [], total: 0, page: 1, pageSize: 10 });
    await harness.navigateByUrl(
      '/claims?page=2&pageSize=25&status=APPROVED&sortBy=estimatedAmount&sortOrder=asc',
    );
    req().flush({ items: [CLAIM], total: 90, page: 2, pageSize: 25 });
    const location = TestBed.inject(Location);
    location.back();
    const back = await vi.waitFor(req);
    expect(back.request.params.get('page')).toBe('1');
    expect(back.request.params.get('status')).toBe('');
    back.flush({ items: [], total: 0, page: 1, pageSize: 10 });
    location.forward();
    const forward = await vi.waitFor(req);
    expect(forward.request.params.get('page')).toBe('2');
    expect(forward.request.params.get('status')).toBe('APPROVED');
    forward.flush({ items: [CLAIM], total: 90, page: 2, pageSize: 25 });
  });
});
