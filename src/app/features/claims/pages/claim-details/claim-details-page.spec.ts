import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthStore } from '../../../../core/auth/auth-store';
import { ClaimDetailsPage } from './claim-details-page';
import { CLAIM, HISTORY, NOTE } from '../../testing/claim-fixtures';
describe('ClaimDetailsPage permissions', () => {
  let http: HttpTestingController;
  async function setup(role: 'ADMIN' | 'AGENT') {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'claims/:id', component: ClaimDetailsPage }]),
        { provide: AuthStore, useValue: { role: () => role } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/claims/${CLAIM.id}`);
    http.expectOne('/api/claims/c-1001').flush(CLAIM);
    http.expectOne('/api/claims/c-1001/history').flush({ items: [HISTORY] });
    if (role === 'ADMIN') http.expectOne('/api/claims/c-1001/notes').flush({ items: [NOTE] });
    harness.detectChanges();
    return harness;
  }
  afterEach(() => http.verify());
  it('hides internal notes and review controls from Agents', async () => {
    const harness = await setup('AGENT');
    expect(harness.routeNativeElement?.textContent).toContain(CLAIM.description);
    expect(harness.routeNativeElement?.textContent).not.toContain(NOTE.content);
    expect(harness.routeNativeElement?.textContent).not.toContain('Start review');
    expect(harness.routeNativeElement?.querySelector('app-claim-review-notes')).toBeNull();
    http.expectNone('/api/claims/c-1001/notes');
  });
  it('shows internal notes and allowed review actions for Admin', async () => {
    const harness = await setup('ADMIN');
    expect(harness.routeNativeElement?.textContent).toContain(NOTE.content);
    expect(harness.routeNativeElement?.textContent).toContain('Start review');
    expect(harness.routeNativeElement?.textContent).not.toContain('Approve claim');
    expect(harness.routeNativeElement?.querySelector('app-claim-history')?.textContent).toContain(
      'Claim submitted.',
    );
  });
});
