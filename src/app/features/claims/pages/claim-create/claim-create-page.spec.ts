import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClaimCreatePage } from './claim-create-page';
import { ACTIVE_POLICY, CLAIM } from '../../testing/claim-fixtures';
describe('ClaimCreatePage', () => {
  let fixture: ComponentFixture<ClaimCreatePage>, http: HttpTestingController;
  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(ClaimCreatePage);
    const req = http.expectOne((r) => r.url === '/api/policies');
    expect(req.request.params.get('status')).toBe('ACTIVE');
    req.flush({ items: [ACTIVE_POLICY], total: 1, page: 1, pageSize: 10 });
    await fixture.whenStable();
  });
  afterEach(() => http.verify());
  it('validates rendered fields and submits a valid claim once', async () => {
    const root = fixture.nativeElement as HTMLElement,
      form = root.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('eligible policy');
    http.expectNone('/api/claims');
    const store = fixture.componentInstance.store;
    store.select(ACTIVE_POLICY.id);
    store.form.patchValue({
      incidentDate: '2025-02-01',
      description: 'Fictional accident description.',
      estimatedAmount: 1000,
    });
    await fixture.whenStable();
    expect(root.textContent).toContain(ACTIVE_POLICY.customerName);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const request = http.expectOne('/api/claims');
    expect(request.request.body.policyId).toBe(ACTIVE_POLICY.id);
    request.flush(CLAIM);
    await fixture.whenStable();
    expect(root.textContent).toContain('submitted successfully');
  });
});
